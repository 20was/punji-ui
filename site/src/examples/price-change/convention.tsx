import { PriceChange } from '@punji/ui/price-change';

export default function Example() {
  return (
    <dl className="ex-grid">
      <div><dt>Up, red-up market</dt><dd><PriceChange current={10550n} previous={10000n} currency="USD" locale="en-US" convention="red-up" /></dd></div>
      <div><dt>Down, red-up market</dt><dd><PriceChange current={9000n} previous={10000n} currency="USD" locale="en-US" convention="red-up" /></dd></div>
      <div>
        <dt>Spoken in Nepali</dt>
        <dd><PriceChange current={10550n} previous={10000n} currency="NPR" locale="en-IN" labels={{ up: 'बढ्यो', down: 'घट्यो', flat: 'उस्तै' }} /></dd>
      </div>
    </dl>
  );
}
