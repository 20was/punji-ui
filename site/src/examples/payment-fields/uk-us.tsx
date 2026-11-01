import { useState } from 'react';
import { AbaRoutingInput, SortCodeInput, UkAccountNumberInput } from '@punji/ui/payment-fields';
import { Stack } from '@punji/ui/stack';

// Sort codes group as 12-34-56. The routing number's check digit is tested: 011000015 passes, 011000016 does not.
export default function Example() {
  const [sortCode, setSortCode] = useState('');
  const [account, setAccount] = useState('');
  const [routing, setRouting] = useState('');
  return (
    <Stack className="ex-narrow">
      <SortCodeInput label="Sort code" value={sortCode} onValueChange={(r) => setSortCode(r.value)} />
      <UkAccountNumberInput label="Account number" padShort value={account} onValueChange={(r) => setAccount(r.value)} />
      <AbaRoutingInput label="Routing number (ABA)" value={routing} onValueChange={(r) => setRouting(r.value)} />
    </Stack>
  );
}
