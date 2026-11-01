import { useState } from 'react';
import { BicInput, IbanInput } from '@punji/ui/payment-fields';
import type { IbanCheck } from '@punji/ui/payments';
import { Stack } from '@punji/ui/stack';

// Paste "GB82 WEST 1234 5698 7654 32" or type it: it groups in fours, the country is announced, and the
// mod-97 check runs once it is complete. The stored value has no spaces.
export default function Example() {
  const [iban, setIban] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [bic, setBic] = useState('');
  return (
    <Stack className="ex-narrow">
      <IbanInput label="Recipient IBAN" value={iban} onValueChange={(r: IbanCheck) => { setIban(r.value); setCountry(r.country); }} />
      <BicInput label="SWIFT/BIC" value={bic} onValueChange={(r) => setBic(r.value)} />
      <p className="doc-muted">Stored: <code>{iban || '—'}</code> {country && <>· country <code>{country}</code></>}</p>
    </Stack>
  );
}
