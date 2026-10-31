import { MoneyDisplay } from '@punji/ui/money-display';

export default function Example() {
  return (
    <dl className="ex-grid">
      <div><dt>USD</dt><dd><MoneyDisplay value={123456n} currency="USD" locale="en-US" /></dd></div>
      <div><dt>EUR, German locale</dt><dd><MoneyDisplay value={123456n} currency="EUR" locale="de-DE" /></dd></div>
      <div><dt>JPY (no minor unit)</dt><dd><MoneyDisplay value={1234567n} currency="JPY" locale="ja-JP" /></dd></div>
      <div><dt>KWD (three decimals)</dt><dd><MoneyDisplay value={1234567n} currency="KWD" locale="en-US" /></dd></div>
      <div><dt>Exact decimal string</dt><dd><MoneyDisplay value="1234.50" currency="AUD" locale="en-US" /></dd></div>
    </dl>
  );
}
