import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { Switch } from '@punji/ui/switch';
import { compareDates, rs, shortDate } from '../shared/books.ts';
import { ScreenTitle } from '../shared/kit.tsx';
import { Amount, formatPlainAggregate, nprMoney } from '../shared/moneyCells.tsx';
import { BILLS, CATEGORIES, daysFromNow, isDueSoon, type Bill } from './finance.ts';
import { useFinance } from './store.ts';

interface Line {
  bill: Bill;
  due: Bill['due'];
  autopay: boolean;
}
const EVERY = { 1: 'Monthly', 3: 'Every 3 months', 12: 'Yearly' } as const;

/** Bills that repeat, soonest first. Paying one moves its next date and spends from its budget category; autopay is a
 *  switch per bill. The total is what falls due in the next 30 days. */
export default function BillsScreen() {
  const { state, dispatch } = useFinance();
  const lines: Line[] = BILLS.map((bill) => ({ bill, due: state.bills[bill.id]?.due ?? bill.due, autopay: state.bills[bill.id]?.autopay ?? bill.autopay })).toSorted((a, b) => compareDates(a.due, b.due));
  const soon = lines.filter((l) => isDueSoon(l.due));
  const soonTotal = soon.reduce((n, l) => n + l.bill.amount, 0n);
  const manual = soon.filter((l) => !l.autopay);
  const columns: FinancialColumn<Line>[] = [
    {
      key: 'name',
      label: 'Bill',
      rowHeader: true,
      render: (l) => (
        <span className="pf-desc">
          <strong>{l.bill.name}</strong>
          <span>
            {EVERY[l.bill.every]} · {CATEGORIES.find((c) => c.id === l.bill.categoryId)!.name}
          </span>
        </span>
      ),
    },
    {
      key: 'due',
      label: 'Next due',
      render: (l) => (
        <span className="pf-desc">
          <span className="pf-ink">{shortDate(l.due)}</span>
          <span>{daysFromNow(l.due) === 0 ? 'Today' : `In ${daysFromNow(l.due)} days`}</span>
        </span>
      ),
    },
    { key: 'amount', label: 'Amount', kind: 'money', num: true, value: (l) => nprMoney(l.bill.amount), aggregate: 'sum', formatAggregate: formatPlainAggregate, render: (l) => <Amount value={l.bill.amount} plain /> },
    {
      key: 'auto',
      label: 'Autopay',
      render: (l) => (
        <span className="pf-auto">
          <Switch checked={l.autopay} onChange={(on) => dispatch({ type: 'autopay', billId: l.bill.id, on })} label={`Autopay for ${l.bill.name}`} testId={`pf-auto-${l.bill.id}`} />
          <span aria-hidden="true">{l.autopay ? 'On' : 'Off'}</span>
        </span>
      ),
    },
    {
      key: 'pay',
      label: 'Pay',
      render: (l) => (
        <Button size="sm" variant="secondary" onClick={() => dispatch({ type: 'pay', billId: l.bill.id })} aria-label={`Pay now: ${l.bill.name}, ${rs(l.bill.amount)}`} testId={`pf-pay-${l.bill.id}`}>
          Pay now
        </Button>
      ),
    },
  ];
  return (
    <div className="app-stack">
      <ScreenTitle>Recurring bills</ScreenTitle>
      <MetricRow label="Bills in the next 30 days" count={3} testId="pf-bills-kpis">
        <MetricTile label="Due in 30 days" value={<Amount value={soonTotal} plain testId="pf-bills-total" />} note={`${soon.length} ${soon.length === 1 ? 'bill' : 'bills'}`} compact />
        <MetricTile label="Paid by autopay" value={<span data-testid="pf-bills-auto">{soon.length - manual.length}</span>} note="You need not act" compact />
        <MetricTile tone="inverse" label="Yours to pay" value={<span data-testid="pf-bills-manual">{manual.length}</span>} note={manual.length === 0 ? 'Nothing waiting' : manual.map((l) => l.bill.name).join(', ')} compact />
      </MetricRow>
      <Card title="All recurring bills" description="Soonest first. Paying a bill spends from its budget category." headingLevel={3} flush testId="pf-bills">
        <FinancialTable caption="Recurring bills in order of next due date (NPR)" columns={columns} rows={lines} rowKey={(l) => l.bill.id} emptyTitle="No recurring bills" />
      </Card>
    </div>
  );
}
