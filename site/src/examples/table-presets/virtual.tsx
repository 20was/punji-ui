import { VirtualFinancialTable } from '@punji/ui/virtual-table';
import { money } from '@punji/ui/money';
import { ledgerColumns, toFinancialColumns, type LedgerRow } from '@punji/ui/table-presets';

// The same presets drive the virtual table: 2,000 invented ledger lines, debit and credit totals exact.
const rows: LedgerRow[] = Array.from({ length: 2_000 }, (_, i) => {
  const amount = BigInt(((i * 7919) % 90_000) + 1_000);
  const debit = i % 3 !== 0;
  return {
    date: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
    description: debit ? `Purchase ${i + 1}` : `Receipt ${i + 1}`,
    reference: `JV-${String(i + 1).padStart(4, '0')}`,
    ...(debit ? { debit: money(amount, 'NPR') } : { credit: money(amount, 'NPR') }),
  };
});
const columns = toFinancialColumns(ledgerColumns<LedgerRow>()).map((c) => ({ ...c, width: c.key === 'description' ? 170 : 130 }));

export default function Example() {
  return <VirtualFinancialTable caption="General ledger, NPR" columns={columns} rows={rows} rowKey={(r) => r.reference ?? ''} emptyTitle="No entries" height={360} totals />;
}
