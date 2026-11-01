import { amountInWords, checkPan, computeIncomeTax, computeInvoice, type TaxSlab } from '@punji/ui/tax';

// Pure helpers: the same arithmetic on the server as on the screen. Amounts are bigint paisa.
const invoice = computeInvoice(
  [{ id: 'a', quantity: 3n, rate: 1_250_000n }, { id: 'b', quantity: '2.5', rate: 18_000n, taxable: false }],
  { vatRate: '0.13', rounding: 'half-up', discount: { amount: 100_000n } },
);
// Example slabs only.
const slabs: TaxSlab[] = [{ width: 50_000_000n, rate: '0.01', waivable: true }, { width: 20_000_000n, rate: '0.1' }, { width: null, rate: '0.2' }];
const tax = computeIncomeTax(90_000_000n, slabs, { rounding: 'half-up' });

export default function Example() {
  return (
    <dl className="ex-grid">
      <div><dt>Invoice total, paisa</dt><dd><code>{invoice.total.toString()}n</code></dd></div>
      <div><dt>VAT on {invoice.taxable.toString()}n taxable</dt><dd><code>{invoice.vat.toString()}n</code></dd></div>
      <div><dt>In words</dt><dd>{amountInWords(invoice.total)}</dd></div>
      <div><dt>In Nepali</dt><dd lang="ne">{amountInWords(invoice.total, { language: 'ne' })}</dd></div>
      <div><dt>checkPan('३०१ २३४ ५६७')</dt><dd><code>{JSON.stringify(checkPan('३०१ २३४ ५६७'))}</code></dd></div>
      <div><dt>Tax on 9 lakh (example slabs)</dt><dd><code>{tax.tax.toString()}n</code></dd></div>
    </dl>
  );
}
