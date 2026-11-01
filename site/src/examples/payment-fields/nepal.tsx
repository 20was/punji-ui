import { useState } from 'react';
import { NepalBankAccountInput } from '@punji/ui/payment-fields';
import type { NepalBankAccountRule } from '@punji/ui/payments';
import { Stack } from '@punji/ui/stack';

// Rules are data you own: the bank's lengths, characters, prefix pattern and grouping. This one is an example,
// not a real bank's format. Type or paste Devanagari digits; the stored value is ASCII.
const exampleBank: NepalBankAccountRule = { id: 'example', name: 'Example Bank', lengths: [14], pattern: '^0\\d{2}', groups: [3, 4] };

export default function Example() {
  const [account, setAccount] = useState('');
  return (
    <Stack className="ex-narrow">
      <NepalBankAccountInput label="खाता नम्बर (Example Bank)" rule={exampleBank} digits="deva" value={account} onValueChange={(r) => setAccount(r.value)} hint="14 digits starting with 0" />
      <p className="doc-muted">Stored: <code>{account || '—'}</code></p>
    </Stack>
  );
}
