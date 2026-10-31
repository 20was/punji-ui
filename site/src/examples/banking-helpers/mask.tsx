import { accountNumberTail, formatAccountNumber, formatIban, formatTransactionReference, isValidIban, maskAccountNumber } from '@punji/ui/banking';
import { Card } from '@punji/ui/card';
import { DataRow, DataRows } from '@punji/ui/rows';
import { exampleIban, sampleAccountNumber } from '../../sample.ts';

// Pure functions: the same results server-side. Masking is display-only, not access control.
export default function Example() {
  const typed = 'GB82 WEST 1234 5698 7654 33'; // one digit mistyped
  return (
    <Card title="Add a beneficiary" description="What to show while the user checks the details" headingLevel={3}>
      <DataRows label="Account details">
        <DataRow label="Account (masked)" value={maskAccountNumber(sampleAccountNumber)} />
        <DataRow label="Grouped by four" value={maskAccountNumber(sampleAccountNumber, { groupSize: 4 })} />
        <DataRow label="Short number, never whole" value={maskAccountNumber('1234')} />
        <DataRow label="Statement line" value={`ending ${accountNumberTail(sampleAccountNumber)}`} />
        <DataRow label="Full, after reveal" value={formatAccountNumber(sampleAccountNumber)} />
        <DataRow label="IBAN as typed" value={formatIban('gb82west12345698765432')} />
        <DataRow label="Valid IBAN?" value={isValidIban(exampleIban) ? 'Yes' : 'No'} />
        <DataRow label="Mistyped IBAN valid?" value={isValidIban(typed) ? 'Yes' : 'No, check the digits'} />
        <DataRow label="Reference from a bank file" value={formatTransactionReference('  FT25‮314XK92Q4B7NLM3 ', { maxLength: 12 })} />
      </DataRows>
    </Card>
  );
}
