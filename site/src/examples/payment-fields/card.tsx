import { useState } from 'react';
import { CardCvcInput, CardExpiryInput, CardNumberInput } from '@punji/ui/payment-fields';
import type { CardBrand } from '@punji/ui/payments';
import { Cluster, Stack } from '@punji/ui/stack';

// Try 3782 8224 6310 005 (Amex: 4-6-5 grouping, a 4-digit code) or 4242 4242 4242 4242. Leave the field and the
// number shows as •••• and the last four. The number is never written to a DOM attribute, and nothing is logged.
export default function Example() {
  const [number, setNumber] = useState('');
  const [brand, setBrand] = useState<CardBrand | null>(null);
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  return (
    <Stack className="ex-narrow">
      <CardNumberInput label="Card number" value={number} onValueChange={(r) => { setNumber(r.value); setBrand(r.brand); }} accept={['visa', 'mastercard', 'amex', 'rupay', 'unionpay']} />
      <Cluster>
        <CardExpiryInput label="Expiry" value={expiry} onValueChange={(r) => setExpiry(r.value)} />
        <CardCvcInput label="Security code" brand={brand} value={cvc} onValueChange={(r) => setCvc(r.value)} />
      </Cluster>
    </Stack>
  );
}
