import { useState } from 'react';
import { Checkbox } from '@punji/ui/checkbox';
import { Stack } from '@punji/ui/stack';

// Choices that wait for the form's Save. A setting that applies at once is a Switch.
export default function Example() {
  const [picked, setPicked] = useState<readonly string[]>(['NABIL']);
  const toggle = (symbol: string, on: boolean) => setPicked((now) => (on ? [...now, symbol] : now.filter((s) => s !== symbol)));
  return (
    <Stack as="fieldset">
      <legend>Compare these companies</legend>
      {['NABIL', 'NTC', 'HDL'].map((symbol) => (
        <Checkbox key={symbol} checked={picked.includes(symbol)} onChange={(on) => toggle(symbol, on)}>
          {symbol}
        </Checkbox>
      ))}
    </Stack>
  );
}
