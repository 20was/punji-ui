import { useRef, useState } from 'react';
import { Button } from '@punji/ui/button';
import { Popover, PopoverAnchor } from '@punji/ui/popover';

// The control and the panel share one PopoverAnchor, which the panel is placed against.
// Esc closes it and returns focus to the button; a click outside closes it; so does Tab past the end.
export default function Example() {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <div style={{ minHeight: '11rem' }}>
      <PopoverAnchor>
        <Button ref={anchor} variant="secondary" aria-haspopup="dialog" aria-expanded={open} aria-controls="pop-sort" onClick={() => setOpen((v) => !v)}>
          Sort by
        </Button>
        <Popover open={open} anchor={anchor} onClose={() => setOpen(false)} label="Sort by" id="pop-sort" align="start">
          <div className="ex-stack" style={{ padding: 'var(--pu-space-3)' }}>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Symbol
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Change
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Turnover
            </Button>
          </div>
        </Popover>
      </PopoverAnchor>
    </div>
  );
}
