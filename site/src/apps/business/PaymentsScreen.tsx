import { useState, type FormEvent } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { CurrencyInput } from '@punji/ui/currency-input';
import { Field } from '@punji/ui/fields';
import { FinancialSummary, FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Select } from '@punji/ui/select';
import { ScreenTitle } from '../shared/kit.tsx';
import { TODAY, compareDates, decimal, isoDate, npr, parseIsoDate, rs, shortDate } from '../shared/books.ts';
import { MODES, useBiz, type Payment, type PaymentMode } from './store.ts';

/** Record money received against an open invoice (with any TDS the customer withheld), and every receipt so far. */
export default function PaymentsScreen() {
  const { state, derived, dispatch } = useBiz();
  const open = derived.rows.filter((r) => r.balance > 0n);
  const [invoiceId, setInvoiceId] = useState(state.payFor && open.some((r) => r.invoice.id === state.payFor) ? state.payFor : open[0]?.invoice.id ?? '');
  const row = open.find((r) => r.invoice.id === invoiceId) ?? open[0];
  const [date, setDate] = useState(isoDate(TODAY));
  const [amount, setAmount] = useState(row ? decimal(row.balance) : '');
  const [amountMinor, setAmountMinor] = useState<bigint | null>(row ? row.balance : null);
  const [tds, setTds] = useState('');
  const [tdsMinor, setTdsMinor] = useState<bigint | null>(null);
  const [mode, setMode] = useState<PaymentMode>('bank');
  const [reference, setReference] = useState('');
  const [tried, setTried] = useState(false);

  const choose = (id: string) => {
    setInvoiceId(id);
    const r = derived.rows.find((x) => x.invoice.id === id);
    setAmount(r ? decimal(r.balance) : '');
    setAmountMinor(r ? r.balance : null);
    setTds('');
    setTdsMinor(null);
  };
  const parsed = parseIsoDate(date);
  const settles = (amountMinor ?? 0n) + (tdsMinor ?? 0n);
  const errors = {
    invoice: row ? undefined : 'Choose an open invoice.',
    date: !parsed ? 'Enter the date as YYYY-MM-DD.' : compareDates(parsed, TODAY) > 0 ? 'A receipt cannot be dated after today.' : row && compareDates(parsed, row.invoice.date) < 0 ? 'A receipt cannot come before the invoice date.' : undefined,
    amount: settles <= 0n ? 'Enter the amount received.' : row && settles > row.balance ? `That is more than the ${rs(row.balance)} outstanding.` : undefined,
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (errors.invoice || errors.date || errors.amount || !row || !parsed) return;
    dispatch({ type: 'pay', payment: { invoiceId: row.invoice.id, date: parsed, amount: amountMinor ?? 0n, tds: tdsMinor ?? 0n, mode, reference: reference.trim() || undefined } });
    setTried(false);
    setReference('');
    setAmount('');
    setAmountMinor(null);
    setTds('');
    setTdsMinor(null);
  };
  const suggestTds = row ? (row.totals.taxable * 15n + 500n) / 1000n : 0n;
  const payments = state.payments.toReversed();
  const totals = state.payments.reduce((s, p) => ({ amount: s.amount + p.amount, tds: s.tds + p.tds }), { amount: 0n, tds: 0n });
  const invoiceOf = (p: Payment) => derived.rows.find((r) => r.invoice.id === p.invoiceId);
  const columns: FinancialColumn<Payment>[] = [
    { key: 'invoice', label: 'Receipt', rowHeader: true, render: (p) => <span className="bz-cell"><strong>{invoiceOf(p)?.invoice.number}</strong><span className="app-muted app-small">{invoiceOf(p)?.customer.name}</span></span> },
    { key: 'settled', label: 'Settled', num: true, render: (p) => <MoneyDisplay value={p.amount + p.tds} preset={npr} /> },
    { key: 'date', label: 'Date', render: (p) => shortDate(p.date) },
    { key: 'mode', label: 'Mode', render: (p) => `${MODES[p.mode]}${p.reference ? ` · ${p.reference}` : ''}`, wide: true },
    { key: 'amount', label: 'Received', num: true, render: (p) => <MoneyDisplay value={p.amount} preset={npr} />, hideUnder: 1024 },
    { key: 'tds', label: 'TDS', num: true, render: (p) => <MoneyDisplay value={p.tds} preset={npr} />, hideUnder: 1024 },
  ];

  return (
    <div className="app-stack">
      <ScreenTitle>Payments received</ScreenTitle>
      <div className="app-summary">
        <FinancialSummary
          label="Receipts so far"
          metrics={[
            { id: 'received', label: 'Money received', value: <MoneyDisplay value={totals.amount} preset={npr} testId="bz-pay-received" /> },
            { id: 'tds', label: 'TDS withheld by customers', value: <MoneyDisplay value={totals.tds} preset={npr} />, note: 'Claimed against our income tax' },
            { id: 'settled', label: 'Invoices settled', value: <MoneyDisplay value={totals.amount + totals.tds} preset={npr} testId="bz-pay-settled" />, note: 'Equals Received on the invoice list' },
            { id: 'open', label: 'Still outstanding', value: <MoneyDisplay value={derived.outstanding} preset={npr} />, note: `${open.length} open invoices` },
          ]}
        />
      </div>
      <Card title="Record a payment" headingLevel={3} testId="bz-pay-form">
        {open.length ? (
          <form className="bz-form-grid" onSubmit={submit} noValidate>
            <Select label="Invoice" labelPlacement="above" value={row?.invoice.id ?? ''} onChange={choose} options={open.map((r) => ({ value: r.invoice.id, label: `${r.invoice.number} · ${r.customer.name} · ${rs(r.balance)}` }))} testId="bz-pay-invoice" />
            <Field label="Date received (AD)" type="date" value={date} onChange={setDate} max={isoDate(TODAY)} error={tried ? errors.date : undefined} testId="bz-pay-date" />
            <CurrencyInput label="Amount received" preset={npr} size="md" value={amount} onValueChange={(c) => { setAmount(c.value); setAmountMinor(c.minorUnits); }} error={tried ? errors.amount : undefined} hint={row ? `Outstanding ${rs(row.balance)}` : undefined} testId="bz-pay-amount" />
            <CurrencyInput
              label="TDS withheld by the customer"
              preset={npr}
              size="md"
              value={tds}
              onValueChange={(c) => { setTds(c.value); setTdsMinor(c.minorUnits); }}
              hint={row ? <>1.5% of the taxable amount is {rs(suggestTds)}. <button type="button" className="bz-link" onClick={() => { setTds(decimal(suggestTds)); setTdsMinor(suggestTds); setAmount(decimal(row.balance - suggestTds)); setAmountMinor(row.balance - suggestTds); }}>Use it</button></> : undefined}
              testId="bz-pay-tds"
            />
            <Select label="Mode" labelPlacement="above" value={mode} onChange={setMode} options={(Object.keys(MODES) as PaymentMode[]).map((m) => ({ value: m, label: MODES[m] }))} />
            <Field label="Reference" value={reference} onChange={setReference} placeholder="Cheque or transaction number" />
            <div className="bz-actions">
              <Button type="submit" testId="bz-pay-submit">Record payment</Button>
            </div>
          </form>
        ) : (
          <p className="app-muted">Every invoice is paid. Nothing to record.</p>
        )}
      </Card>
      <Card title="Receipts" description={`${state.payments.length} receipts, newest first`} headingLevel={3} flush>
        <FinancialTable caption="Payments received" columns={columns} rows={payments} rowKey={(p) => p.id} emptyTitle="No payments yet" emptyBody="Record the first one above." />
      </Card>
    </div>
  );
}
