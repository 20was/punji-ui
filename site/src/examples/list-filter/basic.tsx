import { useState } from 'react';
import { ListFilter } from '@punji/ui/list-filter';
import { holdings } from '../../sample.ts';

// Filters rows already on the page, in memory. Press / to focus it; the x button and Esc clear it.
export default function Example() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const rows = holdings.filter((h) => !q || `${h.symbol} ${h.name}`.toLowerCase().includes(q)).slice(0, 5);
  return (
    <div className="ex-stack">
      <ListFilter value={query} onChange={setQuery} label="Filter holdings" clear="Clear filter" testId="holdings-filter" slash />
      <ul aria-label="Holdings" style={{ margin: 0, paddingLeft: '1.25rem' }}>
        {rows.map((h) => (
          <li key={h.symbol}>
            <b>{h.symbol}</b> {h.name}
          </li>
        ))}
        {rows.length === 0 && <li className="doc-muted">No holdings match “{query}”.</li>}
      </ul>
    </div>
  );
}
