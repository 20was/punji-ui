import { useRef, useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { Field } from '@punji/ui/fields';
import { LineItemEditor, lineItemsToInvoiceLines } from '@punji/ui/line-item-editor';
import { Select } from '@punji/ui/select';
import { Note } from '@punji/ui/states';
import { TaxInvoice } from '@punji/ui/tax-invoice';
import type { TaxInvoiceLine } from '@punji/ui/tax-invoice';
import { ScreenTitle } from '../shared/kit.tsx';
import { COMPANY, TODAY, addDays, compareDates, parseIsoDate, shortDate } from '../shared/books.ts';
import { VAT, blankDraft, nextNumber, useBiz } from './store.ts';

let lineSeq = 0;

/** Write an invoice line by line with exact totals, preview it as the VAT bill, then issue it. */
export default function CreateScreen() {
  const { state, dispatch, go } = useBiz();
  const { draft } = state;
  const [tried, setTried] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const customer = state.customers.find((c) => c.id === draft.customerId);
  const date = parseIsoDate(draft.date);
  const { lines: converted, incomplete } = lineItemsToInvoiceLines(draft.lines);
  const lines: TaxInvoiceLine[] = converted.map((l) => ({ ...l, description: draft.lines.find((x) => x.id === l.id)?.description.trim() || 'Item' }));
  const problems: string[] = [];
  if (!customer) problems.push('Choose a customer.');
  if (!date) problems.push('Enter the invoice date as YYYY-MM-DD.');
  else if (compareDates(date, TODAY) > 0) problems.push('An invoice cannot be dated after today.');
  if (!lines.length) problems.push('Add at least one line with a quantity and a rate.');
  if (incomplete.length) problems.push(`${incomplete.length} ${incomplete.length === 1 ? 'line is' : 'lines are'} not finished: complete or remove ${incomplete.length === 1 ? 'it' : 'them'}.`);
  if (draft.lines.some((l) => !l.description.trim())) problems.push('Every line needs a description.');
  const setDraft = (patch: Partial<typeof draft>) => dispatch({ type: 'draft', draft: patch });
  const step = (next: 'edit' | 'preview') => {
    setDraft({ step: next });
    requestAnimationFrame(() => top.current?.querySelector<HTMLElement>('[data-screen-title]')?.focus());
  };

  return (
    <div className="app-stack" ref={top}>
      <ScreenTitle aside={<span className="app-muted app-small">Next number {nextNumber(state)}</span>}>New invoice</ScreenTitle>
      {draft.step === 'edit' ? (
        <>
          <Card title="Bill to" headingLevel={3}>
            <div className="bz-form-grid">
              <Select label="Customer" labelPlacement="above" value={draft.customerId} onChange={(customerId) => setDraft({ customerId })} options={state.customers.map((c) => ({ value: c.id, label: c.name }))} testId="bz-create-customer" />
              <Field label="Invoice date (AD)" type="date" value={draft.date} onChange={(value) => setDraft({ date: value })} max="2026-11-01" testId="bz-create-date" />
              <p className="bz-terms">
                <span className="app-muted">PAN {customer?.pan ?? '—'} · {customer?.terms ?? 0} days</span>
                <br />
                Due {date && customer ? shortDate(addDays(date, customer.terms)) : '—'}
              </p>
            </div>
          </Card>
          <Card title="Lines" description="Quantities may have decimals (hours, kilograms). Untick VAT for an exempt item such as printed books." headingLevel={3}>
            <LineItemEditor
              lines={draft.lines}
              onChange={(next) => setDraft({ lines: next })}
              newLine={() => ({ id: `n${++lineSeq}-${draft.lines.length}`, description: '', quantity: '1', rate: '', taxable: true })}
              vatRate={VAT.vatRate}
              rounding={VAT.rounding}
              maxLines={30}
              testId="bz-lines"
            />
            <Field label="Notes on the bill" value={draft.notes} onChange={(notes) => setDraft({ notes })} placeholder="Terms, bank details or a reference" testId="bz-create-notes" />
          </Card>
          {tried && problems.length > 0 && (
            <Note tone="error">
              <ul className="bz-problems">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
            </Note>
          )}
          <div className="bz-actions">
            <Button onClick={() => { setTried(true); if (!problems.length) step('preview'); }} testId="bz-create-preview">Preview the bill</Button>
            <Button variant="ghost" onClick={() => dispatch({ type: 'draft', draft: blankDraft() })}>Start again</Button>
          </div>
        </>
      ) : (
        <>
          <Card title="Check the bill" description="This is what the customer receives. Issue it to add it to the invoice list." headingLevel={3}>
            <div className="bz-print">
              {customer && date && (
                <TaxInvoice
                  seller={{ name: COMPANY.name, address: COMPANY.address, contact: COMPANY.contact, pan: COMPANY.pan }}
                  buyer={{ name: customer.name, address: customer.address, pan: customer.pan }}
                  invoiceNumber={nextNumber(state)}
                  date={date}
                  dueDate={addDays(date, customer.terms)}
                  paymentMode={`Credit, ${customer.terms} days`}
                  lines={lines}
                  vatRate={VAT.vatRate}
                  rounding={VAT.rounding}
                  notes={draft.notes.trim() || `Bank: ${COMPANY.bank}. Please quote the invoice number.`}
                  headingLevel={3}
                  printable
                  testId="bz-preview"
                />
              )}
            </div>
          </Card>
          <div className="bz-actions">
            <Button onClick={() => { dispatch({ type: 'issue', lines }); go('invoices'); }} testId="bz-create-issue">Issue invoice</Button>
            <Button variant="secondary" onClick={() => step('edit')}>Back to the lines</Button>
          </div>
        </>
      )}
    </div>
  );
}
