import { money } from '@punji/ui/money';
import { PayoffChart } from '@punji/ui/payoff-chart';

const npr = (units: number) => money(BigInt(units) * 100n, 'NPR');

// A bull call spread on an index: buy the 22,000 call, sell the 22,500 call. Prices are exact Money.
export default function Example() {
  return (
    <PayoffChart
      label="Bull call spread, 22,000 and 22,500 calls"
      spot={npr(22140)}
      legs={[
        { kind: 'call', side: 'long', quantity: 1, multiplier: 50, strike: npr(22000), premium: npr(310) },
        { kind: 'call', side: 'short', quantity: 1, multiplier: 50, strike: npr(22500), premium: npr(120) },
      ]}
    />
  );
}
