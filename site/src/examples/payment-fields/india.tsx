import { useState } from 'react';
import { IfscInput, UpiInput } from '@punji/ui/payment-fields';
import { Stack } from '@punji/ui/stack';

// Paste "upi://pay?pa=paypa1%40ybl&pn=Shop" into the UPI field: the address is read from the link and, because it
// looks like the saved payee paypal@ybl without being it, an alert asks the person to check.
export default function Example() {
  const [vpa, setVpa] = useState('');
  const [ifsc, setIfsc] = useState('');
  return (
    <Stack className="ex-narrow">
      <UpiInput label="UPI ID" value={vpa} onValueChange={(r) => setVpa(r.value)} knownPayees={['paypal@ybl', 'ram.sharma@okaxis']} />
      <IfscInput label="IFSC" value={ifsc} onValueChange={(r) => setIfsc(r.value)} />
    </Stack>
  );
}
