/**
 * Pure portfolio arithmetic behind the portfolio components: holdings from
 * trades and quotes, allocation buckets, a realised-P&L transaction ledger and
 * dividends by fiscal year. Money is bigint minor units throughout (paisa,
 * cents); the percentages are display figures from the calculations module.
 * A missing quote or price is null, never zero. No React, no browser globals.
 */
import {
  allocation, computePosition, percentageChange, returnOnCost, valuePosition,
  type CostMethod, type RoundingMode, type Trade,
} from '../calculations/calculations.ts';
import { toCsv } from '../export/csv.ts';
import { gregorianToBS, nepalFiscalYear } from '../nepal/calendar.ts';
import { minorUnitsToDecimal } from '../nepal/money.ts';
import { parseCalendarDate } from '../nepal/date-only.ts';

export type { CostMethod, RoundingMode, Trade };

// ---------------------------------------------------------------------------
// Holdings
// ---------------------------------------------------------------------------

/** One symbol and every trade in it, oldest first. */
export interface PortfolioPosition {
  /** Unique, stable key (the ticker). */
  symbol: string;
  /** The company's name. */
  name?: string;
  /** The company's sector, used by the allocation view. */
  sector?: string;
  /** The trades in order. A bonus issue is a buy at price 0n. */
  trades: readonly Trade[];
}

/** The part of a quote the holdings need. A market `Quote` fits. */
export interface HoldingsQuote {
  /** The ticker the quote belongs to; matched to `PortfolioPosition.symbol`. */
  symbol: string;
  /** Last traded price, minor units; null when not traded or not published. */
  ltp: bigint | null;
  /** Previous close, minor units; the base of the day change. */
  previousClose: bigint | null;
}

export interface HoldingsOptions {
  /** `average` (default) or `fifo`. */
  method?: CostMethod;
  /** How a sale removes cost and how the average cost rounds. Default `half-even`. */
  rounding?: RoundingMode;
  /** Keep fully sold symbols as rows with quantity 0 (default false). Their realised P&L always counts in the totals. */
  includeClosed?: boolean;
  /** Fraction digits of the weight shares (0 to 6). Default 2. */
  weightDecimals?: number;
}

/** One holding: a position marked to its quote. */
export interface Holding {
  /** The ticker; unique and stable, so it is the row key. */
  symbol: string;
  /** The company's name. */
  name?: string;
  /** The company's sector. */
  sector?: string;
  /** Units held. */
  quantity: bigint;
  /** Cost of the units held, fees included, minor units. */
  costBasis: bigint;
  /** costBasis / quantity, rounded; null when nothing is held. */
  averageCost: bigint | null;
  /** Last traded price, minor units; null when there is no quote or it has not traded. */
  ltp: bigint | null;
  /** Previous close, minor units; null when unknown. */
  previousClose: bigint | null;
  /** quantity x ltp; null without an LTP. */
  marketValue: bigint | null;
  /** marketValue - costBasis; null without an LTP. */
  unrealisedPnL: bigint | null;
  /** Unrealised P&L over cost in percent; null without an LTP or without positive cost (a bonus-only holding). */
  unrealisedPercent: number | null;
  /** quantity x (ltp - previousClose): what the position moved today; null when either price is missing. */
  dayChange: bigint | null;
  /** The price move in percent (ltp against previousClose); null when either is missing or the previous close is not positive. */
  dayChangePercent: number | null;
  /** Realised P&L of every sale in the symbol, fees included. */
  realisedPnL: bigint;
  /** Share of the priced portfolio value in percent; null without an LTP or when the total is zero. */
  weight: number | null;
  /** The weight rounded by largest remainder so the shares add up to exactly 100. */
  displayWeight: number | null;
}

