import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Drawer } from '@punji/ui/drawer';
import { Field, NumberField } from '@punji/ui/fields';
import { Cluster, Stack } from '@punji/ui/stack';

// A modal side panel: the page behind is inert to the pointer, Tab stays inside, Esc and the scrim close it,
// and focus returns to the button that opened it. Focus starts on the panel; Tab reaches the first field.
export default function Example() {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState('NABIL');
  const [units, setUnits] = useState('10');
  return (
    <>
      <Button onClick={() => setOpen(true)} aria-haspopup="dialog">
        Add transaction
      </Button>
      <Drawer open={open} label="Add transaction" onClose={() => setOpen(false)}>
        <Stack style={{ padding: 'var(--pu-space-4)' }}>
          <h2 style={{ margin: 0 }}>Add transaction</h2>
          <Field label="Symbol" value={symbol} onChange={setSymbol} />
          <NumberField integer label="Units" value={units} onChange={setUnits} />
          <Cluster>
            <Button onClick={() => setOpen(false)}>Save</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </Cluster>
        </Stack>
      </Drawer>
    </>
  );
}
