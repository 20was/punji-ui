import { useState } from 'react';
import { ScamWarning } from '@punji/ui/scam-warning';

export default function Example() {
  const [cancelled, setCancelled] = useState(false);
  if (cancelled) return <p role="status">Payment cancelled. Nothing was sent.</p>;
  return (
    <ScamWarning
      scenario="safe-account"
      onCancel={() => setCancelled(true)}
      help="Worried? Call our fraud team on 01-234567, any time."
    />
  );
}
