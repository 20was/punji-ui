import { Cluster, Stack } from '@punji/ui/stack';
import { Button } from '@punji/ui/button';
import { Dock } from '@punji/ui/overlay';
import { holdings } from '../../sample.ts';

// Dock keeps the page's one main action in reach at the bottom while a long list scrolls (it is position: sticky).
export default function Example() {
  return (
    <div style={{ width: 'min(100%, 440px)', marginInline: 'auto', maxHeight: 280, overflowY: 'auto', paddingInline: 12 }}>
      <Stack as="ul" gap={2}>
        {holdings.map((h) => (
          <Cluster as="li" justify="between" key={h.symbol}>
            <b>{h.symbol}</b>
            <span>{h.qty} shares</span>
          </Cluster>
        ))}
      </Stack>
      <Dock>
        <Button>Review order</Button>
        <Button variant="secondary">Save draft</Button>
      </Dock>
    </div>
  );
}
