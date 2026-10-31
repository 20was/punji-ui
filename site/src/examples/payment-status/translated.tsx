import { PaymentStatus } from '@punji/ui/payment-status';
import { Cluster } from '@punji/ui/stack';

export default function Example() {
  const labels = { paid: 'भुक्तानी भयो', partial: 'आंशिक भुक्तानी', unpaid: 'भुक्तानी बाँकी', overdue: 'म्याद नाघेको', void: 'रद्द' };
  return (
    <Cluster lang="ne">
      <PaymentStatus status="paid" labels={labels} />
      <PaymentStatus status="partial" labels={labels} />
      <PaymentStatus status="overdue" labels={labels} />
    </Cluster>
  );
}
