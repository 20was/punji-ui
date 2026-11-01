import { useState } from 'react';
import { BoidInput, type BoidInputChange } from '@punji/ui/boid-input';

// The value is always ASCII digits; `check` says whether the shape is right and splits the DP ID from the client ID.
export default function Example() {
  const [change, setChange] = useState<BoidInputChange>({ value: '', check: { ok: false, problem: 'empty', digits: 0 } });
  return (
    <div className="ex-narrow">
      <BoidInput value={change.value} onValueChange={setChange} />
      <p className="ex-label">{change.check.ok ? `DP code ${change.check.parts.dpCode}` : `${change.check.digits} of 16 digits`}</p>
    </div>
  );
}
