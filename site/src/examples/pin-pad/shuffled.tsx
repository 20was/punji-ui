import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { PinPad } from '@punji/ui/pin-pad';

function FingerprintButton() {
  return (
    <Button variant="ghost" size="lg" iconOnly label="Use fingerprint">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 11v4M8.5 9.5a4 4 0 0 1 7 2.5v2M7 13v-1a5 5 0 0 1 10 0v4M5 10a7 7 0 0 1 14 0v3M10 15c0 2 .5 3.5 1.5 5M14 16c0 1.5-.3 3-1 4.5" />
      </svg>
    </Button>
  );
}

// Each attempt draws a new key order (crypto-random). The fingerprint key is your own button.
export default function Example() {
  const [pin, setPin] = useState('');
  const [attempt, setAttempt] = useState(1);
  return (
    <div className="ex-narrow">
      <PinPad
        label="Enter your MPIN"
        length={6}
        shuffle
        shuffleKey={attempt}
        value={pin}
        onChange={setPin}
        onComplete={() => { setPin(''); setAttempt((n) => n + 1); }}
        hint={`Attempt ${attempt}: the keys move after each PIN`}
        extraKey={<FingerprintButton />}
      />
    </div>
  );
}
