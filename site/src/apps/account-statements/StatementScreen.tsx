import { Button } from '@punji/ui/button';
import { FinancialSummary, FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Select } from '@punji/ui/select';
import { StatusBanner } from '@punji/ui/status-banner';
import { Switch } from '@punji/ui/switch';
import { ScreenTitle } from '../shared/kit.tsx';
import { Amount, formatMoneyAggregate, formatPlainAggregate, nprMoney } from '../shared/moneyCells.tsx';
import { npr, rs, shortDate } from '../shared/books.ts';
import { ACCOUNTS, BANK_CONTACT, BANK_NAME, ISSUED, MONTHS, checkStatement, declaredOf, statementOf, stepMonth, type Line } from './statements.ts';
import { useStatements } from './store.ts';

const FEE_CATEGORIES = new Set(['Charges', 'Interest']);
const credit = (l: Line) => (l.credit > 0n ? nprMoney(l.credit) : null);
const debit = (l: Line) => (l.debit > 0n ? nprMoney(l.debit) : null);

/**
 * One month of one account as a document: a header, a summary, the transactions with a running balance and totals
 * checked against the bank's declared totals, fees and interest by kind, and notes. On paper the app around it goes,
 * and each section starts a page (see statements.css).
 */
export function StatementScreen({ onPrint }: { onPrint: () => void }) {
  const { view, setView } = useStatements();
  const statement = statementOf(view.holderId, view.monthId);
  const { holder, month, lines } = statement;
  const declared = declaredOf(statement, view.drift);
  const check = checkStatement(statement, declared);
  const fees = lines.filter((l) => FEE_CATEGORIES.has(l.category));

  const columns: FinancialColumn<Line>[] = [
    {
      key: 'description',
      label: 'Description',
      rowHeader: true,
      render: (l) => (
        <span className="st-desc">
          <strong>{l.text}</strong>
          <span>{l.reference}</span>
        </span>
      ),
    },
    { key: 'credit', label: 'Money in', kind: 'money', num: true, value: credit, aggregate: 'sum', formatAggregate: formatPlainAggregate, render: (l) => (l.credit > 0n ? <Amount value={l.credit} plain /> : null) },
    { key: 'debit', label: 'Money out', kind: 'money', num: true, value: debit, aggregate: 'sum', formatAggregate: formatPlainAggregate, render: (l) => (l.debit > 0n ? <Amount value={l.debit} plain /> : null) },
    { key: 'balance', label: 'Balance', kind: 'money', num: true, render: (l) => <Amount value={l.balance} plain /> },
    { key: 'date', label: 'Date', render: (l) => shortDate(l.date) },
  ];
  const feeColumns: FinancialColumn<Line>[] = [
    {
      key: 'description',
      label: 'Description',
      rowHeader: true,
      render: (l) => (
        <span className="st-desc">
          <strong>{l.text}</strong>
          <span>{l.reference}</span>
        </span>
      ),
    },
    { key: 'amount', label: 'Amount', kind: 'money', num: true, value: (l) => nprMoney(l.credit - l.debit), aggregate: 'sum', formatAggregate: formatMoneyAggregate, render: (l) => <Amount value={l.credit - l.debit} /> },
    { key: 'date', label: 'Date', render: (l) => shortDate(l.date) },
  ];

  return (
    <div className="app-stack">
      <ScreenTitle
        aside={
          <Button size="sm" onClick={onPrint} disabled={!check.reconciled} title={check.reconciled ? 'Print or save as PDF (P)' : 'A statement that does not reconcile is not printed'} testId="st-print">
            Print or save as PDF
          </Button>
        }
      >
        Statement
      </ScreenTitle>

      <div className="st-controls st-noprint" role="group" aria-label="Choose the statement">
        <Select
          label="Account"
          size="sm"
          value={view.holderId}
          onChange={(holderId) => setView({ holderId })}
          options={ACCOUNTS.map((a) => ({ value: a.id, label: `${a.product}, ${a.account}` }))}
          testId="st-account"
        />
        <Select label="Month" size="sm" value={view.monthId} onChange={(monthId) => setView({ monthId })} options={MONTHS.map((m) => ({ value: m.id, label: m.label }))} testId="st-month" />
        <div className="st-step">
          <Button size="sm" variant="secondary" onClick={() => setView({ monthId: stepMonth(view.monthId, -1) })} disabled={view.monthId === MONTHS[0]!.id} testId="st-prev">
            Earlier month
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setView({ monthId: stepMonth(view.monthId, 1) })} disabled={view.monthId === MONTHS.at(-1)!.id} testId="st-next">
            Later month
          </Button>
        </div>
        <div className="st-drift">
          <Switch checked={view.drift} onChange={(drift) => setView({ drift })} labelledBy="st-drift-label" testId="st-drift" />
          <span id="st-drift-label">Demo: make the bank's header one rupee wrong</span>
        </div>
        <p className="app-muted app-small st-keys">
          Keys: <kbd className="app-kbd">[</kbd> <kbd className="app-kbd">]</kbd> change month, <kbd className="app-kbd">P</kbd> prints.
        </p>
      </div>

      {!check.reconciled && (
        <div className="app-banner" data-testid="st-unreconciled">
          <StatusBanner tone="danger" title="This statement does not reconcile">
            The lines add up to {rs(statement.declared.credits)} in and {rs(statement.declared.debits)} out, but the header says {rs(declared.credits)} in. It is not printed or issued until the bank corrects it.
          </StatusBanner>
        </div>
      )}

      <article className="st-paper" aria-labelledby="st-title" data-testid="st-paper">
        <header className="st-head">
          <div>
            <p className="st-bank">{BANK_NAME}</p>
            <h3 id="st-title" className="st-title">
              Statement of account, {month.label}
            </h3>
          </div>
          <dl className="st-meta">
            <div>
              <dt>Account holder</dt>
              <dd>{holder.name}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{holder.address}</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>
                {holder.product}, {holder.account}
              </dd>
            </div>
            <div>
              <dt>Period</dt>
              <dd>
                1 {month.label.split(' ')[0]!.slice(0, 3)} to {month.days} {month.label.split(' ')[0]!.slice(0, 3)} {month.year}
              </dd>
            </div>
            <div>
              <dt>Issued</dt>
              <dd>{shortDate(ISSUED)}</dd>
            </div>
          </dl>
        </header>

        <section className="st-section" aria-labelledby="st-summary-h">
          <h4 id="st-summary-h" className="st-h">
            Summary
          </h4>
          <FinancialSummary
            label={`Summary of ${month.label}`}
            metrics={[
              { id: 'opening', label: 'Opening balance', value: <MoneyDisplay value={statement.opening} preset={npr} testId="st-opening" />, note: `1 ${month.label.split(' ')[0]!.slice(0, 3)}` },
              { id: 'in', label: 'Money in', value: <MoneyDisplay value={declared.credits} preset={npr} testId="st-credits" />, note: `${lines.filter((l) => l.credit > 0n).length} credits` },
              { id: 'out', label: 'Money out', value: <MoneyDisplay value={declared.debits} preset={npr} testId="st-debits" />, note: `${lines.filter((l) => l.debit > 0n).length} debits` },
              { id: 'closing', label: 'Closing balance', value: <MoneyDisplay value={declared.closing} preset={npr} testId="st-closing" />, note: `${month.days} ${month.label.split(' ')[0]!.slice(0, 3)}` },
            ]}
          />
          <p className="st-check" data-testid="st-check">
            <span aria-hidden="true">{check.reconciled ? '✓' : '!'}</span>{' '}
            {check.reconciled
              ? `Opening ${rs(statement.opening)} + money in ${rs(declared.credits)} - money out ${rs(declared.debits)} = closing ${rs(declared.closing)}.`
              : `Not reconciled: opening + money in - money out is ${rs(statement.opening + statement.declared.credits - statement.declared.debits)}, the header's closing is ${rs(declared.closing)}.`}
          </p>
        </section>

        <section className="st-section st-break" aria-labelledby="st-tx-h">
          <h4 id="st-tx-h" className="st-h">
            Transactions
          </h4>
          <FinancialTable
            caption={`Transactions, ${month.label} (NPR)`}
            columns={columns}
            rows={lines}
            rowKey={(l) => l.id}
            emptyTitle="No transactions this month"
            expectedTotals={{ credit: nprMoney(declared.credits), debit: nprMoney(declared.debits) }}
            totalsLabels={{ total: 'Totals for the month' }}
          />
        </section>

        <section className="st-section st-break" aria-labelledby="st-fees-h">
          <h4 id="st-fees-h" className="st-h">
            Fees, charges and interest
          </h4>
          <FinancialTable
            caption={`Fees, charges and interest, ${month.label} (NPR)`}
            columns={feeColumns}
            rows={fees}
            rowKey={(l) => l.id}
            emptyTitle="No fees or interest this month"
            groupBy={(l) => l.category}
            groupLabel={(key) => (key === 'Interest' ? 'Interest credited' : 'Fees and charges')}
            totals
            totalsLabels={{ total: 'Net of fees and interest' }}
          />
          <h4 className="st-h st-notes-h">Notes</h4>
          <ul className="st-notes">
            <li>Report any entry you do not recognise within 30 days of the statement date.</li>
            <li>Interest is credited on the last day of the month on the opening balance, for savings accounts only.</li>
            <li>This statement was generated by computer and needs no signature. {BANK_CONTACT}</li>
          </ul>
        </section>
      </article>
    </div>
  );
}
