import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';

// loading keeps the button's size, sets aria-busy and ignores clicks, so a transfer cannot be sent twice.
export default function Example() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <Card title="Transfer Rs 20,000" description="From NIC Asia Bank to Ram Thapa" headingLevel={3}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--pu-space-3)', alignItems: 'center' }}>
        <Button
          loading={busy}
          disabled={sent}
          onClick={() => {
            setBusy(true);
            setTimeout(() => {
              setBusy(false);
              setSent(true);
            }, 1500);
          }}
        >
          {busy ? 'Sending' : sent ? 'Sent' : 'Send money'}
        </Button>
        <Button variant="secondary" iconOnly label="Add a beneficiary" icon={<span aria-hidden="true">+</span>} />
      </div>
      <p role="status">{sent ? 'Transfer reference FT25314XK92Q4B7' : ''}</p>
    </Card>
  );
}
