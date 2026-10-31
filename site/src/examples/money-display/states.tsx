import { MoneyDisplay } from '@punji/ui/money-display';

export default function Example() {
  return (
    <dl className="ex-grid">
      <div><dt>Accounting negative</dt><dd><MoneyDisplay value={-250n} currency="USD" locale="en-US" accounting /></dd></div>
      <div><dt>Sign display</dt><dd><MoneyDisplay value={-250n} currency="USD" locale="en-US" /></dd></div>
      <div><dt>Missing value (never zero)</dt><dd><MoneyDisplay value={null} currency="USD" locale="en-US" /></dd></div>
      <div><dt>Custom missing text</dt><dd><MoneyDisplay value={undefined} currency="USD" locale="en-US" missing="n/a" missingLabel="Not published" /></dd></div>
    </dl>
  );
}
