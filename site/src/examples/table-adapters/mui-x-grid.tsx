import { Card } from '@punji/ui/card';
import { money } from '@punji/ui/money';
import { moneyGridColDef } from '@punji/ui/mui-x-grid';
import { DataRow, DataRows } from '@punji/ui/rows';

// moneyGridColDef() returns the GridColDef fields MUI X reads. Here they are called by hand (MUI is not loaded on this
// page): in your app, spread them into a column, for example { field: 'balance', ...moneyGridColDef({ locale: 'en-IN' }) }.
const col = moneyGridColDef({ locale: 'en-IN' });
const values = [money(9007199254740993n, 'NPR'), money(9007199254740992n, 'NPR'), money(-4500n, 'NPR'), money(1234567890n, 'USD')];
const sorted = values.toSorted((a, b) => col.sortComparator(a, b));

export default function Example() {
  return (
    <Card title="valueFormatter and sortComparator" description="Sorted by currency, then exact minor units. The column aligns right." headingLevel={3}>
      <DataRows label="Values through the MUI X helpers">
        {sorted.map((v) => (
          <DataRow key={`${v.currency}${v.minor}`} label={`${v.currency} ${v.minor}`} value={col.valueFormatter(v)} />
        ))}
      </DataRows>
    </Card>
  );
}
