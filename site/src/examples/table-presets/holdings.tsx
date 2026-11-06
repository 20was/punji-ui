import { FinancialTable } from '@punji/ui/financial';
import { money } from '@punji/ui/money';
import { holdingsColumns, toFinancialColumns, type HoldingRow } from '@punji/ui/table-presets';

// One preset gives the columns; value and gain total as exact bigint paisa. The data is invented.
const npr = (minor: bigint) => money(minor, 'NPR');
const rows: HoldingRow[] = [
  { symbol: 'NABIL', name: 'Nabil Bank', quantity: 120n, averageCost: npr(1_020_00n), price: npr(1_184_50n), value: npr(142_140_00n), gain: npr(19_740_00n), gainBps: 1613n },
  { symbol: 'NICA', name: 'NIC Asia Bank', quantity: 300n, averageCost: npr(612_25n), price: npr(598_00n), value: npr(179_400_00n), gain: npr(-4_275_00n), gainBps: -233n },
  { symbol: 'UPPER', name: 'Upper Tamakoshi', quantity: 500n, averageCost: npr(310_00n), price: npr(341_75n), value: npr(170_875_00n), gain: npr(15_875_00n), gainBps: 1024n },
];
const columns = toFinancialColumns(holdingsColumns<HoldingRow>({ locale: 'en-IN' }));

export default function Example() {
  return <FinancialTable caption="Holdings, NPR" columns={columns} rows={rows} rowKey={(r) => r.symbol} emptyTitle="No holdings" totals />;
}
