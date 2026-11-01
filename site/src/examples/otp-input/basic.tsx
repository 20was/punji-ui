import { useState } from 'react';
import { OtpInput } from '@punji/ui/otp-input';
import { Stack } from '@punji/ui/stack';

// There is no network here. In your app onComplete sends the code to your server, which decides whether it is right.
const DEMO_CODE = '482913';

export default function Example() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<'idle' | 'ok' | 'wrong'>('idle');
  return (
    <Stack style={{ width: 'min(100%, 440px)', marginInline: 'auto' }}>
      <OtpInput
        label="Verification code"
        hint="Sent by SMS to 98XXXXXX12"
        value={code}
        onChange={(next) => {
          setCode(next);
          setResult('idle');
        }}
        onComplete={(full) => setResult(full === DEMO_CODE ? 'ok' : 'wrong')}
        error={result === 'wrong' ? 'That code is not right. Check the SMS and try again.' : undefined}
      />
      <p className="doc-muted">{result === 'ok' ? 'Transfer confirmed.' : <>Demo code: <code>{DEMO_CODE}</code> (paste it, or type it)</>}</p>
    </Stack>
  );
}
