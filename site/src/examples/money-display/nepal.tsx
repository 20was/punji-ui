import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';

export default function Example() {
  return (
    <dl className="ex-grid">
      <div><dt>Lakh and crore grouping</dt><dd><MoneyDisplay value={123456789n} preset={nepalMoneyConfig()} /></dd></div>
      <div><dt>Devanagari digits</dt><dd><MoneyDisplay value={123456789n} preset={nepalMoneyConfig({ language: 'ne', digits: 'deva' })} /></dd></div>
      <div><dt>Compact (display-rounded)</dt><dd><MoneyDisplay value={12345678900n} preset={nepalMoneyConfig()} compact /></dd></div>
    </dl>
  );
}
