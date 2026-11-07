import { money } from '@punji/ui/money';
import { PayoffChart } from '@punji/ui/payoff-chart';

const npr = (units: number) => money(BigInt(units) * 100n, 'NPR');

// A long straddle: profit is unlimited, so it says so in words. The dashed line is a payoff today that you priced yourself
// (here, invented values); the chart draws and lists it but never computes one.
export default function Example() {
  return (
    <PayoffChart
      label="Long straddle at 22,000, with today's value"
      spot={npr(22140)}
      todayLabel="Today (your model)"
      today={[
        { spot: npr(21000), value: npr(31_000) },
        { spot: npr(21500), value: npr(9_000) },
        { spot: npr(22000), value: npr(-6_000) },
        { spot: npr(22500), value: npr(8_000) },
        { spot: npr(23000), value: npr(30_000) },
      ]}
      legs={[
        { kind: 'call', side: 'long', quantity: 1, multiplier: 50, strike: npr(22000), premium: npr(260) },
        { kind: 'put', side: 'long', quantity: 1, multiplier: 50, strike: npr(22000), premium: npr(240) },
      ]}
    />
  );
}
