import { useMemo } from 'react';
import { Card } from '@punji/ui/card';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import type { ReconcileItem } from '@punji/ui/reconciliation-matcher';
import { TableExport } from '@punji/ui/table-export';
import { ScreenTitle } from '../shared/kit.tsx';
import { Amount, formatMoneyAggregate, nprMoney } from '../shared/moneyCells.tsx';
import { rs, shortDate } from '../shared/books.ts';
import { EXCEPTION_COLUMNS, LINE_COLUMNS, exceptionRows, lineRows } from './exports.ts';
import { OPENING, STATEMENT_CLOSING } from './recon.ts';
import { useRecon } from './store.ts';

interface Line {
  item: ReconcileItem;
  status: 'Matched' | 'Open';
  match: string;
}

/** The month's evidence: the reconciliation statement, each side's lines grouped by status with totals checked against
 *  the bank's and the books' own closing balances, and CSV of the lines and the exceptions. */
export default function ReportScreen() {
  const { state, derived } = useRecon();
  const { summary, statement, ledger, exceptions, acknowledged, ledgerClosing } = derived;
  const exceptionList = useMemo(() => exceptionRows(exceptions, acknowledged), [exceptions, acknowledged]);
  const lines = useMemo(() => lineRows(statement, ledger, state.matches), [statement, ledger, state.matches]);
  const asLines = (side: 'Statement' | 'Ledger'): Line[] =>
    lines.filter((l) => l.side === side).map((l) => ({ item: l.item, status: (l.match ? 'Matched' : 'Open') as Line['status'], match: l.match })).toSorted((a, b) => (a.status === b.status ? 0 : a.status === 'Matched' ? -1 : 1));
  const statementLines = asLines('Statement');
  const ledgerLines = asLines('Ledger');

  const columns: FinancialColumn<Line>[] = [
    {
      key: 'description',
      label: 'Description',
      rowHeader: true,
      render: (l) => (
        <span className="rc-desc">
          <strong>{l.item.description}</strong>
          <span>
            {l.item.reference || 'No reference'} · {l.item.id}
            {l.match ? ` · ${l.match}` : ''}
          </span>
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      kind: 'money',
      num: true,
      value: (l) => nprMoney(l.item.amount),
      aggregate: 'sum',
      formatAggregate: formatMoneyAggregate,
      render: (l) => <Amount value={l.item.amount} />,
    },
    { key: 'date', label: 'Date', render: (l) => shortDate(l.item.date) },
    { key: 'status', label: 'Status', render: (l) => l.status },
  ];
  const facts: [string, bigint, boolean?][] = [
    ['Balance per bank statement', STATEMENT_CLOSING],
    ['Add: deposits in transit', summary.depositsInTransit],
    ['Less: outstanding payments', -summary.outstandingPayments],
    ['Adjusted bank balance', summary.adjustedStatement, true],
    ['Balance per books', ledgerClosing],
    ['Add: receipts not in the books', summary.unrecordedReceipts],
    ['Less: charges and payments not in the books', -summary.unrecordedPayments],
    ['Adjusted book balance', summary.adjustedLedger, true],
  ];

  return (
    <div className="app-stack">
      <ScreenTitle>Report and export</ScreenTitle>
      <Card
        title="Reconciliation statement"
        description={summary.reconciled ? 'The adjusted balances agree to the paisa.' : `Not reconciled: the adjusted balances are ${rs(summary.difference < 0n ? -summary.difference : summary.difference)} apart.`}
        headingLevel={3}
        testId="rc-statement"
      >
        <dl className="rc-facts">
          {facts.map(([label, value, total]) => (
            <div key={label} className={total ? 'is-total' : undefined}>
              <dt>{label}</dt>
              <dd>
                <Amount value={value} />
              </dd>
            </div>
          ))}
          <div className="is-total">
            <dt>Difference</dt>
            <dd data-testid="rc-difference">
              <Amount value={summary.difference} /> {summary.reconciled ? '✓ Reconciled' : '! Not reconciled'}
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Statement lines" description="Each line once. The total must equal the bank's own movement for the month: closing less opening." headingLevel={3} flush testId="rc-report-statement">
        <FinancialTable
          caption="Bank statement lines by status (NPR)"
          columns={columns}
          rows={statementLines}
          rowKey={(l) => l.item.id}
          emptyTitle="No statement lines"
          groupBy={(l) => l.status}
          groupLabel={(key) => (key === 'Matched' ? 'Matched to the books' : 'Open: not matched yet')}
          expectedTotals={{ amount: nprMoney(STATEMENT_CLOSING - OPENING) }}
          totalsLabels={{ total: 'Movement for the month' }}
        />
      </Card>

      <Card title="Ledger entries" description="Account 1010. The total must equal the books' movement for the month, including entries booked here." headingLevel={3} flush testId="rc-report-ledger">
        <FinancialTable
          caption="Ledger entries by status (NPR)"
          columns={columns}
          rows={ledgerLines}
          rowKey={(l) => l.item.id}
          emptyTitle="No ledger entries"
          groupBy={(l) => l.status}
          groupLabel={(key) => (key === 'Matched' ? 'Matched to the bank' : 'Open: not at the bank yet, or unexplained')}
          expectedTotals={{ amount: nprMoney(ledgerClosing - OPENING) }}
          totalsLabels={{ total: 'Movement for the month' }}
        />
      </Card>

      <Card title="Export" description="Plain CSV. Text a spreadsheet could run as a formula (starting = + - or @) is prefixed so it stays text." headingLevel={3}>
        <div className="rc-exports">
          <TableExport columns={LINE_COLUMNS} filename="reconciliation-lines-oct-2026" label="Lines CSV" allRows={lines} scopeLabel={(_, n) => `All lines (${n})`} testIdPrefix="rc-export-lines" />
          <TableExport columns={EXCEPTION_COLUMNS} filename="reconciliation-exceptions-oct-2026" label="Exceptions CSV" allRows={exceptionList} scopeLabel={(_, n) => `Exceptions (${n})`} testIdPrefix="rc-export-exceptions" />
        </div>
      </Card>
    </div>
  );
}
