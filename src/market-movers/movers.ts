/** Ranking for a movers list. Pure: no React, no browser globals. */
import { quoteChangePercent, sortQuotes, type Quote } from '../stock-table/quotes.ts';

export type MoverKind = 'gainers' | 'losers' | 'active';

/**
 * The top `limit` quotes of a kind.
 * - gainers: change above zero, largest percent first.
 * - losers: change below zero, largest fall first.
 * - active: by turnover (or volume), largest first; quotes with no figure are left out.
 * A quote with no change (a missing price or previous close) is never a gainer or loser. Ties keep
 * the input order. Does not mutate the input.
 */
export function rankMovers<T extends Quote>(quotes: readonly T[], kind: MoverKind, options: { limit?: number; activeBy?: 'turnover' | 'volume' } = {}): T[] {
  const limit = Math.max(0, Math.floor(options.limit ?? 5));
  let ranked: T[];
  if (kind === 'active') {
    const by = options.activeBy ?? 'turnover';
    ranked = sortQuotes(quotes.filter((q) => (by === 'turnover' ? q.turnover : q.volume) !== null), { key: by, dir: 'desc' });
  } else {
    const rising = kind === 'gainers';
    ranked = sortQuotes(
      quotes.filter((q) => {
        const pct = quoteChangePercent(q);
        return pct !== null && (rising ? pct > 0 : pct < 0);
      }),
      { key: 'changePercent', dir: rising ? 'desc' : 'asc' },
    );
  }
  return ranked.slice(0, limit);
}
