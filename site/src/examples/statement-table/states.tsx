import { useState } from 'react';
import { StatementTable } from '@punji/ui/statement-table';
import { SegmentedControl } from '@punji/ui/controls';
import { periods } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

type View = 'loading' | 'error' | 'empty';

export default function Example() {
  const [view, setView] = useState<View>('empty');
  return (
    <Stack>
      <SegmentedControl<View>
        label="State"
        prefix="st-state"
        size="sm"
        value={view}
        onChange={setView}
        options={[{ value: 'loading', label: 'Loading' }, { value: 'error', label: 'Error' }, { value: 'empty', label: 'Empty' }]}
      />
      <StatementTable
        caption="Statement by state (NPR)"
        periods={periods}
        rows={[]}
        state={view === 'empty' ? 'ready' : view}
        onRetry={() => setView('loading')}
      />
    </Stack>
  );
}
