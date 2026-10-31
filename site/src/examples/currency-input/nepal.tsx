import { useState } from 'react';
import { CurrencyInput } from '@punji/ui/currency-input';
import { nepalMoneyConfig } from '@punji/ui/money';

export default function Example() {
  const [amount, setAmount] = useState('1234567.89');
  return (
    <div className="ex-stack">
      <CurrencyInput label="Amount" preset={nepalMoneyConfig()} value={amount} onValueChange={(change) => setAmount(change.value)} />
      <p className="doc-muted">Exact value: <code>{amount}</code></p>
    </div>
  );
}
