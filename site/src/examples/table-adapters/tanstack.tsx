import { Card } from '@punji/ui/card';
import { money, type Money } from '@punji/ui/money';
import { DataRow, DataRows } from '@punji/ui/rows';
import type { ColumnDef } from '@punji/ui/table-core';
import { moneySortFn, toTanStackColumns } from '@punji/ui/tanstack-table';

// The adapter turns Punji columns into TanStack column defs. Here the defs are used by hand (no TanStack code runs
// on this page): in your app you pass the same array to useTable and declare rowSortingFeature.
interface Account { name: string; balance: Money }
const rows: Account[] = [
  { name: 'Reserve', balance: money(9007199254740993n, 'NPR') },
  { name: 'Operating', balance: money(9007199254740992n, 'NPR') },
  { name: 'Petty cash', balance: money(1250n, 'NPR') },
];
const columns: ColumnDef<Account>[] = [
  { id: 'name', header: 'Account', accessor: (a) => a.name, rowHeader: true },
  { id: 'balance', header: 'Balance', kind: 'money', sortable: true, accessor: (a) => a.balance },
];
const [, balance] = toTanStackColumns(columns, { money: { locale: 'en-IN' } });
const rowOf = (a: Account) => ({ original: a, getValue: () => balance!.accessorFn(a) });
const sorted = rows.toSorted((a, b) => moneySortFn(rowOf(a), rowOf(b), 'balance'));

export default function Example() {
  return (
    <Card title="Balance, ascending" description="Two balances differ by one paisa past 2^53: Number() would call them equal" headingLevel={3}>
      <DataRows label="Accounts sorted by exact minor units">
        {sorted.map((a) => (
          <DataRow key={a.name} label={a.name} value={String(balance!.cell({ row: rowOf(a), getValue: rowOf(a).getValue }))} />
        ))}
      </DataRows>
    </Card>
  );
}
