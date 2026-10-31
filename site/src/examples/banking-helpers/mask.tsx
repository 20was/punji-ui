import { accountNumberTail, formatAccountNumber, formatIban, formatTransactionReference, isValidIban, maskAccountNumber } from '@punji/ui/banking';
import { exampleIban, sampleAccountNumber } from '../../sample.ts';

// Pure functions: the same results server-side. Masking is display-only, not access control.
export default function Example() {
  const rows: [string, string][] = [
    ['maskAccountNumber(n)', maskAccountNumber(sampleAccountNumber)],
    ['maskAccountNumber(n, { groupSize: 4 })', maskAccountNumber(sampleAccountNumber, { groupSize: 4 })],
    ['maskAccountNumber("1234") (never fully shown)', maskAccountNumber('1234')],
    ['accountNumberTail(n)', accountNumberTail(sampleAccountNumber)],
    ['formatAccountNumber(n)', formatAccountNumber(sampleAccountNumber)],
    ['isValidIban(example)', String(isValidIban(exampleIban))],
    ['isValidIban(one digit changed)', String(isValidIban('GB82 WEST 1234 5698 7654 33'))],
    ['formatIban("gb82west12345698765432")', formatIban('gb82west12345698765432')],
    ['formatTransactionReference(hostile, { maxLength: 12 })', formatTransactionReference('  FT25‮314XK92Q4B7NLM3 ', { maxLength: 12 })],
  ];
  return (
    <dl className="ex-grid">
      {rows.map(([call, result]) => <div key={call}><dt>{call}</dt><dd>{result}</dd></div>)}
    </dl>
  );
}
