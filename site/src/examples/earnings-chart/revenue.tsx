import { EarningsChart } from '@punji/ui/earnings-chart';
import { money } from '@punji/ui/money';

const npr = (crore: number) => money(BigInt(Math.round(crore * 100)) * 10_000_000n, 'NPR');

// Revenue as Money, drawn as bars with the estimate as a tick.
export default function Example() {
  return (
    <EarningsChart
      label="Revenue against estimate"
      measure="Revenue"
      variant="bars"
      periods={[
        { key: 'a', label: 'Q1', estimate: npr(210), actual: npr(224.5) },
        { key: 'b', label: 'Q2', estimate: npr(225), actual: npr(219) },
        { key: 'c', label: 'Q3', estimate: npr(232), actual: npr(241.25) },
        { key: 'd', label: 'Q4', estimate: npr(248) },
      ]}
    />
  );
}
