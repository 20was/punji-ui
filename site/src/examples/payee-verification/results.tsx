import { useState } from 'react';
import { SegmentedControl } from '@punji/ui/controls';
import { PayeeVerification, type PayeeVerificationResult } from '@punji/ui/payee-verification';
import { Stack } from '@punji/ui/stack';

const RESULTS: { value: PayeeVerificationResult; label: string }[] = [
  { value: 'match', label: 'Match' },
  { value: 'close-match', label: 'Close' },
  { value: 'no-match', label: 'No match' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'checking', label: 'Checking' },
];

export default function Example() {
  const [result, setResult] = useState<PayeeVerificationResult>('close-match');
  return (
    <Stack className="ex-narrow">
      <SegmentedControl prefix="cop" label="Scheme answer" options={RESULTS} value={result} onChange={setResult} wrap />
      <PayeeVerification
        key={result}
        result={result}
        enteredName="Sita Sarma"
        accountName="Sita Sharma"
        onUseAccountName={() => setResult('match')}
        onEdit={() => {}}
        onProceed={() => {}}
      />
    </Stack>
  );
}
