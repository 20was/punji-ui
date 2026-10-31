import { useState } from 'react';
import { RetryNote } from '@punji/ui/retry-note';
import { Card } from '@punji/ui/card';
import { KeyStats } from '@punji/ui/key-stats';
import { Skeleton } from '@punji/ui/states';
import { Stack } from '@punji/ui/stack';

// One part failed in its own place; the rest of the page keeps working. Retry swaps in a skeleton, then the data.
export default function Example() {
  const [state, setState] = useState<'error' | 'loading' | 'ready'>('error');
  const retry = () => {
    setState('loading');
    setTimeout(() => setState('ready'), 900);
  };
  return (
    <Card title="NABIL" description="Rs 487.50 · 14 Nov close">
      <Stack>
        <KeyStats layout="strip" label="Session" empty="Not published" items={[{ label: 'High', value: 'Rs 489.30' }, { label: 'Low', value: 'Rs 478.20' }]} />
        {state === 'error' && (
          <RetryNote retryLabel="Try again" onRetry={retry}>
            Could not load fundamentals.
          </RetryNote>
        )}
        {state === 'loading' && <Skeleton height={48} label="Loading fundamentals" />}
        {state === 'ready' && <KeyStats label="Fundamentals" empty="Not published" items={[{ label: 'EPS', value: '38.20' }, { label: 'P/E', value: '12.8' }]} />}
      </Stack>
    </Card>
  );
}
