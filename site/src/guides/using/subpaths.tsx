// Smallest bundle: import only the tokens, the base rules and the CSS of the modules you use...
import '@punji/ui/tokens.css';
import '@punji/ui/css/base.css';
import '@punji/ui/css/money.css';
// ...and import each component from its own subpath.
import { MoneyDisplay } from '@punji/ui/money-display';
import { formatMoney } from '@punji/ui/money';

export function Balance({ minor }: { minor: bigint }) {
  return (
    <p>
      <MoneyDisplay value={minor} currency="USD" locale="en-US" />
      {/* The same formatter, as a plain string for a title attribute or a CSV cell. */}
      <span hidden>{formatMoney(minor, { currency: 'USD', locale: 'en-US' })}</span>
    </p>
  );
}
