import { useState } from 'react';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { MoneyDisplay } from '@punji/ui/money-display';
import { isMoney, money, nepalMoneyConfig, type Money } from '@punji/ui/money';

// A group-header action (real buttons, in tab order, left out of print) and a print button. Printing uses the table's
// print stylesheet: the head repeats, rows stay whole, nothing is clipped, black on white. Try Print preview.
interface Invoice { id: string; customer: string; amount: Money }
const preset = nepalMoneyConfig();
const npr = (rupees: bigint) => money(rupees * 100n, 'NPR');
const invoices: Invoice[] = [
  { id: 'INV-1041', customer: 'Himal Traders', amount: npr(125_000n) },
  { id: 'INV-1044', customer: 'Himal Traders', amount: npr(48_500n) },
  { id: 'INV-1039', customer: 'Kathmandu Supplies', amount: npr(92_750n) },
];
const columns: FinancialColumn<Invoice>[] = [
  { key: 'id', label: 'Invoice', rowHeader: true, render: (i) => i.id },
  { key: 'amount', label: 'Amount', kind: 'money', value: (i) => i.amount, aggregate: 'sum', formatAggregate: (v) => (isMoney(v) ? <MoneyDisplay value={v.minor} preset={preset} /> : String(v)), render: (i) => <MoneyDisplay value={i.amount.minor} preset={preset} /> },
];

// Defined once, outside the component, so the table gets the same function on every render.
const remind = (onSend: (message: string) => void) => (key: string, rows: readonly Invoice[]) => (
  <button type="button" onClick={() => onSend(`Reminder queued for ${key} (${rows.length} invoices)`)}>{`Remind ${key}`}</button>
);

export default function Example() {
  const [sent, setSent] = useState('');
  return (
    <div style={{ display: 'grid', gap: 12, width: 'min(100%, 720px)', marginInline: 'auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <button type="button" className="pu-no-print" onClick={() => window.print()}>Print</button>
        <span role="status" className="doc-muted">{sent}</span>
      </div>
      <FinancialTable
        caption="Receivables, NPR"
        columns={columns}
        rows={invoices}
        rowKey={(i) => i.id}
        emptyTitle="No open invoices"
        groupBy={(i) => i.customer}
        totals
        groupActions={remind(setSent)}
      />
    </div>
  );
}
