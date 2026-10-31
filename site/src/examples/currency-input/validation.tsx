import { useState } from 'react';
import { CurrencyInput } from '@punji/ui/currency-input';
import { MoneyDisplay } from '@punji/ui/money-display';

const balance = 250_000n; // 2,500.00 in minor units

export default function Example() {
  const [amount, setAmount] = useState('3000');
  const [minor, setMinor] = useState<bigint | null>(300_000n);
  const over = minor !== null && minor > balance;
  return (
    <CurrencyInput
      label="Transfer amount"
      hint={<>Available: <MoneyDisplay value={balance} currency="USD" locale="en-US" /></>}
      error={over ? 'More than the available balance' : undefined}
      currency="USD"
      locale="en-US"
      value={amount}
      onValueChange={(change) => {
        setAmount(change.value);
        setMinor(change.minorUnits);
      }}
    />
  );
}
