import { useState } from 'react';
import { HoldingsTable } from '@punji/ui/holdings-table';
import { Button } from '@punji/ui/button';
import { Cluster, Stack } from '@punji/ui/stack';

type State = 'loading' | 'empty' | 'error';

export default function Example() {
  const [state, setState] = useState<State>('loading');
  return (
    <Stack>
      <Cluster>
        {(['loading', 'empty', 'error'] as const).map((s) => (
          <Button key={s} size="sm" variant={state === s ? 'primary' : 'secondary'} onClick={() => setState(s)}>{s}</Button>
        ))}
      </Cluster>
      <HoldingsTable
        caption="Holdings, NPR"
        holdings={[]}
        state={state === 'empty' ? 'ready' : state}
        emptyLabel="No holdings yet. Buy a share to see it here."
        onRetry={() => setState('loading')}
      />
    </Stack>
  );
}
