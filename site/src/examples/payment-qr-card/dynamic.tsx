import { buildMerchantQr } from '@punji/ui/emvco-qr';
import { PaymentQrCard } from '@punji/ui/payment-qr-card';
import { nepalMoneyConfig } from '@punji/ui/money';

// A bill at a shop counter: the amount is in the code. Invented merchant and account.
const payload = buildMerchantQr({
  merchantAccounts: [{ id: '26', guid: 'np.com.example.pay', fields: { '01': 'M00012345', '02': 'T02' } }],
  merchantName: 'Bhatbhateni Store',
  merchantCity: 'Pokhara',
  merchantCategoryCode: '5411',
  amount: 348575n,
  additionalData: { billNumber: 'B-77120', terminalLabel: 'T02' },
});

export default function Example() {
  return <PaymentQrCard payload={payload} merchantName="भाटभटेनी स्टोर" detail="Counter 2 · Pokhara" money={nepalMoneyConfig()} labels={{ title: 'Pay this bill' }} />;
}
