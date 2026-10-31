import { PaymentReceipt } from '@punji/ui/payment-receipt';
import { qrPlaceholderPath, receipt } from '../../sample.ts';

// The QR slot takes whatever you render. This is a stand-in drawing, not a real code: generate yours on the server or with your own encoder.
export default function Example() {
  return (
    <PaymentReceipt
      {...receipt}
      timeZone="Asia/Kathmandu"
      printable
      qr={<svg width="140" height="140" viewBox="0 0 20 20" role="img" aria-label="Payment QR code" fill="currentColor"><path d={qrPlaceholderPath} /></svg>}
    />
  );
}
