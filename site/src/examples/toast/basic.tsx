import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { ToastProvider, useToast } from '@punji/ui/overlay';

// Wrap the app once in ToastProvider (near the root); call useToast() anywhere below it.
// Three toasts at most are visible; each leaves by itself (4 s, or 6 s when it carries an action).
function WatchlistActions() {
  const toast = useToast();
  const [restored, setRestored] = useState(false);
  return (
    <Card title="NABIL" description="Nabil Bank Limited, LTP Rs 487.50" headingLevel={3}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--pu-space-3)' }}>
        <Button onClick={() => toast.show('success', 'Order for 10 NABIL placed')}>Buy 10</Button>
        <Button variant="secondary" onClick={() => toast.show('error', 'Order not placed', { body: ' The broker did not respond. Try again.' })}>
          Sell 10
        </Button>
        <Button variant="secondary" onClick={() => toast.show('info', 'Prices are delayed by 15 minutes')}>
          Why is the price late?
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setRestored(false);
            toast.show('success', 'NABIL removed from watchlist', { action: { label: 'Undo', run: () => setRestored(true) } });
          }}
        >
          Remove
        </Button>
      </div>
      <p role="status">{restored ? 'NABIL is back on your watchlist' : ''}</p>
    </Card>
  );
}

export default function Example() {
  return (
    <ToastProvider>
      <WatchlistActions />
    </ToastProvider>
  );
}
