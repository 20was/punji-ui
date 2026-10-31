import { PriceChange } from '@punji/ui/price-change';

export default function Example() {
  return (
    <dl className="ex-grid">
      <div><dt>Up</dt><dd><PriceChange current={10550n} previous={10000n} currency="USD" locale="en-US" /></dd></div>
      <div><dt>Down</dt><dd><PriceChange current={9000n} previous={10000n} currency="USD" locale="en-US" /></dd></div>
      <div><dt>Unchanged</dt><dd><PriceChange current={10000n} previous={10000n} currency="USD" locale="en-US" /></dd></div>
      <div><dt>Percent only</dt><dd><PriceChange current={10550n} previous={10000n} currency="USD" locale="en-US" showAbsolute={false} /></dd></div>
    </dl>
  );
}
