import { useState } from 'react';
import { PercentageInput, type PercentageInputChange } from '@punji/ui/percentage-input';

export default function Example() {
  const [rate, setRate] = useState('26');
  const [state, setState] = useState<PercentageInputChange['outOfRange']>('above');
  return (
    <div className="ex-stack ex-narrow">
      <PercentageInput
        label="Loan interest rate"
        hint="Between 0% and 24% a year"
        value={rate}
        min="0"
        max="24"
        maxFractionDigits={2}
        onValueChange={(change) => {
          setRate(change.value);
          setState(change.outOfRange);
        }}
        rangeMessage={({ max }) => `The rate cannot be more than ${max}% a year. Check with your bank.`}
      />
      <p className="doc-muted">Out of range: <code>{state ?? 'no'}</code>. Click away to see the message.</p>
    </div>
  );
}
