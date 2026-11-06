import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { ScreenTitle } from '../shared/kit.tsx';
import { Amount, formatPlainAggregate, nprMoney } from '../shared/moneyCells.tsx';
import { archiveRows, type ArchiveRow } from './statements.ts';
import { useStatements } from './store.ts';

const ROWS = archiveRows();

/** Every statement there is, grouped by account: money in and out per month with subtotals, whether each month opens
 *  where the last one closed, and whether its lines reconcile. Open one to read or print it. */
export default function ArchiveScreen() {
  const { setView, go, say } = useStatements();
  const columns: FinancialColumn<ArchiveRow>[] = [
    { key: 'period', label: 'Statement', rowHeader: true, render: (r) => <strong>{r.period}</strong> },
    { key: 'closing', label: 'Closing balance', kind: 'money', num: true, render: (r) => <Amount value={r.closing} plain /> },
    { key: 'opening', label: 'Opening balance', kind: 'money', num: true, render: (r) => <Amount value={r.opening} plain /> },
    { key: 'credits', label: 'Money in', kind: 'money', num: true, value: (r) => nprMoney(r.credits), aggregate: 'sum', formatAggregate: formatPlainAggregate, render: (r) => <Amount value={r.credits} plain /> },
    { key: 'debits', label: 'Money out', kind: 'money', num: true, value: (r) => nprMoney(r.debits), aggregate: 'sum', formatAggregate: formatPlainAggregate, render: (r) => <Amount value={r.debits} plain /> },
    { key: 'checks', label: 'Checks', render: (r) => `${r.reconciled ? '✓ Reconciles' : '! Does not reconcile'}; ${r.chained ? '✓ opens at the last closing' : '! gap from the last closing'}` },
    {
      key: 'open',
      label: 'Open',
      render: (r) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setView({ holderId: r.holderId, monthId: r.monthId, drift: false });
            say(`Opened the ${r.period} statement.`);
            go('statement');
          }}
          aria-label={`Open the ${r.period} statement, ${r.account}`}
          testId={`st-open-${r.key}`}
        >
          Open
        </Button>
      ),
    },
  ];
  return (
    <div className="app-stack">
      <ScreenTitle>All statements</ScreenTitle>
      <Card title="Statements by account" description="Newest first. Each month opens at the previous month's closing balance." headingLevel={3} flush testId="st-archive">
        <FinancialTable
          caption="Statements by account (NPR)"
          columns={columns}
          rows={ROWS}
          rowKey={(r) => r.key}
          emptyTitle="No statements yet"
          groupBy={(r) => r.account}
          totals
          totalsLabels={{ total: 'All accounts' }}
        />
      </Card>
    </div>
  );
}
