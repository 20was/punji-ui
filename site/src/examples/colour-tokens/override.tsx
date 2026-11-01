import { MoneyDisplay } from '@punji/ui/money-display';
import { PriceChange } from '@punji/ui/price-change';

const Panel = ({ theme }: { theme: 'light' | 'dark' }) => (
  <div
    data-theme={theme}
    style={{ padding: 'var(--pu-space-4)', borderRadius: 'var(--pu-radius-lg)', background: 'var(--pu-color-surface)', color: 'var(--pu-color-text)', border: '1px solid var(--pu-color-card-border)' }}
  >
    <p style={{ margin: 0, color: 'var(--pu-color-text-muted)' }}>data-theme="{theme}"</p>
    <p style={{ margin: 0, fontSize: 'var(--pu-text-lg)', fontWeight: 600 }}>
      <MoneyDisplay value={123456789n} currency="NPR" locale="en-IN" />
    </p>
    <PriceChange current={48750n} previous={48100n} currency="NPR" locale="en-IN" />
  </div>
);

export default function Example() {
  return (
    <div style={{ display: 'grid', gap: '16px 20px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))' }}>
      <Panel theme="light" />
      <Panel theme="dark" />
    </div>
  );
}
