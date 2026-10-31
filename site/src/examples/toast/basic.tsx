import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { ToastProvider, useToast } from '@punji/ui/overlay';

// Wrap the app once in ToastProvider (near the root); call useToast() anywhere below it.
// Three toasts at most are visible; each leaves by itself (4 s, or 6 s when it carries an action).
function Buttons() {
  const toast = useToast();
  const [undone, setUndone] = useState(false);
  return (
    <div className="ex-stack">
      <div className="ex-row">
        <Button variant="secondary" onClick={() => toast.show('success', 'Transaction saved')}>
          Success
        </Button>
        <Button variant="secondary" onClick={() => toast.show('error', 'Could not save', { body: ' The server did not respond.' })}>
          Error
        </Button>
        <Button variant="secondary" onClick={() => toast.show('info', 'Prices are delayed by 15 minutes')}>
          Info
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setUndone(false);
            toast.show('success', 'Holding removed', { action: { label: 'Undo', run: () => setUndone(true) } });
          }}
        >
          With undo
        </Button>
      </div>
      <p role="status" className="doc-muted">
        {undone ? 'Undone' : ''}
      </p>
    </div>
  );
}

export default function Example() {
  return (
    <ToastProvider>
      <Buttons />
    </ToastProvider>
  );
}
