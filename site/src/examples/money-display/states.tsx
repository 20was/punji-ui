import { Card } from '@punji/ui/card';
import { MoneyDisplay } from '@punji/ui/money-display';

// A statement summary: accounting negatives in parentheses, a plain minus sign, and missing values.
// A missing value is a dash that screen readers hear as "No value", never a zero that looks like a real amount.
export default function Example() {
  return (
    <div className="ex-narrow">
      <Card title="October statement" description="Business current account, USD">
        <ul className="ex-rows">
          <li>
            <span>
              <b>Card fees</b>
              <small>Accounting style</small>
            </span>
            <MoneyDisplay value={-250n} currency="USD" locale="en-US" accounting />
          </li>
          <li>
            <span>
              <b>Refund issued</b>
              <small>Sign display</small>
            </span>
            <MoneyDisplay value={-250n} currency="USD" locale="en-US" />
          </li>
          <li>
            <span>
              <b>Interest earned</b>
              <small>Not posted yet</small>
            </span>
            <MoneyDisplay value={null} currency="USD" locale="en-US" />
          </li>
          <li>
            <span>
              <b>FX adjustment</b>
              <small>Custom missing text</small>
            </span>
            <MoneyDisplay value={undefined} currency="USD" locale="en-US" missing="n/a" missingLabel="Not published" />
          </li>
        </ul>
      </Card>
    </div>
  );
}
