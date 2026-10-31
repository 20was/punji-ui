import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Drawer } from '@punji/ui/drawer';
import { DrawerBody, DrawerFooter, DrawerHeader, DrawerScreen } from '@punji/ui/drawer-screen';
import { Field, NumberField } from '@punji/ui/fields';

// DrawerScreen as the form: Enter submits, the header carries the title and the close, the footer stays docked.
export default function Example() {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState('NABIL');
  const [units, setUnits] = useState('10');
  const [saved, setSaved] = useState('');
  return (
    <div className="ex-stack">
      <div className="ex-row">
        <Button onClick={() => setOpen(true)} aria-haspopup="dialog">
          Add transaction
        </Button>
      </div>
      <p role="status" className="ex-label">
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
            <div className="ex-stack">
              <Field label="Symbol" value={symbol} onChange={setSymbol} />
              <NumberField integer label="Units" value={units} onChange={setUnits} />
            </div>
          </DrawerBody>
          <DrawerFooter note="Enter saves, Esc closes">
            <Button type="submit">Save</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerScreen>
      </Drawer>
    </div>
  );
}
