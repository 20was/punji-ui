import { useState } from 'react';
import { KeyStats } from '@punji/ui/key-stats';
import { SegmentedControl } from '@punji/ui/controls';
import { Stack } from '@punji/ui/stack';

type View = 'ready' | 'loading';

export default function Example() {
  const [view, setView] = useState<View>('loading');
  return (
    <Stack>
      <SegmentedControl<View>
        label="State"
        prefix="keystats-state"
        size="sm"
        value={view}
        onChange={setView}
        options={[{ value: 'ready', label: 'Ready' }, { value: 'loading', label: 'Loading' }]}
      />
      <KeyStats
        layout="strip"
        label="NABIL session"
        empty="Not published"
        loading={view === 'loading'}
        items={[
          { label: 'Open', value: 'Rs 480.00' },
          { label: 'High', value: 'Rs 489.30' },
          { label: 'Low', value: 'Rs 478.20' },
          { label: 'Close', value: 'Rs 487.50' },
        ]}
      />
    </Stack>
  );
}
