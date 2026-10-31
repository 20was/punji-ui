import { formatMoney, formatCompactMoney, nepalMoneyConfig } from '@punji/ui/money';
import { formatNPR, formatPercent } from '@punji/ui/nepal/format';
import { formatMinorUnits } from '@punji/ui/nepal/financial-format';

export default function Example() {
  return (
    <dl className="ex-grid">
      <div><dt>formatMoney, Nepal preset</dt><dd>{formatMoney(123456789n, nepalMoneyConfig())}</dd></div>
      <div><dt>Devanagari</dt><dd lang="ne">{formatMoney(123456789n, nepalMoneyConfig({ language: 'ne', digits: 'deva' }))}</dd></div>
      <div><dt>Compact (Cr)</dt><dd>{formatCompactMoney(12345678900n, nepalMoneyConfig())}</dd></div>
      <div><dt>formatMinorUnits (paisa)</dt><dd>{formatMinorUnits(123456789n)}</dd></div>
      <div><dt>formatNPR (display value)</dt><dd>{formatNPR(1234567.89)}</dd></div>
      <div><dt>formatPercent(5)</dt><dd>{formatPercent(5)}</dd></div>
    </dl>
  );
}
