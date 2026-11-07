import { AmountsToggle, PrivateAmount } from '@punji/ui/private-amount';
import { Card } from '@punji/ui/card';

// One store for the whole app: the eye hides every PrivateAmount, in this tab and the others, and the choice is
// remembered on this device. Only private amounts are wrapped; the percentage is a published figure.
export default function Example() {
  return (
    <Card title="Portfolio" action={<AmountsToggle />}>
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 28, fontWeight: 700 }}>
          <PrivateAmount>Rs 12,48,350.00</PrivateAmount>
        </div>
        <div>
          Today: <PrivateAmount>+Rs 8,420.00</PrivateAmount> (+0.68%)
        </div>
      </div>
    </Card>
  );
}
