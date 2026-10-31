import { Card } from '@punji/ui/card';
import { formatCompactMoney, formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import { formatMinorUnits } from '@punji/ui/nepal/financial-format';
import { formatNPR, formatPercent } from '@punji/ui/nepal/format';
import { DataRow, DataRows } from '@punji/ui/rows';

const npr = nepalMoneyConfig();

// Strings for places a component cannot go: an SMS, a notification, a page title, a CSV cell.
// Money is bigint paisa; formatNPR and formatPercent take a plain number you already hold.
export default function Example() {
  return (
    <Card title="Salary credited" description="What you would send in an alert" headingLevel={3}>
      <DataRows label="Formatted strings">
        <DataRow label="SMS body" value={`Rs ${formatMinorUnits(123456789n)} credited`} />
        <DataRow label="Devanagari" value={<span lang="ne">{formatMoney(123456789n, nepalMoneyConfig({ language: 'ne', digits: 'deva' }))}</span>} />
        <DataRow label="Page title" value={`Net worth ${formatCompactMoney(12345678900n, npr)}`} />
        <DataRow label="Exact balance" value={formatMoney(123456789n, npr)} />
        <DataRow label="Dividend per share" value={formatNPR(1234567.89)} />
        <DataRow label="Cash dividend" value={formatPercent(5)} />
      </DataRows>
    </Card>
  );
}
