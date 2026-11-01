import { useState } from 'react';
import { buildMerchantQr } from '@punji/ui/emvco-qr';
import { PaymentQrCard } from '@punji/ui/payment-qr-card';
import { Cluster } from '@punji/ui/stack';

const payload = buildMerchantQr({
  merchantAccounts: [{ id: '26', guid: 'np.com.example.pay', fields: { '01': 'M00012345' } }],
  merchantName: 'Thamel Books',
  merchantCity: 'Kathmandu',
  amount: 95000n,
});

export default function Example() {
  const [expired, setExpired] = useState(true);
  return (
    <Cluster gap={4} justify="center" align="start">
      <PaymentQrCard payload={payload} qrSize={160} state={expired ? 'expired' : 'ready'} onRefresh={() => setExpired(false)} />
      {/* One character edited: the CRC no longer matches, so the card refuses to draw it. */}
      <PaymentQrCard payload={payload.replace('Thamel', 'Thamal')} qrSize={160} />
      <PaymentQrCard payload="" state="loading" qrSize={160} />
    </Cluster>
  );
}
