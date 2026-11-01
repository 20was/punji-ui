import { useState } from 'react';
import { HoldToConfirm } from '@punji/ui/hold-to-confirm';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  const [count, setCount] = useState(0);
  return (
    <Stack className="ex-narrow">
      <HoldToConfirm key={count} onConfirm={() => setCount((n) => n + 1)} block>Send NPR 5,00,000</HoldToConfirm>
      <p>{count === 0 ? 'Not sent yet.' : `Confirmed ${count} time${count === 1 ? '' : 's'}. The button is ready again.`}</p>
    </Stack>
  );
}
