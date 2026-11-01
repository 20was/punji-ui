import { useState } from 'react';
import { buildMerchantQr } from '@punji/ui/emvco-qr';
import { PaymentQrCard } from '@punji/ui/payment-qr-card';
import { Button } from '@punji/ui/button';

// A person's static "receive money" code. In your app the payload comes from your server; here it is built in place.
const base = {
  merchantAccounts: [{ id: '26', guid: 'np.com.example.pay', fields: { '01': 'P98410000' } }],
  merchantName: 'Sita Sharma',
  merchantCity: 'Lalitpur',
};

export default function Example() {
  const [amount, setAmount] = useState<bigint | null>(null);
  return (
    <PaymentQrCard
      payload={buildMerchantQr({ ...base, amount })}
      labels={{ title: 'Receive money' }}
      onAmountChange={setAmount}
      actions={<Button variant="secondary" size="sm">Share code</Button>}
      footer="Scan with any NepalPay QR app"
    />
  );
}
