// The terminal's state: the simulated market, the account (cash and the trades that make the positions), the order
// book and the fills. One reducer, so every screen reads the same numbers: the order a fill completes, the cash it
// moves and the position it changes all happen in one step. Money is bigint paisa throughout.
import { createContext, useContext, type Dispatch } from 'react';
import { estimateNepseTrade } from '@punji/ui/nepse-fees';
import { holdingsSummary, type HoldingsSummary, type PortfolioPosition } from '@punji/ui/portfolio';
import type { OrderTicketOrder } from '@punji/ui/order-ticket';
import type { TradeFill, TradingOrder } from '@punji/ui/order-list';
import { formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import { createMarket, hashString, indexOf, LOT, resumeMarket, scripBySymbol, seeded, shockMarket, stepMarket, timeAt, type IndexSnapshot, type LiveQuote, type MarketState } from '../shared/sim.ts';

export const npr = nepalMoneyConfig();
export const rs = (paisa: bigint) => formatMoney(paisa, npr);

/** A trade in the account: what positions and P&L are computed from. `fees` includes capital gains tax on a sell. */
export interface LedgerTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: bigint;
  price: bigint;
  fees: bigint;
  /** -1 for positions carried from earlier sessions. */
  tick: number;
}

export type Screen = 'watch' | 'symbol' | 'orders' | 'positions' | 'trades';

export interface TicketIntent {
  side: 'buy' | 'sell';
  price?: bigint;
  quantity?: bigint;
  /** Changes on each request, so the ticket starts over with these values. */
  nonce: number;
}

export interface TerminalState {
  market: MarketState;
  orders: TradingOrder[];
  fills: TradeFill[];
  ledger: LedgerTrade[];
  /** Cash and collateral after every fill, paisa. */
  cash: bigint;
  running: boolean;
  /** The quote feed failed (a demo of the error state). */
  feedDown: boolean;
  symbol: string;
  watchlist: string[];
  ticket: TicketIntent;
  /** Order ids already charged the DP fee today, by symbol (NEPSE charges it once per scrip per day on a sell). */
  dpCharged: string[];
  seq: number;
  /** The last thing the account did, announced politely. */
  notice: string;
}

/** Positions carried in from earlier sessions: bought before today, so a sale is a long-term holding for tax. */
const OPENING: readonly LedgerTrade[] = [
  { id: 'O-1', symbol: 'NABIL', side: 'buy', quantity: 200n, price: 48_000n, fees: 34_200n, tick: -1 },
  { id: 'O-2', symbol: 'UPPER', side: 'buy', quantity: 500n, price: 41_000n, fees: 73_000n, tick: -1 },
  { id: 'O-3', symbol: 'HRL', side: 'buy', quantity: 100n, price: 79_000n, fees: 28_400n, tick: -1 },
  { id: 'O-4', symbol: 'NIFRA', side: 'buy', quantity: 1_000n, price: 25_500n, fees: 90_800n, tick: -1 },
];

export const OPENING_CASH = 50_000_000n; // Rs 5,00,000.00

export function initialState(): TerminalState {
  return {
    market: createMarket(),
    orders: [],
    fills: [],
    ledger: [...OPENING],
    cash: OPENING_CASH,
    running: true,
    feedDown: false,
    symbol: 'NABIL',
    watchlist: ['NABIL', 'UPPER', 'HRL', 'NIFRA', 'NTC'],
    ticket: { side: 'buy', nonce: 0 },
    dpCharged: [],
    seq: 1,
    notice: '',
  };
}

/** Ticks in the demo's 15-minute circuit-breaker pause (5 simulated seconds a tick). */
export const HALT_TICKS = 180;

export type Action =
  | { type: 'tick' }
  | { type: 'place'; order: OrderTicketOrder }
  | { type: 'cancel'; id: string }
  | { type: 'select'; symbol: string }
  | { type: 'ticket'; side: 'buy' | 'sell'; symbol?: string; price?: bigint; quantity?: bigint }
  | { type: 'watch'; symbol: string }
  | { type: 'run'; running: boolean }
  | { type: 'feed'; down: boolean }
  | { type: 'shock' }
  | { type: 'resume' }
  | { type: 'dismiss-halt' };

const live = (o: TradingOrder) => o.status === 'pending' || o.status === 'open' || o.status === 'partially-filled';
const remaining = (o: TradingOrder) => o.quantity - (o.filledQuantity ?? 0n);

