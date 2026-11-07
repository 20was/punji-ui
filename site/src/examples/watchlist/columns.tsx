import { useState } from 'react';
import { Watchlist, WatchlistRow, WatchlistRowSkeleton, type WatchlistQuote } from '@punji/ui/watchlist';
import { quotes } from '../../sample.ts';

// Month and since-added columns compare the price to a reference price you hold (exact minor units), an actions slot adds
// your own buttons, and loading draws skeleton rows. WatchlistRow also works on its own inside a `<ul class="pu-watchlist-list">`.
const withReference = (list: typeof quotes): WatchlistQuote[] =>
  list.map((q, i) => ({ ...q, monthAgo: q.ltp === null ? null : (q.ltp * (i % 2 ? 108n : 94n)) / 100n, addedPrice: i === 1 ? null : q.ltp === null ? null : (q.ltp * (i % 2 ? 90n : 120n)) / 100n }));

const alertButton = (alerts: string[], setAlerts: (next: string[]) => void) => (q: WatchlistQuote) => (
  <button type="button" aria-pressed={alerts.includes(q.symbol)} aria-label={`Alert on ${q.symbol}`} onClick={() => setAlerts(alerts.includes(q.symbol) ? alerts.filter((s) => s !== q.symbol) : [...alerts, q.symbol])}>
    {alerts.includes(q.symbol) ? '★' : '☆'}
  </button>
);

export default function Example() {
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);
  const list = withReference(quotes.slice(0, 3));
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <button type="button" onClick={() => setLoading((v) => !v)} style={{ justifySelf: 'start' }}>{loading ? 'Show rows' : 'Show loading'}</button>
      <Watchlist
        quotes={list}
        label="My watchlist"
        showMonth
        showSinceAdded
        loading={loading}
        actions={alertButton(alerts, setAlerts)}
      />
      <ul className="pu-watchlist-list" aria-label="Standalone rows" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        <WatchlistRow quote={list[0]!} showMonth />
        <WatchlistRowSkeleton showMonth />
      </ul>
    </div>
  );
}
