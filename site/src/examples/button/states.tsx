import { useState } from 'react';
import { Button } from '@punji/ui/button';

export default function Example() {
  const [busy, setBusy] = useState(false);
  return (
    <div className="ex-row">
      <Button
        loading={busy}
        onClick={() => {
          setBusy(true);
          setTimeout(() => setBusy(false), 1500);
        }}
      >
        {busy ? 'Saving' : 'Save'}
      </Button>
      <Button disabled>Disabled</Button>
      <Button variant="secondary" iconOnly label="Add a holding" icon={<span aria-hidden="true">+</span>} />
    </div>
  );
}
