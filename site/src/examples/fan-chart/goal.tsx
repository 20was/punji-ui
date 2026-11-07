import { FanChart } from '@punji/ui/fan-chart';

// Three levels, and a goal that falls between the median and the 90th percentile.
const RATES = [0.03, 0.07, 0.11];
const steps = [2, 4, 6, 8, 10].map((years) => ({
  x: `Year ${years}`,
  values: RATES.map((r) => (250_000 * (1 + r) ** years).toFixed(2)),
}));

export default function Example() {
  return <FanChart label="House deposit fund" levels={[10, 50, 90]} start={{ x: 'Now', value: '250000' }} steps={steps} goal="500000" labels={{ goal: 'Deposit goal' }} />;
}
