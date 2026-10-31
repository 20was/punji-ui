import { useState } from 'react';
import { OtpInput } from '@punji/ui/otp-input';

export default function Example() {
  const [pin, setPin] = useState('');
  return (
    <div className="ex-stack ex-narrow">
      <OtpInput label="Transaction PIN" hint="The 4-digit PIN for your trading account" length={4} mask name="pin" value={pin} onChange={setPin} />
      <p className="doc-muted">Entered: <code>{'•'.repeat(pin.length) || '(none)'}</code></p>
    </div>
  );
}
