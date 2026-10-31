import { useState } from 'react';
import { Chip } from '@punji/ui/controls';
import { Field } from '@punji/ui/fields';
import { Cluster, Stack } from '@punji/ui/stack';

// A Chip with `selected` is a toggle (aria-pressed). Without it, a chip is a suggestion: it acts once and holds no state.
export default function Example() {
  const [held, setHeld] = useState(true);
  const [dividend, setDividend] = useState(false);
  const [units, setUnits] = useState('');
  return (
    <Stack>
      <Cluster role="group" aria-label="Show">
        <Chip selected={held} onClick={() => setHeld(!held)} count={12}>
          Held
        </Chip>
        <Chip selected={dividend} onClick={() => setDividend(!dividend)} count={5}>
          Pays dividend
        </Chip>
        <Chip size="sm" disabled onClick={() => {}}>
          Watchlist (empty)
        </Chip>
      </Cluster>
      <Field label="Units to sell" value={units} onChange={setUnits} inputMode="numeric" hint="Of 120 NABIL shares" />
      <Cluster role="group" aria-label="Quick amounts">
        <Chip label="A quarter, 30 units" onClick={() => setUnits('30')}>
          ¼
        </Chip>
        <Chip label="Half, 60 units" onClick={() => setUnits('60')}>
          ½
        </Chip>
        <Chip onClick={() => setUnits('120')}>All 120</Chip>
      </Cluster>
    </Stack>
  );
}
