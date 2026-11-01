import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { SegmentedControl } from '@punji/ui/controls';
import { PayeeCheck, payeeCheckAllowsProceed, type PayeeCheckResult } from '@punji/ui/payee-check';

const RESULTS: { value: PayeeCheckResult; label: string }[] = [
  { value: 'match', label: 'Match' },
  { value: 'close', label: 'Close' },
  { value: 'no-match', label: 'No match' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'checking', label: 'Checking' },
  { value: 'error', label: 'Error' },
];

export default function Example() {
  const [result, setResult] = useState<PayeeCheckResult>('close');
  const [name, setName] = useState('H. B. Khatri');
  const [acknowledged, setAcknowledged] = useState(false);
  const allowed = payeeCheckAllowsProceed(result, acknowledged);
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 520 }}>
      <SegmentedControl
        options={RESULTS}
        value={result}
        onChange={(next) => {
          setResult(next);
          setAcknowledged(false);
        }}
        prefix="payee-result"
        label="Result from the bank"
        size="sm"
        wrap
      />
      <PayeeCheck
        result={result}
        enteredName={name}
        registeredName="Hari Bahadur Khatri"
        institution="Nabil Bank"
        accountNumber="0010 0170 0450 9012"
        onUseRegisteredName={() => {
          setName('Hari Bahadur Khatri');
          setResult('match');
        }}
        onEdit={() => setName('H. B. Khatri')}
        onRetry={() => setResult('match')}
        acknowledged={acknowledged}
        onAcknowledgedChange={setAcknowledged}
      />
      <div>
        <Button disabled={!allowed}>Continue</Button>
      </div>
    </div>
  );
}
