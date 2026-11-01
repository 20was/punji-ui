import { Card } from '@punji/ui/card';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';

// The Nepal preset: lakh and crore grouping (12,34,567.89), Devanagari digits on request, and a compact form
// for tight spaces that is display-rounded (the exact value is still what screen readers hear).
const npr = nepalMoneyConfig();
const nepali = nepalMoneyConfig({ language: 'ne', digits: 'deva' });

export default function Example() {
  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))' }}>
      <Card title="Savings account" description="NIC Asia Bank · Available balance">
        <p style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          <MoneyDisplay value={123456789n} preset={npr} />
        </p>
        <p style={{ margin: 0, fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)' }} lang="ne">
          <MoneyDisplay value={123456789n} preset={nepali} />
        </p>
      </Card>
      <Card title="Market capitalisation" description="Compact, display-rounded">
        <p style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          <MoneyDisplay value={12345678900n} preset={npr} compact />
        </p>
        <p style={{ margin: 0, fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)' }}>
          Exact: <MoneyDisplay value={12345678900n} preset={npr} />
        </p>
      </Card>
    </div>
  );
}
