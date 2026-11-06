import { Card } from '@punji/ui/card';
import { moneyColDef } from '@punji/ui/ag-grid';
import { money } from '@punji/ui/money';
import { DataRow, DataRows } from '@punji/ui/rows';

// moneyColDef() returns the ColDef fields AG Grid reads. Here they are called by hand (AG Grid is not loaded on this
// page): in your app, spread them into a column, for example { field: 'balance', ...moneyColDef({ locale: 'en-IN' }) }.
const col = moneyColDef({ locale: 'en-IN' });
const values = [money(9007199254740993n, 'NPR'), money(9007199254740992n, 'NPR'), money(-4500n, 'NPR'), money(1234567890n, 'USD')];
const sorted = values.toSorted((a, b) => col.comparator(a, b));

export default function Example() {
  return (
    <Card title="valueFormatter and comparator" description="Sorted by currency, then exact minor units. The column type is right-aligned." headingLevel={3}>
      <DataRows label="Values through the AG Grid helpers">
        {sorted.map((v) => (
          <DataRow key={`${v.currency}${v.minor}`} label={`${v.currency} ${v.minor}`} value={col.valueFormatter({ value: v })} />
        ))}
      </DataRows>
    </Card>
  );
}
