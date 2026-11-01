import { useState } from 'react';
import { MobileNumberInput } from '@punji/ui/mobile-number-input';
import type { NepalMobileResult } from '@punji/ui/nepal/mobile';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  const [result, setResult] = useState<NepalMobileResult | null>(null);
  return (
    <Stack className="ex-narrow">
      <MobileNumberInput label="Mobile number to top up" value={result?.national ?? ''} onValueChange={setResult} hint="NTC, Ncell or SmartCell prepaid and postpaid" />
      <p className="doc-muted" aria-live="polite">
        {result?.state === 'valid' ? `Ready: ${result.e164} on ${result.operator?.name ?? 'an unknown operator'}` : 'Enter a 10-digit number'}
      </p>
    </Stack>
  );
}
