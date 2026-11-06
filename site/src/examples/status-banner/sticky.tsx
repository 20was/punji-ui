import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { StatusBanner } from '@punji/ui/status-banner';

// The scroller reserves the banner's height with scroll-padding-top, so a focused control is never hidden
// behind the sticky banner (WCAG 2.4.11 Focus Not Obscured).
export default function Example() {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ maxBlockSize: 220, overflow: 'auto', scrollPaddingTop: 56, border: '1px solid var(--pu-color-border)' }}>
      <StatusBanner sticky tone="warn" open={open} onOpenChange={setOpen} dismissible title="Scheduled maintenance tonight.">
        Transfers pause from 23:00 to 23:30.
      </StatusBanner>
      <div style={{ display: 'grid', gap: 'var(--pu-space-3)', padding: 'var(--pu-space-4)' }}>
        {Array.from({ length: 8 }, (_, i) => <Button key={i} variant="secondary">Action {i + 1}</Button>)}
        {!open && <Button onClick={() => setOpen(true)}>Show the banner again</Button>}
      </div>
    </div>
  );
}
