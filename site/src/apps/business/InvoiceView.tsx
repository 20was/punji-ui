import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { TaxInvoice } from '@punji/ui/tax-invoice';
import { COMPANY, rs, shortDate } from '../shared/books.ts';
import { MODES, STATUS, VAT, useBiz, type InvoiceRow } from './store.ts';

/** One issued invoice as the printable VAT bill, with what has been received against it. */
export default function InvoiceView({ row }: { row: InvoiceRow }) {
  const { state, dispatch, go } = useBiz();
  const { invoice, customer } = row;
  const payments = state.payments.filter((p) => p.invoiceId === invoice.id);
  return (
    <Card
      title={`${invoice.number} · ${STATUS[row.status]}`}
      description={row.balance > 0n ? `${rs(row.balance)} outstanding, due ${shortDate(invoice.due)}` : 'Settled in full'}
      headingLevel={3}
      action={
        <div className="bz-actions">
          {row.balance > 0n && (
            <Button size="sm" onClick={() => { dispatch({ type: 'pay-for', id: invoice.id }); go('payments'); }} testId="bz-view-pay">
              Record a payment
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'select', id: null })}>Close</Button>
        </div>
      }
      testId="bz-view"
    >
      <div className="bz-print">
        <TaxInvoice
          seller={{ name: COMPANY.name, address: COMPANY.address, contact: COMPANY.contact, pan: COMPANY.pan }}
          buyer={{ name: customer.name, address: customer.address, pan: customer.pan }}
          invoiceNumber={invoice.number}
          date={invoice.date}
          dueDate={invoice.due}
          paymentMode={`Credit, ${customer.terms} days`}
          lines={invoice.lines}
          vatRate={VAT.vatRate}
          rounding={VAT.rounding}
          notes={invoice.notes ?? `Bank: ${COMPANY.bank}. Please quote the invoice number.`}
          headingLevel={3}
          printable
          testId="bz-invoice"
        />
      </div>
      {payments.length > 0 && (
        <ul className="bz-paylist">
          {payments.map((p) => (
            <li key={p.id}>
              {shortDate(p.date)} · {MODES[p.mode]}{p.reference ? ` ${p.reference}` : ''}: {rs(p.amount)}
              {p.tds > 0n ? ` and TDS ${rs(p.tds)}` : ''}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
