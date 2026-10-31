import { formatMoney, formatCompactMoney, parseMoney } from '@punji/ui/money';

const parsed = parseMoney('1.234,56', { currency: 'EUR', locale: 'de-DE' });

export default function Example() {
  return (
    <dl className="ex-grid">
      <div><dt>formatMoney USD</dt><dd>{formatMoney(123456n, { currency: 'USD', locale: 'en-US' })}</dd></div>
      <div><dt>JPY, exponent 0</dt><dd>{formatMoney(1234567n, { currency: 'JPY', locale: 'ja-JP' })}</dd></div>
      <div><dt>KWD, exponent 3</dt><dd>{formatMoney(1234567n, { currency: 'KWD', locale: 'en-US' })}</dd></div>
      <div><dt>EUR, German</dt><dd>{formatMoney(123456n, { currency: 'EUR', locale: 'de-DE' })}</dd></div>
      <div><dt>Accounting negative</dt><dd>{formatMoney(-123n, { currency: 'USD', locale: 'en-US', accounting: true })}</dd></div>
      <div><dt>Compact USD</dt><dd>{formatCompactMoney(123456789n, { currency: 'USD', locale: 'en-US' })}</dd></div>
      <div>
        <dt>parseMoney("1.234,56", EUR)</dt>
        <dd>{parsed.state === 'valid' ? `${parsed.value} (${parsed.minor}n minor)` : parsed.state}</dd>
      </div>
    </dl>
  );
}
