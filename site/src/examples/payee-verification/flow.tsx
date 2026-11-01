import { useState } from 'react';
import { Field } from '@punji/ui/fields';
import { PayeeVerification } from '@punji/ui/payee-verification';
import { Stack } from '@punji/ui/stack';

// In your app the result comes from your server, which asks the scheme. Here the "bank" holds one name.
const ACCOUNT_NAME = 'Ram Bahadur Thapa';

export default function Example() {
  const [name, setName] = useState('Ram B Thapa');
  const result = name.trim() === ACCOUNT_NAME ? 'match' : 'close-match';
  return (
    <Stack className="ex-narrow">
      <Field label="Name on the account" value={name} onChange={setName} />
      <PayeeVerification result={result} enteredName={name} accountName={ACCOUNT_NAME} onUseAccountName={setName} />
    </Stack>
  );
}
