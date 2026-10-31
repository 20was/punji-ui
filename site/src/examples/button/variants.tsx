import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { DataRow, DataRows } from '@punji/ui/rows';

const actions = { display: 'flex', flexWrap: 'wrap', gap: 'var(--pu-space-3)' } as const;

// primary: the one action the screen is for. secondary: a safe alternative. ghost: dismiss.
// danger: only for what cannot be undone. Give href and the same styles render a link.
export default function Example() {
  return (
    <Card title="Buy 10 NABIL" description="Limit order at Rs 487.50" headingLevel={3}>
      <DataRows label="Order summary">
        <DataRow label="Amount" value="Rs 4,875.00" />
        <DataRow label="Broker commission" value="Rs 19.50" />
        <DataRow label="Total" total value="Rs 4,894.50" />
      </DataRows>
      <div style={actions}>
        <Button variant="primary">Place order</Button>
        <Button variant="secondary">Save draft</Button>
        <Button variant="ghost">Cancel</Button>
      </div>
      <div style={actions}>
        <Button variant="danger">Close account</Button>
        <Button variant="secondary" href="https://example.com/fees">Fee schedule</Button>
      </div>
    </Card>
  );
}