export interface HoldingsTotals {
  /** Open holdings (quantity above zero). */
  count: number;
  /** Cost of every open holding, priced or not. */
  costBasis: bigint;
  /** Cost of the holdings that have an LTP: the base of the percentages below. */
  pricedCostBasis: bigint;
  /** Value of the priced holdings. Null when there are open holdings but none has an LTP. 0n only when nothing is held. */
  marketValue: bigint | null;
  /** Unrealised P&L of the priced holdings; null as `marketValue`. */
  unrealisedPnL: bigint | null;
  /** Unrealised P&L over `pricedCostBasis` in percent. */
  unrealisedPercent: number | null;
  /** Day change of the holdings that have both an LTP and a previous close; null when none does. */
  dayChange: bigint | null;
  /** The day change against the previous value of those same holdings, in percent. */
  dayChangePercent: number | null;
  /** Realised P&L of every symbol, including fully sold ones. */
  realisedPnL: bigint;
  /** Fees paid on every trade. */
  totalFees: bigint;
  /** Open symbols without an LTP: left out of value, P&L and day change. */
  unpriced: string[];
  /** Open symbols with an LTP but no previous close: left out of the day change. */
  noPreviousClose: string[];
  /** True when every open holding has an LTP and a previous close, so each total covers the whole portfolio. */
  complete: boolean;
}

export interface HoldingsSummary {
  holdings: Holding[];
  totals: HoldingsTotals;
}

const sum = (values: readonly bigint[]): bigint => values.reduce((total, value) => total + value, 0n);

function quoteMap(quotes: readonly HoldingsQuote[] | ReadonlyMap<string, HoldingsQuote>): ReadonlyMap<string, HoldingsQuote> {
  if ('get' in quotes) return quotes;
  return new Map(quotes.map((quote) => [quote.symbol, quote]));
}

/**
 * Mark positions to quotes. Exact bigint money; a position with no LTP keeps
 * its cost but has null value, P&L, day change and weight, and is named in
 * `totals.unpriced` (it is not counted as zero). Fully sold symbols are
 * omitted unless `includeClosed`, but their realised P&L stays in the totals.
 * Throws on a duplicate symbol, and (from computePosition) on an invalid
 * trade or a sale larger than the units held.
 */
