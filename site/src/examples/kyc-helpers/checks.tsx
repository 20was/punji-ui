import { Card } from '@punji/ui/card';
import { formatPan, validateCitizenshipNumber, validatePan } from '@punji/ui/kyc';
import { DataRow, DataRows } from '@punji/ui/rows';

// Shape checks only: there is no public check digit, so a valid shape is not a verified number.
const show = (r: ReturnType<typeof validatePan>) => (r.state === 'invalid' ? `invalid (${r.reason})` : `${r.state}: ${r.value}`);

export default function Example() {
  return (
    <Card title="PAN and citizenship checks" headingLevel={3}>
      <DataRows label="Checks">
        <DataRow label="PAN 301234567" value={show(validatePan('301234567'))} />
        <DataRow label="PAN in Devanagari" value={show(validatePan('३०१२३४५६७'))} />
        <DataRow label="PAN with 8 digits" value={show(validatePan('30123456'))} />
        <DataRow label="PAN for reading" value={formatPan('301234567')} />
        <DataRow label="Citizenship 27-01-71-02345" value={show(validateCitizenshipNumber('27-01-71-02345'))} />
        <DataRow label="Citizenship 1234/5678" value={show(validateCitizenshipNumber('१२३४/५६७८'))} />
        <DataRow label="Citizenship 27--01" value={show(validateCitizenshipNumber('27--01'))} />
      </DataRows>
    </Card>
  );
}
