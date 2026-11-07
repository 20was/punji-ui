import { useState } from 'react';
import { RangeEditor } from '@punji/ui/range-editor';
import { Stack } from '@punji/ui/stack';

// A price range. The track is 0 to 5,000 in steps of 0.5, and the slider writes the ends back as exact decimal
// strings: three steps are "1.5", never 1.4999999999999998. The fields take up to two decimals and refuse a third.
export default function Example() {
  const [from, setFrom] = useState('250');
  const [to, setTo] = useState('');
  return (
    <Stack>
      <RangeEditor
        why="The last traded price, in rupees."
        track={{ min: '0', max: '5000', step: '0.5' }}
        formatTrackValue={(v) => `Rs ${v}`}
        presets={[
          { id: 'penny', label: 'Under Rs 100', from: '', to: '100' },
          { id: 'mid', label: 'Rs 100 to 500', from: '100', to: '500' },
        ]}
        from={from}
        to={to}
        onFrom={setFrom}
        onTo={setTo}
        fromLabel="From (Rs)"
        toLabel="To (Rs)"
        onClear={() => (setFrom(''), setTo(''))}
        applyLabel="Show prices"
        onApply={() => {}}
        testIdPrefix="price"
      />
      <p style={{ margin: 0, fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)', paddingInline: 'var(--pu-space-4)' }} role="status">
        Held as the strings {JSON.stringify(from)} and {JSON.stringify(to)}.
      </p>
    </Stack>
  );
}
