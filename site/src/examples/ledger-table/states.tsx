import { useState } from 'react';
import { LedgerTable } from '@punji/ui/ledger-table';
import { SegmentedControl } from '@punji/ui/controls';
import { cashEntries } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

type View = 'ready' | 'loading' | 'error' | 'empty';

export default function Example() {
  const [view, setView] = useState<View>('loading');
  return (
    <Stack>
      <SegmentedControl<View>
        label="State"
        prefix="ledger-state"
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
      <LedgerTable
        caption="Cash ledger by state (NPR)"
        entries={view === 'ready' ? cashEntries : []}
        normal="debit"
        state={view === 'loading' || view === 'error' ? view : 'ready'}
        emptyLabel="No postings in this period."
        onRetry={() => setView('loading')}
      />
    </Stack>
  );
}
