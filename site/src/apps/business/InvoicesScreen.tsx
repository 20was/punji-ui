import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { ChoiceGroup } from '@punji/ui/choice-group';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { MoneyDisplay } from '@punji/ui/money-display';
import { StatusPill } from '@punji/ui/status-pill';
import { ScreenTitle, lazyScreen } from '../shared/kit.tsx';
import { npr, rs, shortDate } from '../shared/books.ts';
import { STATUS, useBiz, type InvoiceRow } from './store.ts';

const InvoiceView = lazyScreen(() => import('./InvoiceView.tsx'), 'The invoice');
type Filter = 'all' | 'open' | 'overdue' | 'paid';
const TONE = { paid: 'gain', part: 'info', overdue: 'warn', due: 'accent' } as const;

/** Every invoice with what was received and what is outstanding, filters and search, and the bill itself. */
export function InvoicesScreen() {
  const { state, derived, dispatch, go } = useBiz();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const rows = derived.rows
    .filter((r) => (filter === 'all' ? true : filter === 'open' ? r.balance > 0n : filter === 'overdue' ? r.status === 'overdue' : r.status === 'paid'))
    .filter((r) => !q || r.invoice.number.toLowerCase().includes(q) || r.customer.name.toLowerCase().includes(q))
    .toReversed();
  const shown = rows.reduce((s, r) => ({ total: s.total + r.totals.total, received: s.received + r.received, balance: s.balance + r.balance }), { total: 0n, received: 0n, balance: 0n });
  const open = (id: string) => {
    InvoiceView.preload();
    dispatch({ type: 'select', id });
  };
  const columns: FinancialColumn<InvoiceRow>[] = [
    {
      key: 'number', label: 'Invoice', rowHeader: true,
      render: (r) => (
        <button type="button" className="app-sym" onClick={() => open(r.invoice.id)} onMouseEnter={() => InvoiceView.preload()} aria-pressed={state.selected === r.invoice.id} data-testid={`bz-inv-${r.invoice.number}`}>
          <strong>{r.invoice.number}</strong>
          <span>{r.customer.name}</span>
        </button>
      ),
    },
    { key: 'balance', label: 'Outstanding', num: true, render: (r) => <MoneyDisplay value={r.balance} preset={npr} /> },
    { key: 'status', label: 'Status', render: (r) => <StatusPill tone={TONE[r.status]} size="sm">{STATUS[r.status]}</StatusPill> },
    { key: 'date', label: 'Date', render: (r) => shortDate(r.invoice.date), wide: true },
    { key: 'due', label: 'Due', render: (r) => shortDate(r.invoice.due), wide: true },
    { key: 'total', label: 'Total', num: true, render: (r) => <MoneyDisplay value={r.totals.total} preset={npr} />, hideUnder: 1024 },
    { key: 'received', label: 'Received', num: true, render: (r) => <MoneyDisplay value={r.received} preset={npr} />, hideUnder: 1024 },
  ];
  const selected = derived.rows.find((r) => r.invoice.id === state.selected);

  return (
    <div className="app-stack">
      <ScreenTitle aside={<Button size="sm" onClick={() => go('create')} title="New invoice (N)" testId="bz-new">New invoice</Button>}>Invoices</ScreenTitle>
      <MetricRow label="Billing totals, FY 2083/84" count={4} testId="bz-kpis">
        <MetricTile label="Invoiced" value={<MoneyDisplay value={derived.invoiced} preset={npr} testId="bz-kpi-invoiced" />} note={`${derived.rows.length} invoices, VAT included`} />
        <MetricTile label="Received" value={<MoneyDisplay value={derived.received} preset={npr} testId="bz-kpi-received" />} note="Cash and TDS withheld" />
        <MetricTile tone="inverse" label="Outstanding" value={<MoneyDisplay value={derived.outstanding} preset={npr} testId="bz-kpi-outstanding" />} note={`${derived.rows.filter((r) => r.balance > 0n).length} invoices open`} />
        <MetricTile label="Overdue" value={<MoneyDisplay value={derived.overdue} preset={npr} testId="bz-kpi-overdue" />} note={`${derived.rows.filter((r) => r.status === 'overdue').length} past their due date`} />
      </MetricRow>
      <Card
        title="All invoices"
        description="Newest first. Choose an invoice to see the bill."
        headingLevel={3}
        action={
          <ChoiceGroup<Filter>
            label="Show"
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'overdue', label: 'Overdue' }, { value: 'paid', label: 'Paid' }]}
            size="sm"
            testId="bz-filter"
          />
        }
        flush
      >
        <FinancialTable
          caption="Invoices"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.invoice.id}
          emptyTitle="No invoices here"
          emptyBody="Change the filter or the search."
          search={{ label: 'Find an invoice', value: query, onChange: setQuery, placeholder: 'Number or customer' }}
        />
        <p className="bz-total" data-testid="bz-list-total">
          {rows.length} {rows.length === 1 ? 'invoice' : 'invoices'}: total {rs(shown.total)}, received {rs(shown.received)}, outstanding {rs(shown.balance)}.
        </p>
      </Card>
      {selected && <InvoiceView row={selected} />}
    </div>
  );
}
