import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { MarketBreadth, breadthOf } from '@punji/ui/market-breadth';
import { Cluster, Stack } from '@punji/ui/stack';
import { quotes } from '../../sample.ts';

// Counted from quotes with breadthOf, plus circuit hits under the bar. "Loading" and "Before the open" show the
// other two states.
export default function Example() {
  const [view, setView] = useState<'live' | 'loading' | 'empty'>('live');
  const b = breadthOf(quotes);
  return (
    <Stack>
      <Cluster role="group" aria-label="State">
        <Button size="sm" variant="secondary" aria-pressed={view === 'live'} onClick={() => setView('live')}>Live</Button>
        <Button size="sm" variant="secondary" aria-pressed={view === 'loading'} onClick={() => setView('loading')}>Loading</Button>
        <Button size="sm" variant="secondary" aria-pressed={view === 'empty'} onClick={() => setView('empty')}>Before the open</Button>
      </Cluster>
      <MarketBreadth
        label="NEPSE breadth"
        {...(view === 'empty' ? { advances: 0, declines: 0, unchanged: 0 } : b)}
        loading={view === 'loading'}
        extra={[
          { id: 'upper', label: 'At upper circuit', value: 1, tone: 'up' },
          { id: 'lower', label: 'At lower circuit', value: 0, tone: 'down' },
          { id: 'traded', label: 'Scrips traded', value: quotes.length },
        ]}
      />
      <MarketBreadth label="Compact, red means up" advances={212} declines={48} unchanged={11} size="sm" convention="red-up" showRatio={false} />
    </Stack>
  );
}
