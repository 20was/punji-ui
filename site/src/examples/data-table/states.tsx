import { useState } from 'react';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { SegmentedControl } from '@punji/ui/controls';
import { Button } from '@punji/ui/button';
import { holdings, type Holding } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

const columns: FinancialColumn<Holding>[] = [
  { key: 'symbol', label: 'Symbol', rowHeader: true, render: (h) => h.symbol },
  { key: 'name', label: 'Company', render: (h) => h.name },
];

type View = 'ready' | 'loading' | 'error' | 'empty';

export default function Example() {
  const [view, setView] = useState<View>('loading');
  return (
    <Stack>
      <SegmentedControl<View>
        label="State"
        prefix="table-state"
        size="sm"
        value={view}
        onChange={setView}
        options={[{ value: 'ready', label: 'Ready' }, { value: 'loading', label: 'Loading' }, { value: 'error', label: 'Error' }, { value: 'empty', label: 'Empty' }]}
      />
      <FinancialTable
        caption="Holdings"
        columns={columns}
        rows={view === 'ready' ? holdings.slice(0, 3) : []}
        rowKey={(h) => h.symbol}
        state={view === 'loading' || view === 'error' ? view : 'ready'}
        emptyTitle="No holdings yet"
        emptyBody="Add a holding to see it here."
        errorAction={<Button size="sm" variant="secondary" onClick={() => setView('loading')}>Try again</Button>}
      />
    </Stack>
  );
}
