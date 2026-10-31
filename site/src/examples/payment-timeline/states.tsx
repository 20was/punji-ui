import { PaymentTimeline } from '@punji/ui/payment-timeline';
import { timelineCompleted, timelineFailed, timelineInProgress, timelineReversed } from '../../sample.ts';

export default function Example() {
  return (
    <div className="ex-grid">
      <PaymentTimeline steps={timelineCompleted} label="Completed payment" />
      <PaymentTimeline steps={timelineInProgress} label="Payment in progress" />
      <PaymentTimeline steps={timelineFailed} label="Failed payment" />
      <PaymentTimeline steps={timelineReversed} label="Reversed payment" timeZone="UTC" />
    </div>
  );
}
