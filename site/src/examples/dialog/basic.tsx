import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Dialog } from '@punji/ui/dialog';
import { Cluster, Stack } from '@punji/ui/stack';

// A Dialog holds a short task. Esc, the scrim and the hidden close button dismiss it; focus returns to the opener.
export default function Example() {
  const [open, setOpen] = useState(false);
  return (
    <Stack>
      <Cluster>
        <Button onClick={() => setOpen(true)} aria-haspopup="dialog">
          Order terms
        </Button>
      </Cluster>
      <Dialog
        open={open}
        title="Order terms"
        body="Orders are matched at the end of the call auction."
        onClose={() => setOpen(false)}
        actions={<Button block onClick={() => setOpen(false)}>Got it</Button>}
      >
        <p>Brokerage, SEBON fee and DP charge are added when the order settles.</p>
      </Dialog>
    </Stack>
  );
}
