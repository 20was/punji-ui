import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { AlertDialog } from '@punji/ui/dialog';
import { Cluster, Stack } from '@punji/ui/stack';

// An AlertDialog interrupts with a question that must be answered: focus starts on Cancel, Esc is Cancel, the scrim does nothing.
export default function Example() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Stack>
      <Cluster>
        <Button variant="danger" onClick={() => { setDone(false); setOpen(true); }} aria-haspopup="dialog">
          Close account
        </Button>
      </Cluster>
      <p role="status" style={{ margin: 0, fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)' }}>
        {done ? 'Account closed.' : 'Nothing happens until you confirm.'}
      </p>
      <AlertDialog
        open={open}
        destructive
        title="Close this account?"
        body="Its history is kept for seven years, but you can no longer trade from it."
        confirmLabel="Close account"
        onConfirm={() => { setDone(true); setOpen(false); }}
        onCancel={() => setOpen(false)}
      />
    </Stack>
  );
}