export function holdingsSummary(
  positions: readonly PortfolioPosition[],
  quotes: readonly HoldingsQuote[] | ReadonlyMap<string, HoldingsQuote>,
  options: HoldingsOptions = {},
): HoldingsSummary {
  const { method = 'average', rounding = 'half-even', includeClosed = false, weightDecimals = 2 } = options;
  const prices = quoteMap(quotes);
  const seen = new Set<string>();
  const rows: Holding[] = [];
  let realisedPnL = 0n, totalFees = 0n;
  for (const position of positions) {
    if (seen.has(position.symbol)) throw new RangeError(`Duplicate position for ${position.symbol}`);
    seen.add(position.symbol);
    const computed = computePosition(position.trades, { method, rounding });
    realisedPnL += computed.realisedPnL;
    totalFees += computed.totalFees;
    if (computed.quantity === 0n && !includeClosed) continue;
    const quote = prices.get(position.symbol);
    const ltp = quote?.ltp ?? null;
    const previousClose = quote?.previousClose ?? null;
    const valuation = ltp === null ? null : valuePosition(computed, ltp);
    rows.push({
      symbol: position.symbol,
      ...(position.name === undefined ? {} : { name: position.name }),
      ...(position.sector === undefined ? {} : { sector: position.sector }),
      quantity: computed.quantity,
      costBasis: computed.costBasis,
      averageCost: computed.averageCost,
      ltp,
      previousClose,
      marketValue: valuation?.marketValue ?? null,
      unrealisedPnL: valuation?.unrealisedPnL ?? null,
      unrealisedPercent: valuation ? returnOnCost(valuation.unrealisedPnL, computed.costBasis) : null,
      dayChange: ltp !== null && previousClose !== null ? computed.quantity * (ltp - previousClose) : null,
      dayChangePercent: ltp !== null && previousClose !== null ? percentageChange(ltp, previousClose) : null,
      realisedPnL: computed.realisedPnL,
      weight: null,
      displayWeight: null,
    });
  }

  const priced = rows.filter((row) => row.marketValue !== null);
  const shares = allocation(priced.map((row) => ({ id: row.symbol, value: row.marketValue! })), { decimals: weightDecimals });
  const shareOf = new Map(shares.map((share) => [share.id, share]));
  const holdings = rows.map((row) => {
    const share = shareOf.get(row.symbol);
    return share ? { ...row, weight: share.percent, displayWeight: share.displayPercent } : row;
  });

  const open = holdings.filter((row) => row.quantity > 0n);
  const pricedOpen = open.filter((row) => row.marketValue !== null);
  const dayOpen = open.filter((row) => row.dayChange !== null);
  const pricedCostBasis = sum(pricedOpen.map((row) => row.costBasis));
  const marketValue = open.length === 0 ? 0n : pricedOpen.length === 0 ? null : sum(pricedOpen.map((row) => row.marketValue!));
  const unrealisedPnL = marketValue === null ? null : marketValue - pricedCostBasis;
  const dayChange = dayOpen.length === 0 ? null : sum(dayOpen.map((row) => row.dayChange!));
  const dayNow = sum(dayOpen.map((row) => row.quantity * row.ltp!));
  const unpriced = open.filter((row) => row.ltp === null).map((row) => row.symbol);
  const noPreviousClose = open.filter((row) => row.ltp !== null && row.previousClose === null).map((row) => row.symbol);
  return {
    holdings,
    totals: {
      count: open.length,
      costBasis: sum(open.map((row) => row.costBasis)),
      pricedCostBasis,
      marketValue,
      unrealisedPnL,
      unrealisedPercent: unrealisedPnL === null ? null : returnOnCost(unrealisedPnL, pricedCostBasis),
      dayChange,
      dayChangePercent: dayChange === null ? null : percentageChange(dayNow, dayNow - dayChange),
      realisedPnL,
      totalFees,
      unpriced,
      noPreviousClose,
      complete: unpriced.length === 0 && noPreviousClose.length === 0,
    },
  };
}

// --- Sorting --------------------------------------------------------------

/** The columns a holdings table can sort by. `pnl` sorts by the unrealised amount, `day` by the day change amount. */
export type HoldingSortKey = 'symbol' | 'value' | 'quantity' | 'cost' | 'ltp' | 'pnl' | 'day' | 'weight' | 'sector';
export interface HoldingSort { key: HoldingSortKey; dir: 'asc' | 'desc' }

type Sortable = string | bigint | number | null;
function holdingValue(row: Holding, key: HoldingSortKey): Sortable {
  switch (key) {
    case 'symbol': return row.symbol;
    case 'value': return row.marketValue;
    case 'quantity': return row.quantity;
    case 'cost': return row.averageCost;
    case 'ltp': return row.ltp;
    case 'pnl': return row.unrealisedPnL;
    case 'day': return row.dayChange;
    case 'weight': return row.weight;
    case 'sector': return row.sector ?? null;
  }
}

/** A new array ordered by `sort`: stable (ties keep input order in both directions), nulls last in both directions, text compared by upper-cased code units. Never mutates. */
export function sortHoldings<T extends Holding>(holdings: readonly T[], sort: HoldingSort): T[] {
  const sign = sort.dir === 'asc' ? 1 : -1;
  const keyed = holdings.map((row, index) => ({ row, index, value: holdingValue(row, sort.key) }));
  keyed.sort((a, b) => {
    const aMissing = a.value === null || (typeof a.value === 'number' && Number.isNaN(a.value));
    const bMissing = b.value === null || (typeof b.value === 'number' && Number.isNaN(b.value));
    if (aMissing || bMissing) return aMissing && bMissing ? a.index - b.index : aMissing ? 1 : -1;
    const x = typeof a.value === 'string' ? a.value.toUpperCase() : a.value!;
    const y = typeof b.value === 'string' ? (b.value as string).toUpperCase() : b.value!;
    const order = x < y ? -1 : x > y ? 1 : 0;
    return order === 0 ? a.index - b.index : order * sign;
  });
  return keyed.map((entry) => entry.row);
}

