import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Delta } from '@punji/ui/figures';
import { Live } from '@punji/ui/live-figure';
import { Cluster } from '@punji/ui/stack';

// Live takes a render function, so any figure can move: a Delta, a signed amount, a figure inside a sentence.
// Put aria-live on a container that needs it, never on every cell. Put a test id on Live, never inside children.
export default function Example() {
  const [change, setChange] = useState(1.25);
  return (
    <Cluster>
      <span>
        Today <Live value={change} id="NABIL">{(n) => <Delta value={n} />}</Live>
      </span>
      <Button variant="secondary" onClick={() => setChange((c) => Math.round((c + 0.9) * 100) / 100)}>
        Rise
      </Button>
      <Button variant="secondary" onClick={() => setChange((c) => Math.round((c - 1.4) * 100) / 100)}>
        Fall
      </Button>
    </Cluster>
  );
}
