import { useState } from 'react';
import { BillSummary, type BillLine } from '@punji/ui/bill-summary';
import { Button } from '@punji/ui/button';
import { SegmentedControl } from '@punji/ui/controls';

const LINES: BillLine[] = [
  { id: 'energy', label: 'Energy charge', amount: 184_500n, detail: '212 units' },
  { id: 'service', label: 'Service charge', amount: 17_500n },
];
const ADJUSTMENTS: BillLine[] = [{ id: 'rebate', label: 'Early payment rebate (2%)', amount: -4_040n }];

type State = 'ready' | 'loading' | 'error' | 'empty';

export default function Example() {
  const [state, setState] = useState<State>('ready');
  const [calendar, setCalendar] = useState<'ad' | 'bs'>('bs');
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
      <SegmentedControl
        options={[
          { value: 'ready', label: 'Bill' },
          { value: 'loading', label: 'Loading' },
          { value: 'error', label: 'Error' },
          { value: 'empty', label: 'Nothing due' },
        ]}
        value={state}
        onChange={setState}
        prefix="bill-state"
        label="State"
        size="sm"
        wrap
      />
      <SegmentedControl
        options={[
          { value: 'bs', label: 'BS' },
          { value: 'ad', label: 'AD' },
        ]}
        value={calendar}
        onChange={setCalendar}
        prefix="bill-cal"
        label="Calendar"
        size="sm"
      />
      <BillSummary
        biller="Nepal Electricity Authority"
        service="Electricity"
        customerName="Sita Sharma"
        customerId="012.34.567A"
        period="Ashwin 2083"
        lines={LINES}
        adjustments={ADJUSTMENTS}
        dueDate="2026-11-15"
        calendar={calendar}
        status="unpaid"
        state={state}
        onRetry={() => setState('ready')}
        action={<Button>Pay Rs 1,979.60</Button>}
      />
    </div>
  );
}
