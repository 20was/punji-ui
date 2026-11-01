import { PaymentReceipt } from '@punji/ui/payment-receipt';
import { receipt } from '../../sample.ts';

// Same instant, printed in UTC and labelled as such. Another currency: any ISO 4217 code and locale work.
export default function Example() {
  return (
    <div style={{ display: 'grid', gap: '16px 20px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))' }}>
      <PaymentReceipt {...receipt} fees={undefined} status="failed" timeZone="UTC" note={undefined} />
      <PaymentReceipt {...receipt} amount={25000n} fees={150n} money={{ currency: 'USD', locale: 'en-US' }} locale="en-US" timeZone="America/New_York" />
    </div>
  );
}
