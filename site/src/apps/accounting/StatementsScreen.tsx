import { Card } from '@punji/ui/card';
import { FinancialSummary } from '@punji/ui/financial';
import { rollUp, type StatementRow } from '@punji/ui/ledger';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Note } from '@punji/ui/states';
import { StatementTable } from '@punji/ui/statement-table';
import { ScreenTitle } from '../shared/kit.tsx';
import { compareDates, npr, rs, shortDate } from '../shared/books.ts';
import { balanceSheetRows, profitAndLossRows, rangeOf, type Column } from './books.ts';
import { PeriodBar } from './PeriodBar.tsx';
import { comparisonOf, periodById, useAcct } from './store.ts';

const subtotal = (rows: readonly StatementRow[], id: string, key: string): bigint => {
  for (const row of rows) {
    if (row.kind !== 'section') continue;
    if (row.id === id) return row.subtotal?.values?.[key] ?? 0n;
    const inner = subtotal(row.rows, id, key);
    if (inner !== 0n) return inner;
  }
  return 0n;
};

/** Profit and loss for the period and the balance sheet at its end, beside the comparison period, with the change. */
export default function StatementsScreen() {
  const { state, derived } = useAcct();
  const period = periodById(state.periodId);
  const range = rangeOf(period);
  const cmp = comparisonOf(period, state.compare);
  const toDate = compareDates(period.end!, range.to) > 0;
  const columns: Column[] = [{ key: 'cur', ...range }, ...(cmp ? [cmp.column] : [])];
  const labels = [
    { key: 'cur', label: `${period.label}${toDate ? ' to date' : ''}` },
    ...(cmp ? [{ key: 'cmp', label: `${cmp.period.label}${compareDates(cmp.column.to, cmp.period.end!) < 0 ? ', same days' : ''}` }] : []),
  ];
  const pl = rollUp(profitAndLossRows(derived.ledger, columns));
  const bs = rollUp(balanceSheetRows(derived.ledger, columns));
  const income = subtotal(pl, 'income', 'cur');
  const expenses = subtotal(pl, 'expenses', 'cur');
  const profit = subtotal(pl, 'pl', 'cur');
  const assets = subtotal(bs, 'assets', 'cur');
  const le = subtotal(bs, 'le', 'cur');
  const variance = cmp ? { from: 'cmp', to: 'cur' } : undefined;
  const bsLabels = [
    { key: 'cur', label: `At ${shortDate(range.to)}` },
    ...(cmp ? [{ key: 'cmp', label: `At ${shortDate(cmp.column.to)}` }] : []),
  ];

  return (
    <div className="app-stack">
      <ScreenTitle aside={<PeriodBar compare testId="ac-stmt-period" />}>P&amp;L and balance sheet</ScreenTitle>
      <div className="app-summary">
        <FinancialSummary
          label={`Headline figures, ${labels[0]!.label}`}
          metrics={[
            { id: 'income', label: 'Income', value: <MoneyDisplay value={income} preset={npr} testId="ac-stmt-income" /> },
            { id: 'expenses', label: 'Expenses', value: <MoneyDisplay value={expenses} preset={npr} /> },
            { id: 'profit', label: 'Net profit', value: <MoneyDisplay value={profit} preset={npr} testId="ac-stmt-profit" />, note: income > 0n ? `${(Number((profit * 10_000n) / income) / 100).toFixed(2)}% margin` : undefined },
            { id: 'assets', label: 'Total assets', value: <MoneyDisplay value={assets} preset={npr} testId="ac-stmt-assets" />, note: `At ${shortDate(range.to)}` },
          ]}
        />
      </div>
      <Card title="Profit and loss" description={`${period.detail ?? period.label}${toDate ? `, to ${shortDate(range.to)}` : ''}`} headingLevel={3} flush>
        <StatementTable caption={`Profit and loss, ${labels[0]!.label} (NPR)`} periods={labels} rows={pl} variance={variance} bare testId="ac-pl" />
      </Card>
      <Card title="Balance sheet" description="Retained earnings split into what came into the year and this year's profit" headingLevel={3} flush>
        <StatementTable caption={`Balance sheet at ${shortDate(range.to)} (NPR)`} periods={bsLabels} rows={bs} variance={variance} bare testId="ac-bs" />
      </Card>
      {assets === le ? (
        <Note>✓ Assets equal liabilities and equity: {rs(assets)}. The profit for the year on the balance sheet is the net profit of the fiscal year to {shortDate(range.to)}.</Note>
      ) : (
        <Note tone="error">The balance sheet is out by {rs(assets - le)}.</Note>
      )}
    </div>
  );
}
