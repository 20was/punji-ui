import { PaymentStatus } from '@punji/ui/payment-status';
import { paymentStatuses } from '../../sample.ts';

// Each status has its own icon shape and its words; void is also struck through.
export default function Example() {
  return (
    <div className="ex-row">
      {paymentStatuses.map((status) => <PaymentStatus key={status} status={status} />)}
      {paymentStatuses.map((status) => <PaymentStatus key={`sm-${status}`} status={status} size="sm" />)}
    </div>
  );
}
