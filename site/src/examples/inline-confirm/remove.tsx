import { useState } from 'react';
import { Cluster, Stack } from '@punji/ui/stack';
import { Button } from '@punji/ui/button';
import { InlineConfirm } from '@punji/ui/inline-confirm';
import { holdings } from '../../sample.ts';

// InlineConfirm replaces the row that asked for it. The confirm takes focus; Esc or the second button goes back.
// Name what goes in the confirm ("Remove NTC"), and say what happens to the rest in the body.
export default function Example() {
  const [list, setList] = useState(holdings.slice(0, 3).map((h) => h.symbol));
  const [asking, setAsking] = useState<string | null>(null);
  return (
    <div style={{ width: 'min(100%, 440px)', marginInline: 'auto' }}>
      <Stack as="ul" gap={2} aria-label="Watchlist">
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
            <Cluster as="li" justify="between" key={symbol}>
              <b>{symbol}</b>
              <Button variant="ghost" size="sm" onClick={() => setAsking(symbol)}>
                Remove
              </Button>
            </Cluster>
          ),
        )}
      </Stack>
      {list.length === 0 && <p style={{ margin: 0, fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)' }}>Your watchlist is empty.</p>}
    </div>
  );
}