/** What a click on a column head asks for: the symbol and sector start ascending, figures start with the largest; a repeat click flips. */
export function nextHoldingSort(current: HoldingSort | undefined, key: HoldingSortKey): HoldingSort {
  if (current?.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: key === 'symbol' || key === 'sector' ? 'asc' : 'desc' };
}

// --- CSV ------------------------------------------------------------------

export interface HoldingsCsvOptions {
  /** Minor-unit digits of the currency (default 2). */
  scale?: number;
  /** Add a Total row from these totals. */
  totals?: HoldingsTotals;
  /** Prefix a UTF-8 byte order mark for Excel. Default true. */
  bom?: boolean;
}

const percent = (value: unknown): string => (typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '');
const plain = (value: unknown): string => (typeof value === 'bigint' ? value.toString() : '');

/**
 * Holdings as RFC 4180 CSV with exact decimal money ("1234.50", empty when
 * missing) and percents to two places. Spreadsheet formula injection is
 * neutralised by toCsv.
 */
export function holdingsToCsv(holdings: readonly Holding[], options: HoldingsCsvOptions = {}): string {
  const { scale = 2, totals, bom = true } = options;
  const money = (value: unknown) => (typeof value === 'bigint' ? minorUnitsToDecimal(value, scale) : '');
  interface Line { symbol: string; name: string; sector: string; quantity: bigint | null; averageCost: bigint | null; ltp: bigint | null; costBasis: bigint | null; marketValue: bigint | null; unrealisedPnL: bigint | null; unrealisedPercent: number | null; dayChange: bigint | null; dayChangePercent: number | null; weight: number | null }
  const lines: Line[] = holdings.map((row) => ({
    symbol: row.symbol, name: row.name ?? '', sector: row.sector ?? '', quantity: row.quantity, averageCost: row.averageCost, ltp: row.ltp,
    costBasis: row.costBasis, marketValue: row.marketValue, unrealisedPnL: row.unrealisedPnL, unrealisedPercent: row.unrealisedPercent,
    dayChange: row.dayChange, dayChangePercent: row.dayChangePercent, weight: row.weight,
  }));
  if (totals) {
    lines.push({
      symbol: 'Total', name: '', sector: '', quantity: null, averageCost: null, ltp: null, costBasis: totals.costBasis, marketValue: totals.marketValue,
      unrealisedPnL: totals.unrealisedPnL, unrealisedPercent: totals.unrealisedPercent, dayChange: totals.dayChange, dayChangePercent: totals.dayChangePercent, weight: null,
    });
  }
  return toCsv<Line>(lines, [
    { header: 'Symbol', accessor: 'symbol' },
    { header: 'Name', accessor: 'name' },
    { header: 'Sector', accessor: 'sector' },
    { header: 'Quantity', accessor: 'quantity', format: plain, keepNumericText: true },
    { header: 'Average cost', accessor: 'averageCost', format: money, keepNumericText: true },
    { header: 'LTP', accessor: 'ltp', format: money, keepNumericText: true },
    { header: 'Cost', accessor: 'costBasis', format: money, keepNumericText: true },
    { header: 'Market value', accessor: 'marketValue', format: money, keepNumericText: true },
    { header: 'Unrealised P&L', accessor: 'unrealisedPnL', format: money, keepNumericText: true },
    { header: 'Unrealised %', accessor: 'unrealisedPercent', format: percent, keepNumericText: true },
    { header: 'Day change', accessor: 'dayChange', format: money, keepNumericText: true },
    { header: 'Day change %', accessor: 'dayChangePercent', format: percent, keepNumericText: true },
    { header: 'Weight %', accessor: 'weight', format: percent, keepNumericText: true },
  ], { bom });
}

// ---------------------------------------------------------------------------
// Allocation
// ---------------------------------------------------------------------------

