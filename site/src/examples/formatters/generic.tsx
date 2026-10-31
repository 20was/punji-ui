import { Card } from '@punji/ui/card';
import { formatCompactMoney, formatMoney, parseMoney } from '@punji/ui/money';
import { DataRow, DataRows } from '@punji/ui/rows';

// Strings for places a component cannot go: a notification, an email, a title attribute, a CSV cell.
// Each currency keeps its own decimals: yen has none, the Kuwaiti dinar has three.
const usd = { currency: 'USD', locale: 'en-US' } as const;
const eur = { currency: 'EUR', locale: 'de-DE' } as const;
const typed = parseMoney('1.234,56', eur);

export default function Example() {
  return (
    <Card title="Client payments" description={`Received this year: ${formatCompactMoney(123456789n, usd)}`} headingLevel={3}>
      <DataRows label="Payments in four currencies">
        <DataRow label="Brightline Studio" value={formatMoney(123456n, usd)} />
        <DataRow label="Kumo Hosting" value={formatMoney(1234567n, { currency: 'JPY', locale: 'ja-JP' })} />
        <DataRow label="Gulf Data Co." value={formatMoney(1234567n, { currency: 'KWD', locale: 'en-US' })} />
        <DataRow label="Atelier Nord" value={formatMoney(123456n, eur)} />
        <DataRow label="Credit note" value={formatMoney(-123n, { ...usd, accounting: true })} />
        <DataRow label="Typed “1.234,56”" value={typed.state === 'valid' ? `${formatMoney(typed.minor, eur)} (${typed.minor} cents)` : typed.state} />
      </DataRows>
    </Card>
  );
}
