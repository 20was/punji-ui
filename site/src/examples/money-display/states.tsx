import { Card } from '@punji/ui/card';
import { MoneyDisplay } from '@punji/ui/money-display';
import { DataRow, DataRows } from '@punji/ui/rows';

// A statement summary: accounting negatives in parentheses, a plain minus sign, and missing values.
// A missing value is a dash that screen readers hear as "No value", never a zero that looks like a real amount.
export default function Example() {
  return (
    <Card title="October statement" description="Business current account, USD" headingLevel={3}>
      <DataRows label="October statement">
        <DataRow label="Card fees (accounting style)" value={<MoneyDisplay value={-250n} currency="USD" locale="en-US" accounting />} />
        <DataRow label="Refund issued (minus sign)" value={<MoneyDisplay value={-250n} currency="USD" locale="en-US" />} />
        <DataRow label="Interest earned (not posted yet)" value={<MoneyDisplay value={null} currency="USD" locale="en-US" />} />
        <DataRow label="FX adjustment (custom text)" value={<MoneyDisplay value={undefined} currency="USD" locale="en-US" missing="n/a" missingLabel="Not published" />} />
      </DataRows>
    </Card>
  );
}
