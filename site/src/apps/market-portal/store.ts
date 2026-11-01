// The portal's state: one simulated market (quotes, floorsheet and index paths), the company being read, the
// symbols being compared, the watchlist and its price alerts. One reducer, so the price on the overview, the
// screener row, the company page, the watchlist and the alert that fires are the same number at the same tick.
import { createContext, useContext, type Dispatch } from 'react';
import { formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import { breadthOf, type Breadth } from '@punji/ui/market-breadth';
import type { LiveQuote } from '../shared/sim.ts';
import { CLOSE_TICK, INDEX_BASE, createPortal, portalTime, stepPortal, type PortalMarket } from './market.ts';

export const npr = nepalMoneyConfig();
export const rs = (paisa: bigint) => formatMoney(paisa, npr);
/** Prices in tables: no currency mark. */
export const quoteMoney = { ...npr, display: 'none' as const };

export type Screen = 'overview' | 'screener' | 'floorsheet' | 'company' | 'calendars' | 'compare' | 'watchlist';
export const SCREENS: readonly Screen[] = ['overview', 'screener', 'floorsheet', 'company', 'calendars', 'compare', 'watchlist'];
/** The most symbols Compare draws beside the index. */
export const MAX_COMPARE = 5;

export interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  /** Paisa. */
  price: bigint;
  status: 'active' | 'triggered';
  /** When it fired: the session time and the price that crossed. */
  firedAt?: string;
  firedPrice?: bigint;
}

export interface PortalState {
  market: PortalMarket;
  running: boolean;
  /** The quote feed failed (a demo of the error state): prices stop and the tables say so. */
  feedDown: boolean;
  /** The company page's symbol. */
  symbol: string;
  compare: string[];
  watchlist: string[];
  alerts: PriceAlert[];
  seq: number;
  /** The last thing the portal did, announced politely. */
  notice: string;
}

export function initialState(): PortalState {
  return {
    market: createPortal(),
    running: true,
    feedDown: false,
    symbol: 'NABIL',
    compare: ['NABIL', 'UPPER', 'NTC'],
    watchlist: ['NABIL', 'UPPER', 'NTC', 'HRL', 'CHCL'],
    alerts: [
      { id: 'A-1', symbol: 'NABIL', condition: 'above', price: 52_000n, status: 'active' },
      { id: 'A-2', symbol: 'UPPER', condition: 'below', price: 38_500n, status: 'active' },
    ],
    seq: 3,
    notice: '',
  };
}

export type Action =
  | { type: 'tick' }
  | { type: 'run'; running: boolean }
  | { type: 'feed'; down: boolean }
  | { type: 'select'; symbol: string }
  | { type: 'compare-add'; symbol: string }
  | { type: 'compare-remove'; symbol: string }
  | { type: 'watch'; symbol: string }
  | { type: 'reorder'; symbols: string[] }
  | { type: 'alert-add'; symbol: string; condition: 'above' | 'below'; price: bigint }
  | { type: 'alert-remove'; id: string }
  | { type: 'alert-rearm'; id: string };

const quoteIn = (m: PortalMarket, symbol: string) => m.quotes.find((q) => q.symbol === symbol);
const crossed = (a: PriceAlert, ltp: bigint) => (a.condition === 'above' ? ltp >= a.price : ltp <= a.price);

