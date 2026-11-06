import { useState } from 'react';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Checkbox } from '@punji/ui/checkbox';
import { isMoney, money, nepalMoneyConfig, type Money } from '@punji/ui/money';

// Receivables grouped by customer, with exact subtotals, a totals row and a check
// against the control total from the bank statement (NPR 4,07,250.00).
interface Invoice { id: string; customer: string; due: string; amount: Money }
const preset = nepalMoneyConfig();
const npr = (rupees: bigint, paisa = 0n) => money(rupees * 100n + paisa, 'NPR');
const invoices: Invoice[] = [
  { id: 'INV-1041', customer: 'Himal Traders', due: '2083-02-10', amount: npr(125_000n) },
  { id: 'INV-1044', customer: 'Himal Traders', due: '2083-02-24', amount: npr(48_500n) },
  { id: 'INV-1039', customer: 'Kathmandu Supplies', due: '2083-01-30', amount: npr(92_750n) },
  { id: 'INV-1046', customer: 'Kathmandu Supplies', due: '2083-03-02', amount: npr(18_000n) },
  { id: 'INV-1047', customer: 'Kathmandu Supplies', due: '2083-03-05', amount: npr(3_000n) },
  { id: 'INV-1042', customer: 'Pokhara Foods', due: '2083-02-15', amount: npr(120_000n) },
];
const show = (value: unknown) => (isMoney(value) ? <MoneyDisplay value={value.minor} preset={preset} /> : String(value));

const columns: FinancialColumn<Invoice>[] = [
  { key: 'id', label: 'Invoice', rowHeader: true, render: (i) => i.id },
  // Not essential on a phone: folds away under 760px, so the stacked rows keep the invoice and amount.
  { key: 'due', label: 'Due (BS)', kind: 'date', wide: true, render: (i) => i.due },
  { key: 'amount', label: 'Amount', kind: 'money', value: (i) => i.amount, aggregate: 'sum', formatAggregate: show, render: (i) => <MoneyDisplay value={i.amount.minor} preset={preset} /> },
];

export default function Example() {
  const [grouped, setGrouped] = useState(true);
  const [statementOff, setStatementOff] = useState(false);
  const expected = statementOff ? npr(407_500n) : npr(407_250n);
  return (
    <div style={{ display: 'grid', gap: 12, width: 'min(100%, 720px)', marginInline: 'auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <Checkbox checked={grouped} onChange={setGrouped}>Group by customer</Checkbox>
        <Checkbox checked={statementOff} onChange={setStatementOff}>Statement differs</Checkbox>
      </div>
      <FinancialTable
        caption="Receivables, NPR"
        columns={columns}
        rows={invoices}
        rowKey={(i) => i.id}
        emptyTitle="No open invoices"
       
        groupBy={grouped ? (i) => i.customer : undefined}
        expectedTotals={{ amount: expected }}
      />
    </div>
  );
}
