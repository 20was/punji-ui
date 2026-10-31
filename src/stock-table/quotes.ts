/**
 * Quote shape and ordering for the market components. Pure: no React, no
 * browser globals. Prices and turnover are integer minor units (paisa, cents)
 * so they stay exact; volume is a count of shares. Anything may be null (not
 * traded yet, not published): null never becomes zero and always sorts last.
 */
import { percentageChange } from '../calculations/ratios.ts';

export interface Quote {
  /** Unique, stable key (the ticker). */
  symbol: string;
  name?: string;
  sector?: string;
  /** Last traded price, minor units. */
  ltp: bigint | null;
  /** Previous close, minor units; the base of the change. */
  previousClose: bigint | null;
  /** Shares traded. */
  volume: number | null;
  /** Value traded, minor units. */
  turnover: bigint | null;
  /** Closes for a trend line, oldest first. */
  history?: readonly (number | null)[];
  /** Daily circuit limits, minor units, when the exchange publishes them. */
  lowerLimit?: bigint | null;
  upperLimit?: bigint | null;
}

export type QuoteSortKey = 'symbol' | 'ltp' | 'change' | 'changePercent' | 'volume' | 'turnover';
export interface QuoteSort { key: QuoteSortKey; dir: 'asc' | 'desc' }

/** Absolute change in minor units, or null when either price is missing. */
export function quoteChange(quote: Pick<Quote, 'ltp' | 'previousClose'>): bigint | null {
  return quote.ltp !== null && quote.previousClose !== null ? quote.ltp - quote.previousClose : null;
}

/** Change in percent, or null (missing price, or a previous close that is not positive). */
export function quoteChangePercent(quote: Pick<Quote, 'ltp' | 'previousClose'>): number | null {
  return quote.ltp !== null && quote.previousClose !== null ? percentageChange(quote.ltp, quote.previousClose) : null;
}

type Sortable = string | number | bigint | null;
function sortValue(quote: Quote, key: QuoteSortKey): Sortable {
  switch (key) {
    case 'symbol': return quote.symbol;
    case 'ltp': return quote.ltp;
    case 'change': return quoteChange(quote);
    case 'changePercent': return quoteChangePercent(quote);
    case 'volume': return quote.volume;
    case 'turnover': return quote.turnover;
  }
}
const isMissing = (v: Sortable): v is null => v === null || (typeof v === 'number' && Number.isNaN(v));

/**
 * A new array ordered by `sort`. Stable (equal values keep their input order,
 * in both directions) and null-last in both directions, so it is a total
 * order: the same input always gives the same output. Symbols compare by
 * upper-cased code units, not by the reader's locale. The input is never
 * mutated.
 */
export function sortQuotes<T extends Quote>(quotes: readonly T[], sort: QuoteSort): T[] {
  const sign = sort.dir === 'asc' ? 1 : -1;
  const keyed = quotes.map((quote, index) => ({ quote, index, value: sortValue(quote, sort.key) }));
  keyed.sort((a, b) => {
    const am = isMissing(a.value);
    const bm = isMissing(b.value);
    if (am || bm) return am && bm ? a.index - b.index : am ? 1 : -1;
    let c: number;
    if (typeof a.value === 'string' && typeof b.value === 'string') {
      const x = a.value.toUpperCase();
      const y = b.value.toUpperCase();
      c = x < y ? -1 : x > y ? 1 : 0;
    } else {
      const x = a.value as number | bigint;
      const y = b.value as number | bigint;
      c = x < y ? -1 : x > y ? 1 : 0;
    }
    return c === 0 ? a.index - b.index : c * sign;
  });
  return keyed.map((k) => k.quote);
}

/** What a click on a column head asks for: the symbol starts ascending, figures start with the largest. A second click on the same column flips it. */
export function nextQuoteSort(current: QuoteSort | undefined, key: QuoteSortKey): QuoteSort {
  if (current?.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: key === 'symbol' ? 'asc' : 'desc' };
}
