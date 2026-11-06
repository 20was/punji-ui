import { Card } from '@punji/ui/card';
import { money } from '@punji/ui/money';
import { moneyGridColDef } from '@punji/ui/mui-x-grid';
import { DataRow, DataRows } from '@punji/ui/rows';

// moneyGridColDef() returns the GridColDef fields MUI X reads. Here they are called by hand (MUI is not loaded on this
// page): in your app, spread them into a column, for example { field: 'balance', ...moneyGridColDef({ locale: 'en-IN' }) }.
const col = moneyGridColDef({ locale: 'en-IN' });
const values = [
  { name: 'Reserve', v: money(9007199254740993n, 'NPR') },
  { name: 'Operating', v: money(9007199254740992n, 'NPR') },
  { name: 'Refund', v: money(-4500n, 'NPR') },
  { name: 'US wire', v: money(1234567890n, 'USD') },
];
const sorted = values.toSorted((a, b) => col.sortComparator(a.v, b.v));

export default function Example() {
  return (
    <Card title="Formatter and comparator" description="Sorted by currency, then exact minor units." headingLevel={3}>
      <DataRows label="Values through the MUI X helpers" flush>
        {sorted.map(({ name, v }) => (
          <DataRow key={name} label={name} value={col.valueFormatter(v)} />
        ))}
      </DataRows>
    </Card>
  );
}
