import { Card } from '@punji/ui/card';
import { PaymentStatus } from '@punji/ui/payment-status';
import { DataRow, DataRows } from '@punji/ui/rows';
import { paymentStatuses } from '../../sample.ts';

const invoices = ['INV-2082-041', 'INV-2082-042', 'INV-2082-043', 'INV-2082-044', 'INV-2082-045'];

// Each status has its own icon shape and its words; void is also struck through.
// size="sm" fits a table row.
export default function Example() {
  return (
    <Card title="Invoices" description="Himalayan Stationers Pvt. Ltd." headingLevel={3}>
      <DataRows label="Invoice status">
        {paymentStatuses.map((status, i) => (
          <DataRow key={status} label={invoices[i]!} value={<PaymentStatus status={status} />} />
        ))}
        <DataRow label="INV-2082-046" value={<PaymentStatus status="paid" size="sm" />} />
      </DataRows>
    </Card>
  );
}
