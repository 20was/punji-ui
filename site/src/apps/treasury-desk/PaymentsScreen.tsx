import { useMemo, useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { Select } from '@punji/ui/select';
import { compareDates, shortDate } from '../shared/books.ts';
import { ScreenTitle } from '../shared/kit.tsx';
import { Amount, formatMoneyAggregate, nprMoney } from '../shared/moneyCells.tsx';
import { DEFER_DAYS, moneyText, nprText, type Placed } from './treasury.ts';
import { useTreasury } from './store.ts';

type Show = 'all' | 'in' | 'out';
const SHOWS: readonly { value: Show; label: string }[] = [
  { value: 'all', label: 'Receipts and payments' },
  { value: 'in', label: 'Receipts only' },
  { value: 'out', label: 'Payments only' },
];

/** What is due in the next 13 weeks, receipts first and payments after, each group with its subtotal and the table
 *  with the net. A supplier payment can be deferred two weeks; the forecast and the buffer move with it. */
export default function PaymentsScreen() {
  const { state, derived, dispatch } = useTreasury();
  const [show, setShow] = useState<Show>('all');
  const rows = useMemo(
    () =>
      derived.placed
        .filter((p) => p.week !== null && (show === 'all' || p.item.direction === show))
        .toSorted((a, b) => (a.item.direction === b.item.direction ? compareDates(a.due, b.due) : a.item.direction === 'in' ? -1 : 1)),
    [derived.placed, show],
  );
  // The control total: the weekly net the forecast adds up, for the same rows.
  const expected = derived.weeks.reduce((n, w) => n + w.net, 0n);
  const expectedOut = derived.weeks.reduce((n, w) => n + w.moneyOut, 0n);
  const expectedIn = derived.weeks.reduce((n, w) => n + w.moneyIn, 0n);
  const expectedNow = show === 'all' ? expected : show === 'in' ? expectedIn : -expectedOut;
  const columns: FinancialColumn<Placed>[] = [
    {
      key: 'party',
      label: 'Party',
      rowHeader: true,
      render: (p) => (
        <span className="td-desc">
          <strong>{p.item.party}</strong>
          <span>{p.item.category}</span>
        </span>
      ),
    },
    {
      key: 'due',
      label: 'Due',
      render: (p) => (
        <span className="td-desc">
          <span className="td-ink">{shortDate(p.due)}</span>
          {compareDates(p.due, p.item.due) !== 0 && <span>{`Was ${shortDate(p.item.due)}`}</span>}
        </span>
      ),
    },
    { key: 'amount', label: 'Amount', num: true, render: (p) => moneyText({ minor: p.item.amount, currency: p.item.currency }) },
    { key: 'npr', label: 'In NPR', kind: 'money', num: true, value: (p) => nprMoney(p.npr), aggregate: 'sum', formatAggregate: formatMoneyAggregate, render: (p) => <Amount value={p.npr} /> },
    {
      key: 'act',
      label: 'Action',
      render: (p) => {
        if (!p.item.deferrable) return null;
        const deferred = state.deferred.includes(p.item.id);
        return deferred ? (
          <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'undefer', id: p.item.id })} aria-label={`Undo the deferral of ${p.item.party}`} testId={`td-undefer-${p.item.id}`}>
            Undo
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => dispatch({ type: 'defer', id: p.item.id })} aria-label={`Defer ${p.item.party}, ${nprText(-p.npr)}, by ${DEFER_DAYS} days`} testId={`td-defer-${p.item.id}`}>
            Defer
          </Button>
        );
      },
    },
  ];
  return (
    <div className="app-stack">
      <ScreenTitle>Payments and receipts</ScreenTitle>
      <div className="td-filters">
        <Select label="Show" labelPlacement="inline" value={show} onChange={setShow} options={SHOWS} testId="td-show" />
        <p className="app-muted app-small">
          {state.deferred.length === 0 ? 'No payment is deferred.' : `${state.deferred.length} ${state.deferred.length === 1 ? 'payment' : 'payments'} deferred by ${DEFER_DAYS} days.`}
        </p>
      </div>
      <Card title="Next 13 weeks" description="Receipts add, payments subtract. Dollar items are converted at the scenario rate. Only supplier payments can be deferred." headingLevel={3} flush testId="td-payments">
        <FinancialTable
          caption="Expected receipts and payments in the next 13 weeks (NPR)"
          columns={columns}
          rows={rows}
          rowKey={(p) => p.item.id}
          emptyTitle="Nothing due"
          groupBy={(p) => p.item.direction}
          groupLabel={(key) => (key === 'in' ? 'Receipts' : 'Payments')}
          expectedTotals={{ npr: nprMoney(expectedNow) }}
          totalsLabels={{ total: show === 'all' ? 'Net cash flow' : 'Total' }}
        />
      </Card>
    </div>
  );
}
