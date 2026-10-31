import { useState } from 'react';
import { divideRounded } from '@punji/ui/calculations';
import { formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import { PercentageInput, type PercentageInputChange } from '@punji/ui/percentage-input';

// Order value Rs 4,87,500.00 in paisa. The fee is value x basis points / 10,000, rounded half-up to the paisa:
// the field never rounds, you choose the mode.
const ORDER_VALUE = 48_750_000n;

export default function Example() {
  const [rate, setRate] = useState('0.4');
  const [change, setChange] = useState<PercentageInputChange | null>({ value: '0.4', state: 'valid', basisPoints: 40n, outOfRange: null });
  const fee = change?.basisPoints != null ? divideRounded(ORDER_VALUE * change.basisPoints, 10_000n, 'half-up') : null;
  return (
    <div className="ex-stack ex-narrow">
      <PercentageInput
        label="Brokerage rate"
        hint="Per trade, on the order value"
        value={rate}
        min="0"
        max="2"
        onValueChange={(next) => {
          setRate(next.value);
          setChange(next);
        }}
      />
      <p className="doc-muted">
        On {formatMoney(ORDER_VALUE, nepalMoneyConfig())}: fee {fee === null ? 'n/a' : formatMoney(fee, nepalMoneyConfig())} · <code>{change?.basisPoints == null ? 'null' : `${change.basisPoints}n`}</code> basis points
      </p>
    </div>
  );
}
