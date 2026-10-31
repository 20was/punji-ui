import { useState } from 'react';
import { OtpInput } from '@punji/ui/otp-input';

export default function Example() {
  const [code, setCode] = useState('4829');
  const [recovery, setRecovery] = useState('');
  return (
    <div className="ex-stack ex-narrow">
      <OtpInput label="Verification code" length={6} value={code} onChange={setCode} error="That code has expired. Request a new one." />
      <OtpInput label="Recovery code" hint="Letters and digits, 8 characters" length={8} type="alphanumeric" size="md" value={recovery} onChange={setRecovery} />
    </div>
  );
}
