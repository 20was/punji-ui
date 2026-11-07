import { ScrollTable } from '@punji/ui/scroll-table';
import { MoneyDisplay } from '@punji/ui/money-display';
import { money, nepalMoneyConfig, type Money } from '@punji/ui/money';
import type { ColumnDef } from '@punji/ui/table-core';
import type { ReactNode } from 'react';

// A sector's companies: sort any head, scroll sideways (the symbol stays), and Tab to the region to scroll with the arrow keys.
interface Co { symbol: string; name: string; ltp: Money; today: number | null; year: number; cap: Money }
const preset = nepalMoneyConfig();
const npr = (rupees: bigint) => money(rupees * 100n, 'NPR');
const rows: Co[] = [
  { symbol: 'NABIL', name: 'Nabil Bank', ltp: npr(500n), today: 1.2, year: 8.4, cap: npr(134_000_000_000n) },
  { symbol: 'ADBL', name: 'Agricultural Development Bank', ltp: npr(310n), today: null, year: -4.1, cap: npr(61_500_000_000n) },
  { symbol: 'SCBL', name: 'Standard Chartered Bank Nepal', ltp: npr(540n), today: -0.5, year: 2.9, cap: npr(53_200_000_000n) },
  { symbol: 'HBL', name: 'Himalayan Bank', ltp: npr(235n), today: 0, year: -11.6, cap: npr(36_900_000_000n) },
];
const signed = (n: number | null): ReactNode => (n === null ? 'Not traded' : `${n > 0 ? '▲ +' : n < 0 ? '▼ ' : '– '}${n.toFixed(2)}%`);
const columns: ColumnDef<Co, ReactNode>[] = [
  { id: 'symbol', header: 'Company', accessor: (c) => c.symbol, sortable: true, cell: (c) => <><b>{c.symbol}</b> <span className="doc-muted">{c.name}</span></> },
  { id: 'ltp', header: 'Close, Rs', kind: 'price', accessor: (c) => c.ltp, sortable: true, cell: (c) => <MoneyDisplay value={c.ltp.minor} preset={preset} /> },
  { id: 'today', header: 'Today', kind: 'percent', accessor: (c) => c.today, sortable: true, cell: (c) => signed(c.today) },
  { id: 'year', header: '1 year', kind: 'percent', accessor: (c) => c.year, sortable: true, hideUnder: 760, cell: (c) => signed(c.year) },
  { id: 'cap', header: 'Value, Rs', kind: 'money', accessor: (c) => c.cap, sortable: true, cell: (c) => <MoneyDisplay value={c.cap.minor} preset={preset} compact /> },
];

export default function Example() {
  return <ScrollTable caption="Commercial banks" columns={columns} rows={rows} rowKey={(c) => c.symbol} defaultSort={{ key: 'cap', dir: 'desc' }} />;
}
