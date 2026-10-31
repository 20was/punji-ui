import { Card } from '@punji/ui/card';
import { formatCompactMoney, formatMoney, parseMoney } from '@punji/ui/money';

// Strings for places a component cannot go: a notification, an email, a title attribute, a CSV cell.
// Each currency keeps its own decimals: yen has none, the Kuwaiti dinar has three.
const usd = { currency: 'USD', locale: 'en-US' } as const;
const eur = { currency: 'EUR', locale: 'de-DE' } as const;
const typed = parseMoney('1.234,56', eur);

const feed = [
  { who: 'Brightline Studio', what: `paid you ${formatMoney(123456n, usd)}`, when: '09:42' },
  { who: 'Kumo Hosting', what: `charged ${formatMoney(1234567n, { currency: 'JPY', locale: 'ja-JP' })} for November`, when: '08:15' },
  { who: 'Gulf Data Co.', what: `sent an invoice for ${formatMoney(1234567n, { currency: 'KWD', locale: 'en-US' })}`, when: 'Yesterday' },
  { who: 'Atelier Nord', what: `paid ${formatMoney(123456n, eur)}`, when: 'Yesterday' },
  { who: 'Statement', what: `shows a credit note of ${formatMoney(-123n, { ...usd, accounting: true })}`, when: 'Mon' },
];

export default function Example() {
  return (
    <div className="ex-medium">
      <Card title="Activity" description={`Received this year: ${formatCompactMoney(123456789n, usd)}`} headingLevel={3}>
        <ul className="ex-rows">
          {feed.map((item) => (
            <li key={item.who}>
              <span>
                <b>{item.who}</b>
                <small>{item.what}</small>
              </span>
              <small>{item.when}</small>
            </li>
          ))}
        </ul>
        <p className="ex-label">
          A client typed “1.234,56”, read as {typed.state === 'valid' ? formatMoney(typed.minor, eur) : 'not a valid amount'} ({typed.state === 'valid' ? `${typed.minor} cents` : typed.state}).
        </p>
      </Card>
    </div>
  );
}
