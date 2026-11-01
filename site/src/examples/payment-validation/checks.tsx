import { Card } from '@punji/ui/card';
import {
  maskCardNumber, parseAbaRouting, parseBic, parseCardExpiry, parseCardNumber, parseIban, parseIfsc, parseSortCode, parseUpiVpa, type PaymentCheck,
} from '@punji/ui/payments';
import { DataRow, DataRows } from '@punji/ui/rows';

// Pure checks: no React needed. Each returns { state, value, display, reason, cleaned }.
const show = (r: PaymentCheck) => `${r.state}${r.reason ? ` (${r.reason})` : ''}`;
const today = { year: 2026, month: 11 };

export default function Example() {
  const card = parseCardNumber('3782 8224 6310 005');
  return (
    <Card title="Payment identifier checks" headingLevel={3}>
      <DataRows label="Checks">
        <DataRow label="Pasted IBAN" value={show(parseIban('iban gb82-west-1234-5698-7654-32'))} />
        <DataRow label="IBAN, one slip" value={show(parseIban('GB82WEST12345698765433'))} />
        <DataRow label="Amex number" value={`${show(card)}, ${card.brand?.id}`} />
        <DataRow label="Masked" value={maskCardNumber(card.value)} />
        <DataRow label="Expiry 10/26" value={show(parseCardExpiry('10/26', { today }))} />
        <DataRow label="BIC narbnpka" value={show(parseBic('narbnpka'))} />
        <DataRow label="IFSC" value={show(parseIfsc('sbin0001234'))} />
        <DataRow label="UPI link" value={parseUpiVpa('upi://pay?pa=shop%40ybl').value} />
        <DataRow label="Sort code १२-३४-५६" value={parseSortCode('१२-३४-५६').display} />
        <DataRow label="ABA 011000016" value={show(parseAbaRouting('011000016'))} />
      </DataRows>
    </Card>
  );
}