export interface PortfolioSlice {
  /** Stable key: `holding:NABIL`, `sector:Banking` or `other`. */
  key: string;
  /** The symbol, the sector or the "Other" label. */
  label: string;
  /** Exact value in minor units. */
  value: bigint;
  /** Unrounded share in percent. */
  percent: number;
  /** Share rounded to `decimals` by largest remainder, so the slices add up to exactly 100. */
  displayPercent: number;
  /** How many holdings the slice holds (above 1 for a sector or for Other). */
  count: number;
  /** True for the bucket that gathers the smallest slices. */
  other: boolean;
}

export interface AllocationOptions {
  /** `holding` (default) or `sector`. */
  by?: 'holding' | 'sector';
  /** The most slices to draw, the "Other" bucket included (2 or more). Default 6. */
  maxSlices?: number;
  /** Fraction digits of the shares. Default 1. */
  decimals?: number;
  /** Name of the bucket for the smallest slices. Default "Other". */
  otherLabel?: string;
  /** Name for holdings without a sector. Default "Unclassified". */
  unclassifiedLabel?: string;
}

export interface PortfolioAllocationResult {
  /** The slices, largest first, "Other" last when it exists. */
  slices: PortfolioSlice[];
  /** Sum of the slices' values. */
  total: bigint;
  /** Open symbols with no market value: left out, not counted as zero. */
  unpriced: string[];
}

/**
 * Group holdings by symbol or sector, largest first (ties by label), and
 * gather everything past `maxSlices - 1` into "Other". Holdings with a zero
 * or missing value draw no slice. Shares come from `allocation`, so they add
 * up to exactly 100 and a bigint total stays exact.
 */
