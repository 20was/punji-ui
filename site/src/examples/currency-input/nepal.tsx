import { useState } from 'react';
import { CurrencyInput } from '@punji/ui/currency-input';
import { nepalMoneyConfig } from '@punji/ui/money';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  const [amount, setAmount] = useState('1234567.89');
  return (
    <Stack>
      <CurrencyInput label="Amount" preset={nepalMoneyConfig()} value={amount} onValueChange={(change) => setAmount(change.value)} />
      <p className="doc-muted">Exact value: <code>{amount}</code></p>
    </Stack>
  );
}
