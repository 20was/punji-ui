import { Card } from '@punji/ui/card';
import {
  maskCardNumber, parseAbaRouting, parseBic, parseCardExpiry, parseCardNumber, parseIban, parseIfsc, parseSortCode, parseUpiVpa, type PaymentCheck,
} from '@punji/ui/payments';
import { DataRow, DataRows } from '@punji/ui/rows';

// Pure checks: no React needed. Each returns { state, value, display, reason, cleaned }.
const show = (r: PaymentCheck) => `${r.state}${r.reason ? ` (${r.reason})` : ''}: ${r.display}`;
const today = { year: 2026, month: 11 };

export default function Example() {
  const card = parseCardNumber('3782 8224 6310 005');
  return (
    <Card title="Payment identifier checks" headingLevel={3}>
      <DataRows label="Checks">
        <DataRow label="IBAN, pasted" value={show(parseIban('iban gb82-west-1234-5698-7654-32'))} />
        <DataRow label="IBAN, one digit wrong" value={show(parseIban('GB82WEST12345698765433'))} />
        <DataRow label="Card number" value={`${show(card)} · ${card.brand?.name}`} />
        <DataRow label="Card, masked" value={maskCardNumber(card.value)} />
        <DataRow label="Expiry 10/26" value={show(parseCardExpiry('10/26', { today }))} />
        <DataRow label="SWIFT/BIC" value={show(parseBic('narbnpka'))} />
        <DataRow label="IFSC" value={show(parseIfsc('sbin0001234'))} />
        <DataRow label="UPI link" value={show(parseUpiVpa('upi://pay?pa=shop%40ybl'))} />
        <DataRow label="Sort code, Devanagari" value={show(parseSortCode('१२-३४-५६'))} />
        <DataRow label="ABA 011000016" value={show(parseAbaRouting('011000016'))} />
      </DataRows>
    </Card>
  );
}
