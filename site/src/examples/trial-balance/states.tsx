import { useState } from 'react';
import { TrialBalance } from '@punji/ui/trial-balance';
import { SegmentedControl } from '@punji/ui/controls';
import { journals } from '../../sample.ts';

type View = 'ready' | 'loading' | 'error' | 'empty';

export default function Example() {
  const [view, setView] = useState<View>('error');
  return (
    <div className="ex-stack">
      <SegmentedControl<View>
        label="State"
        prefix="tb-state"
        size="sm"
        value={view}
        onChange={setView}
        options={[
          { value: 'ready', label: 'Ready' },
          { value: 'loading', label: 'Loading' },
          { value: 'error', label: 'Error' },
          { value: 'empty', label: 'Empty' },
        ]}
      />
      <TrialBalance
        caption="Trial balance by state (NPR)"
        data={view === 'ready' ? journals : []}
        state={view === 'loading' || view === 'error' ? view : 'ready'}
        onRetry={() => setView('loading')}
      />
    </div>
  );
}
