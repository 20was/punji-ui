import { money } from '@punji/ui/money';
import { PayoffChart } from '@punji/ui/payoff-chart';

const npr = (units: number) => money(BigInt(units) * 100n, 'NPR');

// Shares plus a short call: the stock leg's premium is its entry price. Profit is capped, and the loss is bounded by zero.
export default function Example() {
  return (
    <PayoffChart
      label="Covered call on 100 shares"
      spot={npr(540)}
      legs={[
        { kind: 'stock', side: 'long', quantity: 100, premium: npr(520) },
        { kind: 'call', side: 'short', quantity: 1, multiplier: 100, strike: npr(580), premium: npr(14) },
      ]}
    />
  );
}
