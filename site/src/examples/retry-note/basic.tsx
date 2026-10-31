import { useState } from 'react';
import { Card } from '@punji/ui/card';
import { RetryNote } from '@punji/ui/retry-note';

export default function Example() {
  const [tries, setTries] = useState(0);
  return (
    <Card title="Holdings" description="NIC Asia Bank portfolio" headingLevel={3}>
      <RetryNote retryLabel="Try again" onRetry={() => setTries((n) => n + 1)}>
        Could not load your holdings.
      </RetryNote>
      <p role="status">{tries > 0 ? `Retried ${tries} ${tries === 1 ? 'time' : 'times'}` : ''}</p>
    </Card>
  );
}
