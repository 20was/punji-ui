import { RemittanceTracker, type RemittanceDetails } from '@punji/ui/remittance-tracker';
import { remittanceSample } from '../../sample.ts';

// A stand-in for your server: any number ending in 0 is "not found"; anything else returns the sample after a short wait.
async function lookup(controlNumber: string, signal: AbortSignal): Promise<RemittanceDetails | null> {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 600);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
  });
  return controlNumber.endsWith('0') ? null : remittanceSample;
}

export default function Example() {
  return <RemittanceTracker onLookup={lookup} defaultControlNumber="1234567890125678" />;
}
