import { useState } from 'react';
import { Watchlist } from '@punji/ui/watchlist';
import { quotes } from '../../sample.ts';

// The callbacks only REQUEST a change; the list is yours. Alt+ArrowUp / Alt+ArrowDown on a row's buttons also moves it.
export default function Example() {
  const [list, setList] = useState(quotes.slice(0, 5));
  return (
    <Watchlist
      quotes={list}
      label="My watchlist"
      onReorder={(symbols) => setList((current) => symbols.map((s) => current.find((q) => q.symbol === s)!))}
      onRemove={(symbol) => setList((current) => current.filter((q) => q.symbol !== symbol))}
      emptyTitle="Nothing on your watchlist"
      emptyBody="Search for a company to follow it."
    />
  );
}
