import { useState } from 'react';
import { AmountKeypad } from '@punji/ui/amount-keypad';
import { nepalMoneyConfig } from '@punji/ui/money';

// Quick amounts in paisa: Rs 100, 200, 500, 1,000 and 10,000. The Rs 5,000 limit would come from your server.
const quick = [10000n, 20000n, 50000n, 100000n, 1000000n];

export default function Example() {
  const [value, setValue] = useState('');
  return (
    <div className="ex-narrow">
      <AmountKeypad label="Top-up amount" preset={nepalMoneyConfig({ language: 'ne', digits: 'deva' })} value={value} onValueChange={(c) => setValue(c.value)} quickAmounts={quick} max={500000n} allowDecimal={false} hint="Ncell prepaid · up to Rs 5,000" />
    </div>
  );
}
