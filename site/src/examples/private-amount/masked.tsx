import { AmountsToggle, useAmountsHidden } from '@punji/ui/private-amount';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Figure } from '@punji/ui/figures';
import { money } from '@punji/ui/money';
import { Card } from '@punji/ui/card';

// When you already hold the state (a table cell, a headline), pass it as `masked`. The amount is not rendered at all.
export default function Example() {
  const hidden = useAmountsHidden();
  return (
    <Card title="Balances" action={<AmountsToggle />}>
      <div style={{ display: 'grid', gap: 8 }}>
        <div>
          Savings: <MoneyDisplay currency="NPR" value={48250075n} masked={hidden} />
        </div>
        <div>
          Dividend: <Figure value={money(1250000n, 'NPR')} masked={hidden} />
        </div>
        <div>
          Units held: <Figure value={1250} kind="int" masked={hidden} />
        </div>
      </div>
    </Card>
  );
}
