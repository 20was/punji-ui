'use client';

// A client component: it owns the sort state, so it needs hooks and event handlers.
import { useMemo, useState } from 'react';
import { StockTable, sortQuotes, type Quote, type QuoteSort } from '@punji/ui/stock-table';

/** What the server sends: JSON-safe strings for the minor units. */
export interface QuoteRow {
  symbol: string;
  ltp: string;
  previousClose: string;
  volume: number;
  turnover: string;
}

const toQuote = (row: QuoteRow): Quote => ({
  symbol: row.symbol,
  ltp: BigInt(row.ltp),
  previousClose: BigInt(row.previousClose),
  volume: row.volume,
  turnover: BigInt(row.turnover),
});

export function WatchPanel({ rows }: { rows: readonly QuoteRow[] }) {
  const [sort, setSort] = useState<QuoteSort>({ key: 'symbol', dir: 'asc' });
  const quotes = useMemo(() => sortQuotes(rows.map(toQuote), sort), [rows, sort]);
  return <StockTable caption="Watchlist · NPR" quotes={quotes} sort={sort} onSortChange={setSort} />;
}
