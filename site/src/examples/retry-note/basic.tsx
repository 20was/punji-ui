import { useState } from 'react';
import { RetryNote } from '@punji/ui/retry-note';

export default function Example() {
  const [tries, setTries] = useState(0);
  return (
    <div className="ex-stack">
      <RetryNote retryLabel="Try again" onRetry={() => setTries((n) => n + 1)}>
        Could not load your holdings.
      </RetryNote>
      <p>Retry pressed {tries} times.</p>
    </div>
  );
}
