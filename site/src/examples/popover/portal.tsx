import { useRef, useState } from 'react';
import { Button } from '@punji/ui/button';
import { Field } from '@punji/ui/fields';
import { Popover, type PopoverCloseReason } from '@punji/ui/popover';

// portal: the panel floats above everything, so a clipping ancestor (a scroll box, a card with
// overflow hidden) cannot cut it off. It flips above the anchor when there is no room below.
export default function Example() {
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState('');
  const [target, setTarget] = useState('500');
  const anchor = useRef<HTMLButtonElement>(null);
  const close = (reason: PopoverCloseReason) => {
    setWhy(reason);
    setOpen(false);
  };
  return (
    <div className="ex-stack">
      <div style={{ overflow: 'hidden', border: '1px solid var(--pu-color-card-border)', borderRadius: 'var(--pu-radius-control)', padding: 'var(--pu-space-3)' }}>
        <Button ref={anchor} variant="secondary" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          Set alert
        </Button>
        <Popover portal width={280} open={open} anchor={anchor} onClose={close} label="Set price alert" align="start" initialFocus="input">
          <div className="ex-stack" style={{ padding: 'var(--pu-space-3)' }}>
            <Field label="Alert at (NPR)" value={target} onChange={setTarget} inputMode="decimal" />
            <Button onClick={() => close('blur')}>Save alert</Button>
          </div>
        </Popover>
      </div>
      <p className="doc-muted" role="status">
        {why ? `Closed by: ${why}` : 'Open it, then try Esc, a click outside, or Tab past the end.'}
      </p>
    </div>
  );
}
