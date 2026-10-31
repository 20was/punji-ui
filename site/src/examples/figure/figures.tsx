import { Card } from '@punji/ui/card';
import { Figure } from '@punji/ui/figures';
import { DataRow, DataRows } from '@punji/ui/rows';

// Figure prints a number: tabular digits, en-IN grouping (lakh and crore), never truncated.
// Missing values print a dash, never zero.
export default function Example() {
  return (
    <Card title="Portfolio summary" description="Plain numbers, not exact money" headingLevel={3}>
      <DataRows label="Summary">
        <DataRow label="Market value" value={<Figure value={1234567.5} kind="rs" />} />
        <DataRow label="Shares held" value={<Figure value={12400} kind="int" />} />
        <DataRow label="Return since purchase" value={<Figure value={4.256} kind="pct" />} />
        <DataRow label="Beta vs NEPSE" value={<Figure value={0.5} kind="num" dp={3} />} />
        <DataRow label="Dividend this year" value={<Figure value={null} kind="rs" />} />
      </DataRows>
    </Card>
  );
}
