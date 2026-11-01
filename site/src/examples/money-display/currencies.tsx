import { Card } from '@punji/ui/card';
import { MoneyDisplay } from '@punji/ui/money-display';
import { RowList, ValueRow } from '@punji/ui/rows';

// One component, five currencies: each row is configuration (currency and locale), not code.
// Amounts are bigint minor units: cents, yen (no minor unit) or fils (three decimals).
const wallets = [
  { name: 'US dollar', detail: 'Cents, en-US', value: 123456n, currency: 'USD', locale: 'en-US' },
  { name: 'Euro', detail: 'German formatting, de-DE', value: 123456n, currency: 'EUR', locale: 'de-DE' },
  { name: 'Japanese yen', detail: 'No minor unit', value: 1234567n, currency: 'JPY', locale: 'ja-JP' },
  { name: 'Kuwaiti dinar', detail: 'Three decimals', value: 1234567n, currency: 'KWD', locale: 'en-US' },
] as const;

export default function Example() {
  return (
    <div style={{ width: 'min(100%, 440px)', marginInline: 'auto' }}>
      <Card title="Wallet balances" description="Synced 2 minutes ago" meta="4">
        <RowList>
          {wallets.map((w) => (
            <ValueRow key={w.currency} title={w.name} line={w.detail} figure={<MoneyDisplay value={w.value} currency={w.currency} locale={w.locale} />} />
          ))}
          <ValueRow title="Australian dollar" line="From an exact decimal string" figure={<MoneyDisplay value="1234.50" currency="AUD" locale="en-US" />} />
        </RowList>
      </Card>
    </div>
  );
}
