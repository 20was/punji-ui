import { useState } from 'react';
import { NumberField } from '@punji/ui/fields';
import { Stack } from '@punji/ui/stack';

// A NEPSE-style order ticket: whole lots of 10 units and a 0.10 price tick. Stepping is exact decimal arithmetic,
// so 487.5 plus a 0.1 tick is 487.6 and never 487.59999999999997.
export default function Example() {
  const [units, setUnits] = useState('50');
  const [price, setPrice] = useState('487.5');
  return (
    <Stack style={{ width: 'min(100%, 440px)', marginInline: 'auto' }}>
      <NumberField integer label="Units" value={units} onChange={setUnits} step="10" min="10" max="5000" steppers hint="Lots of 10, up to 5,000" />
      <NumberField label="Limit price (NPR)" value={price} onChange={setPrice} maxFractionDigits={2} step="0.1" min="0.1" steppers hint="Tick 0.10. Shift + arrow moves ten ticks" />
    </Stack>
  );
}
