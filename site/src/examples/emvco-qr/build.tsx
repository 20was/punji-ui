import { useState } from 'react';
import { buildMerchantQr } from '@punji/ui/emvco-qr';
import { CurrencyInput, type CurrencyInputChange } from '@punji/ui/currency-input';
import { QrCode } from '@punji/ui/qr-code';
import { CodeBlock } from '@punji/ui/code-block';
import { nepalMoneyPreset } from '@punji/ui/money';
import { Stack } from '@punji/ui/stack';

// Invented merchant. In a real app the account template (id 26: GUID and merchant id) comes from your acquirer.
const account = { id: '26', guid: 'np.com.example.pay', fields: { '01': 'M00012345', '02': 'T01' } };

export default function Example() {
  const [amount, setAmount] = useState<CurrencyInputChange>({ value: '1250.50', minorUnits: 125050n, state: 'valid' });
  const minor = amount.minorUnits !== null && amount.minorUnits > 0n ? amount.minorUnits : null;
  const payload = buildMerchantQr({
    merchantAccounts: [account], merchantName: 'Himalayan Momo House', merchantCity: 'Kathmandu', merchantCategoryCode: '5812',
    amount: minor, additionalData: { billNumber: 'INV-2082-0142', terminalLabel: 'T01' },
  });
  return (
    <Stack className="ex-narrow">
      <CurrencyInput label="Amount (optional)" preset={nepalMoneyPreset} value={amount.value} onValueChange={setAmount} hint={minor === null ? 'Static code: the payer enters the amount' : 'Dynamic code for this bill'} />
      <QrCode value={payload} label={`QR code to pay Himalayan Momo House${minor === null ? '' : ` NPR ${amount.value}`}`} size={200} />
      <CodeBlock label="Payload">{payload}</CodeBlock>
    </Stack>
  );
}