/** Positions from the ledger, one per symbol, trades in order. */
export function positionsOf(ledger: readonly LedgerTrade[]): PortfolioPosition[] {
  const by = new Map<string, PortfolioPosition & { trades: LedgerTrade[] }>();
  for (const t of ledger) {
    const scrip = scripBySymbol(t.symbol);
    const p = by.get(t.symbol) ?? { symbol: t.symbol, name: scrip?.name, sector: scrip?.sector, trades: [] };
    p.trades.push(t);
    by.set(t.symbol, p);
  }
  return [...by.values()];
}

export function heldQuantity(ledger: readonly LedgerTrade[], symbol: string): bigint {
  return ledger.filter((t) => t.symbol === symbol).reduce((q, t) => (t.side === 'buy' ? q + t.quantity : q - t.quantity), 0n);
}

/** Cash held back for live buy orders: what each would cost at its limit, fees included. */
export function reservedCash(orders: readonly TradingOrder[]): bigint {
  return orders.filter((o) => live(o) && o.side === 'buy').reduce((sum, o) => sum + estimateNepseTrade({ side: 'buy', quantity: remaining(o), price: o.price }).total, 0n);
}

function averageCost(ledger: readonly LedgerTrade[], symbol: string): bigint | null {
  const summary = holdingsSummary(positionsOf(ledger.filter((t) => t.symbol === symbol)), []);
  return summary.holdings[0]?.averageCost ?? null;
}

function place(state: TerminalState, order: OrderTicketOrder): TerminalState {
  const id = `N-${String(state.seq).padStart(4, '0')}`;
  const time = timeAt(state.market.tick);
  const base: TradingOrder = { id, symbol: order.symbol, side: order.side, quantity: order.quantity, price: order.price, status: 'pending', time, filledQuantity: 0n };
  let reason: string | null = null;
  if (state.market.halt?.kind === 'circuit-breaker') reason = 'Trading is halted by the circuit breaker.';
  else if (order.side === 'buy') {
    const available = state.cash - reservedCash(state.orders);
    if (order.estimate.total > available) reason = `Not enough collateral: this order needs ${rs(order.estimate.total)}; ${rs(available > 0n ? available : 0n)} is available.`;
  } else {
    const held = heldQuantity(state.ledger, order.symbol);
    const selling = state.orders.filter((o) => live(o) && o.side === 'sell' && o.symbol === order.symbol).reduce((q, o) => q + remaining(o), 0n);
    if (order.quantity > held - selling) reason = held === 0n ? `You hold no ${order.symbol}; short selling is not allowed.` : `You hold ${held} ${order.symbol}${selling ? `, ${selling} already in open sell orders` : ''}.`;
  }
  const placed: TradingOrder = reason ? { ...base, status: 'rejected', reason } : base;
  const verb = order.side === 'buy' ? 'Buy' : 'Sell';
  return {
    ...state,
    seq: state.seq + 1,
    orders: [placed, ...state.orders],
    notice: reason ? `${verb} ${order.quantity} ${order.symbol} rejected. ${reason}` : `${verb} ${order.quantity} ${order.symbol} at ${rs(order.price)} sent.`,
  };
}

/**
 * Match live orders against the new prices. A buy fills when the LTP is at or under its limit, a sell when at or
 * over; each fill takes some lots (a seeded draw), so a large order can fill in parts. A fill pays the price the
 * market traded at (never worse than the limit) and its exact NEPSE fees, moves the cash, and adds a ledger trade.
 */
