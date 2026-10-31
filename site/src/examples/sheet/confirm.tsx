import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Sheet } from '@punji/ui/overlay';

// A Sheet is a short, modal decision: a title, one line, one or two controls. Esc, the scrim and the hidden close button dismiss it.
export default function Example() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className="ex-stack">
      <div className="ex-row">
        <Button variant="danger" onClick={() => { setDone(false); setOpen(true); }} aria-haspopup="dialog">
          Sell 40 NTC
        </Button>
      </div>
      <p role="status" className="ex-label">
        {done ? 'Order sent: sell 40 NTC at NPR 842.00.' : 'The order is sent only when you confirm.'}
      </p>
      <Sheet open={open} title="Sell 40 NTC?" body="At NPR 842.00 a share, about NPR 33,680 before fees." onClose={() => setOpen(false)}>
        <Button block variant="danger" onClick={() => { setDone(true); setOpen(false); }}>
          Confirm sale
        </Button>
        <Button block variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </Sheet>
    </div>
  );
}