export function allocateHoldings(
  holdings: readonly Pick<Holding, 'symbol' | 'name' | 'sector' | 'marketValue' | 'quantity'>[],
  options: AllocationOptions = {},
): PortfolioAllocationResult {
  const { by = 'holding', maxSlices = 6, decimals = 1, otherLabel = 'Other', unclassifiedLabel = 'Unclassified' } = options;
  if (!Number.isInteger(maxSlices) || maxSlices < 2) throw new RangeError('maxSlices must be an integer of 2 or more');
  const unpriced = holdings.filter((row) => row.quantity > 0n && row.marketValue === null).map((row) => row.symbol);
  const groups = new Map<string, { key: string; label: string; value: bigint; count: number }>();
  for (const row of holdings) {
    if (row.marketValue === null || row.marketValue <= 0n) continue;
    const label = by === 'sector' ? (row.sector?.trim() || unclassifiedLabel) : row.symbol;
    const key = by === 'sector' ? `sector:${label}` : `holding:${row.symbol}`;
    const group = groups.get(key);
    if (group) { group.value += row.marketValue; group.count += 1; }
    else groups.set(key, { key, label, value: row.marketValue, count: 1 });
  }
  let ordered = [...groups.values()].toSorted((a, b) => (a.value === b.value ? (a.label < b.label ? -1 : a.label > b.label ? 1 : 0) : a.value > b.value ? -1 : 1));
  let other = false;
  if (ordered.length > maxSlices) {
    const rest = ordered.slice(maxSlices - 1);
    ordered = [...ordered.slice(0, maxSlices - 1), {
      key: 'other', label: otherLabel, value: rest.reduce((total, group) => total + group.value, 0n), count: rest.reduce((total, group) => total + group.count, 0),
    }];
    other = true;
  }
  const shares = allocation(ordered.map((group) => ({ id: group.key, value: group.value })), { decimals });
  const slices = ordered.map((group, index): PortfolioSlice => ({
    key: group.key, label: group.label, value: group.value, count: group.count,
    percent: shares[index]!.percent ?? 0,
    displayPercent: shares[index]!.displayPercent ?? 0,
    other: other && index === ordered.length - 1,
  }));
  return { slices, total: ordered.reduce((total, group) => total + group.value, 0n), unpriced };
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export type TransactionType = 'buy' | 'sell' | 'bonus' | 'rights' | 'dividend';
export const TRANSACTION_TYPES: readonly TransactionType[] = ['buy', 'sell', 'bonus', 'rights', 'dividend'];

/** One record in the portfolio's history. */
export interface PortfolioTransaction {
  /** Unique, stable id (the React key). */
  id: string;
  /** The day as strict ISO `YYYY-MM-DD` (Gregorian). */
  date: string;
  /** The ticker. */
  symbol: string;
  /** The company's name. */
  name?: string;
  /** The company's sector. */
  sector?: string;
  /** `buy`, `sell`, `bonus`, `rights` or `dividend`. */
  type: TransactionType;
  /** Units: required for buy, sell, bonus and rights. */
  quantity?: bigint;
  /** Minor units per unit: required for buy, sell and rights. A bonus issue is free. */
  price?: bigint;
  /** Total fees of the trade in minor units (added to cost on a buy and a rights issue, deducted from proceeds on a sell). */
  fees?: bigint;
  /** Cash received, minor units: required for a dividend. */
  amount?: bigint;
  /** A free-text note. */
  note?: string;
}

export interface PortfolioLedgerRow extends PortfolioTransaction {
  /** Gross value: quantity x price for a trade, the cash for a dividend, 0 for a bonus issue. */
  value: bigint;
  /** Signed cash movement: negative for a buy and a rights issue (value + fees), positive for a sell (value - fees) and a dividend, 0 for a bonus issue. */
  cashFlow: bigint;
  /** Realised P&L of a sale (net proceeds less the cost removed, by the chosen method); null for every other type. */
  realisedPnL: bigint | null;
}

export interface TransactionLedgerOptions {
  /** How a sale removes cost: `average` (default) or `fifo`. */
  method?: CostMethod;
  /** How a sale's removed cost rounds. Default `half-even`. */
  rounding?: RoundingMode;
}

function checkTransaction(t: PortfolioTransaction): void {
  const where = `Transaction ${t.id}`;
  if (!TRANSACTION_TYPES.includes(t.type)) throw new TypeError(`${where}: unknown type`);
  if (!parseCalendarDate(t.date)) throw new RangeError(`${where}: date must be a valid YYYY-MM-DD`);
  if ((t.fees ?? 0n) < 0n) throw new RangeError(`${where}: fees must not be negative`);
  if (t.type === 'dividend') {
    if (t.amount === undefined || t.amount < 0n) throw new RangeError(`${where}: a dividend needs a non-negative amount`);
    return;
  }
  if (t.quantity === undefined || t.quantity <= 0n) throw new RangeError(`${where}: quantity must be positive`);
  if (t.type !== 'bonus' && (t.price === undefined || t.price < 0n)) throw new RangeError(`${where}: price must not be negative`);
}

const asTrade = (t: PortfolioTransaction): Trade => ({
  side: t.type === 'sell' ? 'sell' : 'buy',
  quantity: t.quantity!,
  price: t.type === 'bonus' ? 0n : t.price!,
  ...(t.fees === undefined ? {} : { fees: t.fees }),
});

function validated(transactions: readonly PortfolioTransaction[]): PortfolioTransaction[] {
  const ids = new Set<string>();
  for (const t of transactions) {
    if (ids.has(t.id)) throw new RangeError(`Duplicate transaction id ${t.id}`);
    ids.add(t.id);
    checkTransaction(t);
  }
  // Date order, then input order: the sort is stable.
  return transactions.toSorted((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * The history in date order (equal dates keep their input order) with the
 * value, cash flow and, for each sale, the realised P&L from replaying that
 * symbol's trades through `computePosition`. Compute it over the whole
 * history, then filter: a filtered list must not change a sale's result.
 * Throws on a duplicate id, an invalid record, or a sale larger than the
 * units held on that date.
 */
export function transactionLedger(transactions: readonly PortfolioTransaction[], options: TransactionLedgerOptions = {}): PortfolioLedgerRow[] {
  const { method = 'average', rounding = 'half-even' } = options;
  const ordered = validated(transactions);
  const trades = new Map<string, Trade[]>();
  const realisedBefore = new Map<string, bigint>();
  return ordered.map((t): PortfolioLedgerRow => {
    if (t.type === 'dividend') return { ...t, value: t.amount!, cashFlow: t.amount!, realisedPnL: null };
    const list = trades.get(t.symbol) ?? [];
    trades.set(t.symbol, list);
    list.push(asTrade(t));
    const value = t.type === 'bonus' ? 0n : t.quantity! * t.price!;
    const fees = t.fees ?? 0n;
    const cashFlow = t.type === 'sell' ? value - fees : t.type === 'bonus' ? 0n : -(value + fees);
    let realisedPnL: bigint | null = null;
    if (t.type === 'sell') {
      // Position replay is cumulative, so a sale's own result is the change in realised P&L it causes.
      const realised = computePosition(list, { method, rounding }).realisedPnL;
      realisedPnL = realised - (realisedBefore.get(t.symbol) ?? 0n);
      realisedBefore.set(t.symbol, realised);
    }
    return { ...t, value, cashFlow, realisedPnL };
  });
}

/** Positions for `holdingsSummary` from the same history: trades per symbol in date order, dividends ignored. Name and sector come from the latest record that has them. */
export function positionsFromTransactions(transactions: readonly PortfolioTransaction[]): PortfolioPosition[] {
  const bySymbol = new Map<string, { symbol: string; name?: string; sector?: string; trades: Trade[] }>();
  for (const t of validated(transactions)) {
    const entry = bySymbol.get(t.symbol) ?? { symbol: t.symbol, trades: [] };
    bySymbol.set(t.symbol, entry);
    if (t.name !== undefined) entry.name = t.name;
    if (t.sector !== undefined) entry.sector = t.sector;
    if (t.type !== 'dividend') entry.trades.push(asTrade(t));
  }
  return [...bySymbol.values()];
}

export interface TransactionFilters {
  /** Types to keep; empty or missing keeps all. */
  types?: readonly TransactionType[];
  /** One symbol (case-insensitive); empty or missing keeps all. */
  symbol?: string;
  /** Inclusive ISO dates. A range without an end is ignored. */
  range?: { start: string; end: string | null } | null;
}

/** Keep the rows that match every filter; order is kept. */
export function filterTransactions<T extends Pick<PortfolioTransaction, 'type' | 'symbol' | 'date'>>(rows: readonly T[], filters: TransactionFilters): T[] {
  const types = filters.types && filters.types.length > 0 ? new Set<TransactionType>(filters.types) : null;
  const symbol = filters.symbol?.trim().toUpperCase() || null;
  const range = filters.range && filters.range.end !== null ? filters.range : null;
  return rows.filter((row) => (!types || types.has(row.type))
    && (!symbol || row.symbol.toUpperCase() === symbol)
    && (!range || (row.date >= range.start && row.date <= range.end!)));
}

// ---------------------------------------------------------------------------
// Dividends
// ---------------------------------------------------------------------------

export type DividendKind = 'cash' | 'bonus' | 'rights';

/** One dividend, bonus issue or rights issue, valued by the caller. */
export interface DividendEntry {
  /** Unique, stable id. */
  id: string;
  /** The day it was received or credited, as strict ISO `YYYY-MM-DD` (Gregorian); it decides the Nepal fiscal year. */
  date: string;
  /** The ticker that paid it. */
  symbol: string;
  /** `cash`, `bonus` (shares) or `rights`. */
  kind: DividendKind;
  /** Value in minor units: the cash received, or the caller's valuation of bonus shares or rights (for example units x par value). */
  amount: bigint;
}

export interface DividendEntriesOptions {
  /** Value of one bonus unit in minor units, usually the par value (Rs 100 is `10_000n`). Default `10_000n`. */
  bonusUnitValue?: bigint;
}

/**
 * Dividend entries from the transaction history: a dividend is its cash, a
 * bonus issue is quantity x `bonusUnitValue`, a rights issue is the amount
 * subscribed (quantity x price, fees excluded). Buys and sells are ignored.
 * The ids are the transactions' ids.
 */
export function dividendEntriesFromTransactions(transactions: readonly PortfolioTransaction[], options: DividendEntriesOptions = {}): DividendEntry[] {
  const unit = options.bonusUnitValue ?? 10_000n;
  const out: DividendEntry[] = [];
  for (const t of validated(transactions)) {
    if (t.type === 'dividend') out.push({ id: t.id, date: t.date, symbol: t.symbol, kind: 'cash', amount: t.amount! });
    else if (t.type === 'bonus') out.push({ id: t.id, date: t.date, symbol: t.symbol, kind: 'bonus', amount: t.quantity! * unit });
    else if (t.type === 'rights') out.push({ id: t.id, date: t.date, symbol: t.symbol, kind: 'rights', amount: t.quantity! * t.price! });
  }
  return out;
}

export interface DividendYear {
  /** Nepal fiscal year label such as `2081/82`, from the Bikram Sambat date. */
  label: string;
  /** First BS year of the fiscal year, for ordering. */
  startYear: number;
  /** Cash dividends received in the year, minor units. */
  cash: bigint;
  /** Your valuation of bonus shares received in the year, minor units. */
  bonus: bigint;
  /** The rights issues in the year, minor units, as you valued them. */
  rights: bigint;
  /** cash + bonus + rights. */
  total: bigint;
  /** Records in the year. */
  count: number;
  /** Cash over the current market value, in percent; null without a positive value. */
  yieldOnValue: number | null;
  /** Cash over the cost of the holdings, in percent; null without a positive cost. */
  yieldOnCost: number | null;
}

export interface DividendYearOptions {
  /** Current market value of the holdings that paid, minor units. */
  marketValue?: bigint | null;
  /** Cost of those holdings, minor units. */
  costBasis?: bigint | null;
  /** Names the fiscal year; default `2081/82`. Use it for Devanagari digits. */
  fiscalLabel?: (year: { startYear: number; endYear: number; label: string }) => string;
}

/**
 * Group dividend entries by Nepal fiscal year (the Gregorian date converts to
 * Bikram Sambat; the year starts on 1 Shrawan), oldest first. Only years with
 * a record appear. Yield is cash only (bonus shares and rights are not cash)
 * over the one value you pass: the same base for every year, so read it as
 * "yield on today's value", not a historical yield.
 */
export function dividendsByFiscalYear(entries: readonly DividendEntry[], options: DividendYearOptions = {}): DividendYear[] {
  const ids = new Set<string>();
  const years = new Map<number, DividendYear>();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new RangeError(`Duplicate dividend id ${entry.id}`);
    ids.add(entry.id);
    if (entry.amount < 0n) throw new RangeError(`Dividend ${entry.id}: amount must not be negative`);
    const date = parseCalendarDate(entry.date);
    if (!date) throw new RangeError(`Dividend ${entry.id}: date must be a valid YYYY-MM-DD`);
    const fiscal = nepalFiscalYear(gregorianToBS(date));
    const year = years.get(fiscal.startYear) ?? {
      label: options.fiscalLabel ? options.fiscalLabel(fiscal) : fiscal.label, startYear: fiscal.startYear,
      cash: 0n, bonus: 0n, rights: 0n, total: 0n, count: 0, yieldOnValue: null, yieldOnCost: null,
    };
    year[entry.kind] += entry.amount;
    year.total += entry.amount;
    year.count += 1;
    years.set(fiscal.startYear, year);
  }
  return [...years.values()].toSorted((a, b) => a.startYear - b.startYear).map((year) => ({
    ...year,
    yieldOnValue: options.marketValue == null ? null : returnOnCost(year.cash, options.marketValue),
    yieldOnCost: options.costBasis == null ? null : returnOnCost(year.cash, options.costBasis),
  }));
}
