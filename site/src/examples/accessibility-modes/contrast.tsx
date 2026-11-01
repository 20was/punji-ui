import { Button } from '@punji/ui/button';
import { Delta } from '@punji/ui/figures';
import { MoneyDisplay } from '@punji/ui/money-display';
import type { ThemeName } from '@punji/ui/theme';

const Panel = ({ theme }: { theme: ThemeName }) => (
  <div data-theme={theme} style={{ display: 'grid', gap: 8, padding: 'var(--pu-space-4)', borderRadius: 'var(--pu-radius-lg)', border: '1px solid var(--pu-color-card-border)', background: 'var(--pu-color-surface)', color: 'var(--pu-color-text)' }}>
    <code style={{ fontSize: 12, color: 'var(--pu-color-text-muted)' }}>data-theme="{theme}"</code>
    <strong style={{ fontSize: 'var(--pu-text-lg)' }}>
      <MoneyDisplay value={124835000n} currency="NPR" locale="en-IN" />
    </strong>
    <span style={{ display: 'flex', gap: 12 }}>
      <Delta value={2.41} kind="pct" />
      <Delta value={-1.18} kind="pct" />
    </span>
    <span style={{ display: 'flex', gap: 8 }}>
      <Button size="sm">Buy</Button>
      <Button size="sm" variant="secondary">Sell</Button>
    </span>
  </div>
);

/** The four colour themes side by side. The -hc pair meets 7:1 for every text token. */
export default function Example() {
  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))' }}>
      <Panel theme="light" />
      <Panel theme="dark" />
      <Panel theme="light-hc" />
      <Panel theme="dark-hc" />
    </div>
  );
}
