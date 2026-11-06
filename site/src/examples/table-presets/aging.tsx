import { FinancialTable } from '@punji/ui/financial';
import { money } from '@punji/ui/money';
import { agingColumns, toFinancialColumns, type AgingLine } from '@punji/ui/table-presets';

// Receivables by customer and age. Each bucket totals exactly, and the buckets add up to the total column. Invented.
const npr = (minor: bigint) => money(minor, 'NPR');
const zero = npr(0n);
const rows: AgingLine[] = [
  { party: 'Everest Stores', current: npr(18_300_00n), days1to30: zero, days31to60: zero, days61to90: zero, over90: npr(42_500_00n), total: npr(60_800_00n) },
  { party: 'Himal Traders', current: npr(9_600_00n), days1to30: npr(26_400_00n), days31to60: zero, days61to90: zero, over90: zero, total: npr(36_000_00n) },
  { party: 'Lumbini Mart', current: zero, days1to30: zero, days31to60: npr(31_150_00n), days61to90: npr(7_425_00n), over90: zero, total: npr(38_575_00n) },
];
const columns = toFinancialColumns(agingColumns<AgingLine>({ display: 'none' }));

export default function Example() {
  return <FinancialTable caption="Receivables aging, NPR" columns={columns} rows={rows} rowKey={(r) => r.party} emptyTitle="Nothing owed" totals />;
}
