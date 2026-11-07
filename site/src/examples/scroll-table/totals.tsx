import { ScrollTable } from '@punji/ui/scroll-table';
import { MoneyDisplay } from '@punji/ui/money-display';
import { isMoney, money, nepalMoneyConfig, type Money } from '@punji/ui/money';
import type { ColumnDef } from '@punji/ui/table-core';
import type { ReactNode } from 'react';

// Dividends by company for one year, with an exact footer total (sums bigint minor units, never floats) and a visible caption.
interface Dividend { symbol: string; fiscalYear: string; cash: Money; bonus: Money }
const preset = nepalMoneyConfig();
const npr = (rupees: bigint, paisa = 0n) => money(rupees * 100n + paisa, 'NPR');
const rows: Dividend[] = [
  { symbol: 'NABIL', fiscalYear: '2081/82', cash: npr(11n, 50n), bonus: npr(4n) },
  { symbol: 'NICA', fiscalYear: '2081/82', cash: npr(6n, 25n), bonus: npr(12n, 5n) },
  { symbol: 'SCBL', fiscalYear: '2081/82', cash: npr(31n), bonus: npr(0n) },
];
const show = (value: unknown): ReactNode => (isMoney(value) ? <MoneyDisplay value={value.minor} preset={preset} /> : String(value));
const columns: ColumnDef<Dividend, ReactNode>[] = [
  { id: 'symbol', header: 'Company', accessor: (d) => d.symbol, sortable: true },
  { id: 'fiscalYear', header: 'Fiscal year', kind: 'date', accessor: (d) => d.fiscalYear },
  { id: 'cash', header: 'Cash, Rs per share', kind: 'money', accessor: (d) => d.cash, sortable: true, aggregate: 'sum', formatAggregate: show, cell: (d) => <MoneyDisplay value={d.cash.minor} preset={preset} /> },
  { id: 'bonus', header: 'Bonus, Rs per share', kind: 'money', accessor: (d) => d.bonus, sortable: true, aggregate: 'sum', formatAggregate: show, cell: (d) => <MoneyDisplay value={d.bonus.minor} preset={preset} /> },
];

export default function Example() {
  return <ScrollTable caption="Dividends declared for 2081/82" showCaption columns={columns} rows={rows} rowKey={(d) => d.symbol} totals />;
}
