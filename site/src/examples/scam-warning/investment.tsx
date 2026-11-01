import { useState } from 'react';
import { ScamWarning } from '@punji/ui/scam-warning';

export default function Example() {
  const [outcome, setOutcome] = useState<'open' | 'cancelled' | 'continued'>('open');
  if (outcome !== 'open') return <p role="status">{outcome === 'cancelled' ? 'Payment cancelled.' : 'Continued to payment.'}</p>;
  return <ScamWarning scenario="investment" coolingOffSeconds={5} onCancel={() => setOutcome('cancelled')} onProceed={() => setOutcome('continued')} />;
}
