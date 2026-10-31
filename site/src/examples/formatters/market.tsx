import { formatChange, formatBasisPoints, formatQuantity, formatPrice } from '@punji/ui/nepal/market-format';

export default function Example() {
  return (
    <dl className="ex-grid">
      <div><dt>formatChange(1.255, percent)</dt><dd>{formatChange(1.255, { unit: 'percent' })}</dd></div>
      <div><dt>formatChange(-0.004)</dt><dd>{formatChange(-0.004)}</dd></div>
      <div><dt>formatBasisPoints(-25, signed)</dt><dd>{formatBasisPoints(-25, { signed: true })}</dd></div>
      <div><dt>formatQuantity(1234567)</dt><dd>{formatQuantity(1234567)}</dd></div>
      <div><dt>formatPrice(540.5, NPR)</dt><dd>{formatPrice(540.5, { currency: 'NPR' })}</dd></div>
      <div><dt>formatPrice(null)</dt><dd>{formatPrice(null)}</dd></div>
    </dl>
  );
}
