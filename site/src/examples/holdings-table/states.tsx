import { useState } from 'react';
import { HoldingsTable } from '@punji/ui/holdings-table';
import { Button } from '@punji/ui/button';

type State = 'loading' | 'empty' | 'error';

export default function Example() {
  const [state, setState] = useState<State>('loading');
  return (
    <div className="ex-stack">
      <div className="ex-row">
        {(['loading', 'empty', 'error'] as const).map((s) => (
          <Button key={s} size="sm" variant={state === s ? 'primary' : 'secondary'} onClick={() => setState(s)}>{s}</Button>
        ))}
      </div>
      <HoldingsTable
        caption="Holdings, NPR"
        holdings={[]}
        state={state === 'empty' ? 'ready' : state}
        emptyLabel="No holdings yet. Buy a share to see it here."
        onRetry={() => setState('loading')}
      />
    </div>
  );
}
