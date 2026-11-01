import { useState, type FormEvent } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { Field } from '@punji/ui/fields';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PanInput } from '@punji/ui/pan-input';
import { Select } from '@punji/ui/select';
import { formatPanNumber, type PanCheck } from '@punji/ui/tax';
import { ScreenTitle } from '../shared/kit.tsx';
import { npr, rs, type Customer } from '../shared/books.ts';
import { useBiz } from './store.ts';

const TERMS = ['0', '15', '30', '45', '60'];

/** Customers with PAN, credit terms and what they owe (the sum of their invoice balances), and a form to add one. */
export default function CustomersScreen() {
  const { state, derived, dispatch } = useBiz();
  const [name, setName] = useState('');
  const [pan, setPan] = useState('');
  const [panCheck, setPanCheck] = useState<PanCheck>({ state: 'empty', value: '' });
  const [address, setAddress] = useState('');
  const [terms, setTerms] = useState('30');
  const [tried, setTried] = useState(false);
  const nameError = !name.trim() ? 'Enter the registered name.' : undefined;
  const panError = panCheck.state !== 'valid'
    ? 'Enter the nine-digit PAN or VAT number.'
    : state.customers.some((c) => c.pan === panCheck.value) ? 'A customer with this PAN already exists.' : undefined;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (nameError || panError || panCheck.state !== 'valid') return;
    dispatch({ type: 'customer', customer: { name: name.trim(), pan: panCheck.value, address: address.trim() || '—', contact: '—', terms: Number(terms) } });
    setName('');
    setPan('');
    setPanCheck({ state: 'empty', value: '' });
    setAddress('');
    setTried(false);
  };
  const columns: FinancialColumn<Customer>[] = [
    { key: 'name', label: 'Customer', rowHeader: true, render: (c) => <span className="bz-cell"><strong>{c.name}</strong><span className="app-muted app-small">{c.address}</span></span> },
    { key: 'outstanding', label: 'Outstanding', num: true, render: (c) => <MoneyDisplay value={derived.byCustomer.get(c.id)?.outstanding ?? 0n} preset={npr} /> },
    { key: 'pan', label: 'PAN', render: (c) => <span className="bz-pan">{formatPanNumber(c.pan)}</span> },
    { key: 'terms', label: 'Terms', render: (c) => (c.terms ? `${c.terms} days` : 'Cash'), wide: true },
    { key: 'count', label: 'Invoices', num: true, render: (c) => String(derived.byCustomer.get(c.id)?.count ?? 0), wide: true },
  ];
  const total = [...derived.byCustomer.values()].reduce((s, c) => s + c.outstanding, 0n);
  return (
    <div className="app-stack">
      <ScreenTitle>Customers</ScreenTitle>
      <Card title={`${state.customers.length} customers`} description={`Owing ${rs(total)} in all, the same as the invoice list`} headingLevel={3} flush testId="bz-customers">
        <FinancialTable caption="Customers" columns={columns} rows={state.customers} rowKey={(c) => c.id} emptyTitle="No customers yet" emptyBody="Add your first customer below." />
      </Card>
      <Card title="Add a customer" description="A VAT invoice above the IRD threshold needs the buyer's PAN" headingLevel={3}>
        <form className="bz-form-grid" onSubmit={submit} noValidate>
          <Field label="Registered name" value={name} onChange={setName} error={tried ? nameError : undefined} testId="bz-cust-name" />
          <PanInput label="PAN / VAT number" value={pan} onValueChange={(check) => { setPan(check.value); setPanCheck(check); }} error={tried ? panError : undefined} testId="bz-cust-pan" />
          <Field label="Address" value={address} onChange={setAddress} testId="bz-cust-address" />
          <Select label="Credit terms" labelPlacement="above" value={terms} onChange={setTerms} options={TERMS.map((t) => ({ value: t, label: t === '0' ? 'Cash' : `${t} days` }))} />
          <div className="bz-actions">
            <Button type="submit" testId="bz-cust-add">Add customer</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
