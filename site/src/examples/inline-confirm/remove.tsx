import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { InlineConfirm } from '@punji/ui/inline-confirm';
import { holdings } from '../../sample.ts';

// InlineConfirm replaces the row that asked for it. The confirm takes focus; Esc or the second button goes back.
// Name what goes in the confirm ("Remove NTC"), and say what happens to the rest in the body.
export default function Example() {
  const [list, setList] = useState(holdings.slice(0, 3).map((h) => h.symbol));
  const [asking, setAsking] = useState<string | null>(null);
  return (
    <div className="ex-narrow">
      <ul className="ex-rows" aria-label="Watchlist">
        {list.map((symbol) =>
          asking === symbol ? (
            <InlineConfirm
              key={symbol}
              as="li"
              id={`rm-${symbol}`}
              title={`Remove ${symbol}?`}
              body="Its price alerts are deleted too. Your holding is not affected."
              confirm={`Remove ${symbol}`}
              cancel="Keep it"
              onCancel={() => setAsking(null)}
              onConfirm={() => {
                setList(list.filter((s) => s !== symbol));
                setAsking(null);
              }}
            />
          ) : (
            <li key={symbol}>
              <b>{symbol}</b>
              <Button variant="ghost" size="sm" onClick={() => setAsking(symbol)}>
                Remove
              </Button>
            </li>
          ),
        )}
      </ul>
      {list.length === 0 && <p className="ex-label">Your watchlist is empty.</p>}
    </div>
  );
}
