import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { AlertDialog } from '@punji/ui/dialog';

// match: the reader types the word before the danger button works. The field takes first focus; Enter confirms.
export default function Example() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Close account</Button>
      <AlertDialog
        open={open}
        strength="danger"
        title="Close your account?"
        body="Your holdings history is removed and cannot be restored."
        confirmLabel="Close account"
        match="CLOSE"
        matchLabel="Type CLOSE to confirm"
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}
