import { useState } from 'react';
import { PanInput } from '@punji/ui/pan-input';
import type { PanCheck } from '@punji/ui/tax';

// Spaces and hyphens are dropped and Devanagari digits converted; the message appears once the field is left.
// A valid shape is not proof the number exists: look it up on your server.
export default function Example() {
  const [check, setCheck] = useState<PanCheck>({ state: 'empty', value: '' });
  return (
    <div className="ex-stack ex-narrow">
      <PanInput label="Buyer PAN or VAT number" value={check.value} onValueChange={setCheck} />
      <p className="doc-muted">State: <code>{check.state}</code> · value <code>{check.value || "''"}</code></p>
    </div>
  );
}
