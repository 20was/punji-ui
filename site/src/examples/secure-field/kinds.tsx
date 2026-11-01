import { useState } from 'react';
import { SecureField } from '@punji/ui/secure-field';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [account, setAccount] = useState('');
  return (
    <Stack className="ex-narrow">
      <SecureField label="Password" kind="current-password" value={password} onChange={setPassword} />
      <SecureField label="Code from SMS" kind="one-time-code" value={code} onChange={setCode} maxLength={6} hint="6 digits, sent to 98•• ••• 210" />
      <SecureField label="Account number" kind="account-number" value={account} onChange={setAccount} hint="Not saved by the browser" />
    </Stack>
  );
}
