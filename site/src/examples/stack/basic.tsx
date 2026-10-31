import { useState } from 'react';
import { Field } from '@punji/ui/fields';
import { Button } from '@punji/ui/button';
import { Stack } from '@punji/ui/stack';

// One column, spaced by a step of the spacing scale. The gap is the only space between the children.
export default function Example() {
  const [symbol, setSymbol] = useState('NABIL');
  const [quantity, setQuantity] = useState('100');
  return (
    <Stack gap={4}>
      <Field label="Symbol" value={symbol} onChange={setSymbol} />
      <Field label="Quantity" inputMode="numeric" value={quantity} onChange={setQuantity} hint="Shares, in whole units." />
      <p>Orders placed after 3:00 PM are queued for the next session.</p>
      <Stack align="start" gap={2}>
        <Button>Review order</Button>
      </Stack>
    </Stack>
  );
}