function match(state: TerminalState, quotes: readonly LiveQuote[]): TerminalState {
  const tick = state.market.tick;
  let { cash, ledger, fills, dpCharged } = state;
  let filledSomething = '';
  const orders = state.orders.map((o) => {
    if (o.status === 'pending') return { ...o, status: 'open' as const };
    if (o.status !== 'open' && o.status !== 'partially-filled') return o;
    const q = quotes.find((x) => x.symbol === o.symbol);
    if (!q) return o;
    const crosses = o.side === 'buy' ? q.ltp <= o.price : q.ltp >= o.price;
    if (!crosses) return o;
    const left = remaining(o);
    const random = seeded(hashString(`${o.id}:${tick}`));
    const lots = left / LOT;
    const take = lots <= 1n ? left : LOT * (1n + BigInt(Math.floor(random() * Number(lots))));
    const quantity = take > left ? left : take;
    const price = q.ltp;
    const firstSell = o.side === 'sell' && !dpCharged.includes(`${o.symbol}`);
    let fees: bigint;
    let cashMove: bigint;
    if (o.side === 'buy') {
      const est = estimateNepseTrade({ side: 'buy', quantity, price });
      fees = est.fees;
      cashMove = -est.total;
    } else {
      const avg = averageCost(ledger, o.symbol) ?? price;
      const carried = ledger.some((t) => t.symbol === o.symbol && t.tick < 0);
      const est = estimateNepseTrade({ side: 'sell', quantity, price, dpScrips: firstSell ? 1 : 0, costBasis: avg * quantity, holdingDays: carried ? 400 : 0 });
      fees = est.fees + est.capitalGainsTax;
      cashMove = est.total;
      if (firstSell) dpCharged = [...dpCharged, o.symbol];
    }
    cash += cashMove;
    const fillId = `T-${String(fills.length + 1).padStart(5, '0')}`;
    ledger = [...ledger, { id: fillId, symbol: o.symbol, side: o.side, quantity, price, fees, tick }];
    fills = [{ id: fillId, symbol: o.symbol, side: o.side, quantity, price, time: timeAt(tick), counterpartyBroker: String(1 + (hashString(fillId) % 58)) }, ...fills];
    const filled = (o.filledQuantity ?? 0n) + quantity;
    const before = (o.averagePrice ?? 0n) * (o.filledQuantity ?? 0n);
    const averagePrice = (before + price * quantity) / filled;
    const done = filled === o.quantity;
    filledSomething = `${o.side === 'buy' ? 'Bought' : 'Sold'} ${quantity} ${o.symbol} at ${rs(price)}${done ? '' : `, ${o.quantity - filled} left`}.`;
    return { ...o, filledQuantity: filled, averagePrice, status: done ? ('filled' as const) : ('partially-filled' as const) };
  });
  return { ...state, orders, cash, ledger, fills, dpCharged, notice: filledSomething || state.notice };
}

export function reducer(state: TerminalState, action: Action): TerminalState {
  switch (action.type) {
    case 'tick': {
      if (!state.running || state.feedDown) return state;
      const market = stepMarket(state.market);
      return match({ ...state, market }, market.quotes);
    }
    case 'place':
      return place(state, action.order);
    case 'cancel':
      return {
        ...state,
        orders: state.orders.map((o) => (o.id === action.id && live(o) ? { ...o, status: 'cancelled', reason: 'Cancelled by you' } : o)),
        notice: `Order ${action.id} cancelled.`,
      };
    case 'select':
      return scripBySymbol(action.symbol) ? { ...state, symbol: action.symbol } : state;
    case 'ticket':
      return { ...state, symbol: action.symbol ?? state.symbol, ticket: { side: action.side, price: action.price, quantity: action.quantity, nonce: state.ticket.nonce + 1 } };
    case 'watch':
      return { ...state, watchlist: state.watchlist.includes(action.symbol) ? state.watchlist.filter((s) => s !== action.symbol) : [...state.watchlist, action.symbol] };
    case 'run':
      return { ...state, running: action.running };
    case 'feed':
      return { ...state, feedDown: action.down };
    case 'shock':
      return state.market.halt?.kind === 'circuit-breaker' ? state : { ...state, market: shockMarket(state.market, HALT_TICKS) };
    case 'resume':
      return { ...state, market: resumeMarket(state.market) };
    case 'dismiss-halt':
      return state.market.halt?.kind === 'resumed' ? { ...state, market: { ...state.market, halt: null } } : state;
    default:
      return state;
  }
}

export interface Derived {
  quotes: LiveQuote[];
  index: IndexSnapshot;
  summary: HoldingsSummary;
  reserved: bigint;
  available: bigint;
  /** Cash plus the market value of the holdings. */
  accountValue: bigint;
  openOrders: number;
  halted: boolean;
}

export function derive(state: TerminalState): Derived {
  const quotes = state.market.quotes;
  const summary = holdingsSummary(positionsOf(state.ledger), quotes);
  const reserved = reservedCash(state.orders);
  return {
    quotes,
    index: indexOf(quotes),
    summary,
    reserved,
    available: state.cash - reserved,
    accountValue: state.cash + (summary.totals.marketValue ?? 0n),
    openOrders: state.orders.filter(live).length,
    halted: state.market.halt?.kind === 'circuit-breaker',
  };
}

export interface TerminalContextValue {
  state: TerminalState;
  derived: Derived;
  dispatch: Dispatch<Action>;
  go: (screen: Screen) => void;
}

export const TerminalContext = createContext<TerminalContextValue | null>(null);

export function useTerminal(): TerminalContextValue {
  const value = useContext(TerminalContext);
  if (!value) throw new Error('useTerminal: outside the terminal');
  return value;
}

export const quoteOf = (derived: Derived, symbol: string): LiveQuote | undefined => derived.quotes.find((q) => q.symbol === symbol);