export function reducer(state: PortalState, action: Action): PortalState {
  switch (action.type) {
    case 'tick': {
      if (state.feedDown || state.market.tick >= CLOSE_TICK) return state;
      const market = stepPortal(state.market);
      const fired: string[] = [];
      const alerts = state.alerts.map((a) => {
        const q = a.status === 'active' ? quoteIn(market, a.symbol) : undefined;
        if (!q || !crossed(a, q.ltp)) return a;
        fired.push(`${a.symbol} is ${a.condition} ${rs(a.price)} at ${rs(q.ltp)}`);
        return { ...a, status: 'triggered' as const, firedAt: portalTime(market.tick), firedPrice: q.ltp };
      });
      const closed = market.tick >= CLOSE_TICK;
      return { ...state, market, alerts: fired.length ? alerts : state.alerts, notice: fired.length ? `Price alert: ${fired.join('; ')}.` : closed ? 'The market has closed for the day.' : state.notice };
    }
    case 'run':
      return { ...state, running: action.running, notice: action.running ? 'Live prices resumed.' : 'Live prices paused.' };
    case 'feed':
      return { ...state, feedDown: action.down, notice: action.down ? 'The price feed stopped. Figures on screen are the last received.' : 'The price feed is back.' };
    case 'select':
      return quoteIn(state.market, action.symbol) ? { ...state, symbol: action.symbol } : state;
    case 'compare-add': {
      if (state.compare.includes(action.symbol) || !quoteIn(state.market, action.symbol)) return state;
      if (state.compare.length >= MAX_COMPARE) return { ...state, notice: `Compare holds ${MAX_COMPARE} symbols. Remove one first.` };
      return { ...state, compare: [...state.compare, action.symbol], notice: `${action.symbol} added to the comparison.` };
    }
    case 'compare-remove':
      return { ...state, compare: state.compare.filter((s) => s !== action.symbol), notice: `${action.symbol} removed from the comparison.` };
    case 'watch': {
      const watching = state.watchlist.includes(action.symbol);
      if (!watching && !quoteIn(state.market, action.symbol)) return state;
      return {
        ...state,
        watchlist: watching ? state.watchlist.filter((s) => s !== action.symbol) : [...state.watchlist, action.symbol],
        notice: watching ? `${action.symbol} removed from the watchlist.` : `${action.symbol} added to the watchlist.`,
      };
    }
    case 'reorder':
      return { ...state, watchlist: action.symbols.filter((s) => state.watchlist.includes(s)) };
    case 'alert-add': {
      const q = quoteIn(state.market, action.symbol);
      if (!q || action.price <= 0n) return state;
      const id = `A-${state.seq}`;
      const alert: PriceAlert = { id, symbol: action.symbol, condition: action.condition, price: action.price, status: 'active' };
      return {
        ...state,
        seq: state.seq + 1,
        alerts: [...state.alerts, alert],
        watchlist: state.watchlist.includes(action.symbol) ? state.watchlist : [...state.watchlist, action.symbol],
        notice: `Alert set: ${action.symbol} ${action.condition} ${rs(action.price)}.`,
      };
    }
    case 'alert-remove':
      return { ...state, alerts: state.alerts.filter((a) => a.id !== action.id), notice: 'Alert removed.' };
    case 'alert-rearm':
      return { ...state, alerts: state.alerts.map((a) => (a.id === action.id ? { id: a.id, symbol: a.symbol, condition: a.condition, price: a.price, status: 'active' as const } : a)), notice: 'Alert set again.' };
    default:
      return state;
  }
}

export interface IndexLine {
  value: number;
  previous: number;
  change: number;
  changePercent: number;
}

export interface Derived {
  quotes: LiveQuote[];
  bySymbol: Map<string, LiveQuote>;
  index: IndexLine;
  breadth: Breadth;
  turnover: bigint;
  volume: number;
  /** Floorsheet contracts today. */
  contracts: number;
  /** Scrips that traded today. */
  traded: number;
  upperCircuit: number;
  lowerCircuit: number;
  closed: boolean;
}

export function derive(state: PortalState): Derived {
  const { quotes } = state.market;
  const value = state.market.paths.NEPSE?.at(-1) ?? INDEX_BASE;
  const change = value - INDEX_BASE;
  let turnover = 0n;
  let volume = 0;
  let traded = 0;
  let upperCircuit = 0;
  let lowerCircuit = 0;
  for (const q of quotes) {
    turnover += q.turnover;
    volume += q.volume;
    if (q.trades > 0) traded += 1;
    if (q.ltp >= q.upperLimit) upperCircuit += 1;
    if (q.ltp <= q.lowerLimit) lowerCircuit += 1;
  }
  return {
    quotes,
    bySymbol: new Map(quotes.map((q) => [q.symbol, q])),
    index: { value, previous: INDEX_BASE, change, changePercent: (change / INDEX_BASE) * 100 },
    breadth: breadthOf(quotes),
    turnover,
    volume,
    contracts: state.market.trades.length,
    traded,
    upperCircuit,
    lowerCircuit,
    closed: state.market.tick >= CLOSE_TICK,
  };
}

export interface PortalContextValue {
  state: PortalState;
  derived: Derived;
  dispatch: Dispatch<Action>;
  go: (screen: Screen) => void;
  /** Open a company's page. */
  open: (symbol: string) => void;
}

export const PortalContext = createContext<PortalContextValue | null>(null);

export function usePortal(): PortalContextValue {
  const value = useContext(PortalContext);
  if (!value) throw new Error('usePortal outside the market portal');
  return value;
}

/** "+1.25%" with a true minus sign. */
export const signedPct = (n: number, digits = 2) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(digits)}%`;
/** Percent change of a quote, or 0. */
export const changePct = (q: Pick<LiveQuote, 'ltp' | 'previousClose'>) => (q.previousClose > 0n ? (Number(q.ltp - q.previousClose) / Number(q.previousClose)) * 100 : 0);

/** "512.3" or "512.30" to paisa; null when it is not a price. */
export function parsePrice(text: string): bigint | null {
  const m = /^\s*(\d{1,7})(?:\.(\d{1,2}))?\s*$/.exec(text.replace(/,/g, ''));
  if (!m) return null;
  return BigInt(m[1]!) * 100n + BigInt((m[2] ?? '').padEnd(2, '0'));
}
