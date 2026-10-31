import { useState } from 'react';
import { CurrencyInput } from '@punji/ui/currency-input';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  const [amount, setAmount] = useState('');
  const [minor, setMinor] = useState<bigint | null>(null);
  return (
    <Stack>
      <CurrencyInput
        label="Amount"
        hint="Two decimals; a third digit is refused, not rounded"
        currency="USD"
        locale="en-US"
        value={amount}
        onValueChange={(change) => {
          setAmount(change.value);
          setMinor(change.minorUnits);
        }}
      />
      <p className="doc-muted">Exact value: <code>{amount === '' ? '(empty)' : amount}</code> · minor units: <code>{minor === null ? 'null' : `${minor}n`}</code></p>
    </Stack>
  );
}
