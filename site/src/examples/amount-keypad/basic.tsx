import { useState } from 'react';
import { AmountKeypad, type AmountKeypadChange } from '@punji/ui/amount-keypad';
import { Button } from '@punji/ui/button';
import { nepalMoneyPreset } from '@punji/ui/money';
import { Stack } from '@punji/ui/stack';

// The amount is exact minor units (paisa). Your server checks the balance, the limit and the fee again.
export default function Example() {
  const [amount, setAmount] = useState<AmountKeypadChange>({ value: '', minorUnits: null, state: 'empty' });
  return (
    <Stack className="ex-narrow" align="center">
      <AmountKeypad label="Send to Sita Sharma" preset={nepalMoneyPreset} value={amount.value} onValueChange={setAmount} hint="Balance NPR 12,500.00" />
      <Button block size="lg" disabled={!amount.minorUnits}>Continue</Button>
    </Stack>
  );
}
