import { FinancialTable } from '@punji/ui/financial';
import { money } from '@punji/ui/money';
import { statementColumns, toFinancialColumns, type BankStatementLine } from '@punji/ui/table-presets';
import { tableTotals } from '@punji/ui/table-totals';

// A bank statement whose totals are checked against the figures printed on the statement. Labels are overridden
// with the bank's own words. The second expected figure is deliberately off by 5.50 to show a mismatch.
const npr = (minor: bigint) => money(minor, 'NPR');
const rows: BankStatementLine[] = [
  { date: '2026-10-01', description: 'Salary', reference: 'CR-0912', moneyIn: npr(85_000_00n), balance: npr(97_450_00n) },
  { date: '2026-10-04', description: 'Rent', reference: 'DR-4410', moneyOut: npr(24_000_00n), balance: npr(73_450_00n) },
  { date: '2026-10-09', description: 'SMS alert fee', moneyOut: npr(12_50n), balance: npr(73_437_50n) },
  { date: '2026-10-18', description: 'Interest', moneyIn: npr(310_25n), balance: npr(73_747_75n) },
];
const columns = toFinancialColumns(statementColumns<BankStatementLine>({ labels: { moneyOut: 'Withdrawals', moneyIn: 'Deposits' } }));

export default function Example() {
  return (
    <FinancialTable
      caption="Statement for October 2026, NPR"
      columns={columns}
      rows={rows}
      rowKey={(r) => `${r.date}-${r.description}`}
      emptyTitle="No transactions"
      stack
      totalsEngine={tableTotals}
      expectedTotals={{ moneyIn: npr(85_310_25n), moneyOut: npr(24_007_00n) }}
    />
  );
}
