import { useState } from 'react';
import { PinPad } from '@punji/ui/pin-pad';

// There is no network here. In your app onComplete sends the PIN to your server, which decides whether it is right.
const DEMO_PIN = '2580';

export default function Example() {
  const [pin, setPin] = useState('');
  const [result, setResult] = useState<'idle' | 'ok' | 'wrong'>('idle');
  return (
    <div className="ex-narrow">
      <PinPad
        label="Enter your 4-digit PIN"
        value={pin}
        onChange={(next) => { setPin(next); if (next) setResult('idle'); }}
        onComplete={(full) => { setResult(full === DEMO_PIN ? 'ok' : 'wrong'); setPin(''); }}
        error={result === 'wrong' ? 'Wrong PIN. 2 attempts left.' : undefined}
        hint={result === 'ok' ? 'Payment confirmed.' : 'To pay NPR 1,250.50 to Himalayan Momo'}
      />
    </div>
  );
}
