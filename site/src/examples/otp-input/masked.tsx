import { useState } from 'react';
import { OtpInput } from '@punji/ui/otp-input';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  const [pin, setPin] = useState('');
  return (
    <Stack style={{ width: 'min(100%, 440px)', marginInline: 'auto' }}>
      <OtpInput label="Transaction PIN" hint="The 4-digit PIN for your trading account" length={4} mask name="pin" value={pin} onChange={setPin} />
      <p className="doc-muted">Entered: <code>{'•'.repeat(pin.length) || '(none)'}</code></p>
    </Stack>
  );
}
