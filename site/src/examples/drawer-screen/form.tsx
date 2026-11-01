import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Drawer } from '@punji/ui/drawer';
import { DrawerBody, DrawerFooter, DrawerHeader, DrawerScreen } from '@punji/ui/drawer-screen';
import { Field, NumberField } from '@punji/ui/fields';
import { Cluster, Stack } from '@punji/ui/stack';

// DrawerScreen as the form: Enter submits, the header carries the title and the close, the footer stays docked.
export default function Example() {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState('NABIL');
  const [units, setUnits] = useState('10');
  const [saved, setSaved] = useState('');
  return (
    <Stack>
      <Cluster>
        <Button onClick={() => setOpen(true)} aria-haspopup="dialog">
          Add transaction
        </Button>
      </Cluster>
      <p role="status" style={{ margin: 0, fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)' }}>
        {saved || 'Nothing saved yet.'}
      </p>
      <Drawer open={open} label="Add transaction" onClose={() => setOpen(false)}>
        <DrawerScreen
          as="form"
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(`Saved: buy ${units} ${symbol}`);
            setOpen(false);
          }}
        >
          <DrawerHeader title="Add transaction" closeLabel="Close" backLabel="Back" onClose={() => setOpen(false)} />
          <DrawerBody title="Buy" description="Brokerage and fees are added when it settles.">
            <Stack>
              <Field label="Symbol" value={symbol} onChange={setSymbol} />
              <NumberField integer label="Units" value={units} onChange={setUnits} />
            </Stack>
          </DrawerBody>
          <DrawerFooter note="Enter saves, Esc closes">
            <Button type="submit">Save</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerScreen>
      </Drawer>
    </Stack>
  );
}
