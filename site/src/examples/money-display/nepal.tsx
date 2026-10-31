import { Card } from '@punji/ui/card';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';

// The Nepal preset: lakh and crore grouping (12,34,567.89), Devanagari digits on request, and a compact form
// for tight spaces that is display-rounded (the exact value is still what screen readers hear).
const npr = nepalMoneyConfig();
const nepali = nepalMoneyConfig({ language: 'ne', digits: 'deva' });

export default function Example() {
  return (
    <div className="ex-cols">
      <Card title="Savings account" description="NIC Asia Bank · Available balance">
        <p className="ex-big">
          <MoneyDisplay value={123456789n} preset={npr} />
        </p>
        <p className="ex-label" lang="ne">
          <MoneyDisplay value={123456789n} preset={nepali} />
        </p>
      </Card>
      <Card title="Market capitalisation" description="Compact, display-rounded">
        <p className="ex-big">
          <MoneyDisplay value={12345678900n} preset={npr} compact />
        </p>
        <p className="ex-label">
          Exact: <MoneyDisplay value={12345678900n} preset={npr} />
        </p>
      </Card>
    </div>
  );
}
