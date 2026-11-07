import { FanChart } from '@punji/ui/fan-chart';

// Invented projection: NPR 5,00,000 growing at 2%, 5%, 8%, 11% and 14% a year (the 5th to 95th percentiles), six steps of five years.
const RATES = [0.02, 0.05, 0.08, 0.11, 0.14];
const steps = [5, 10, 15, 20, 25, 30].map((years) => ({
  x: `${2026 + years}`,
  values: RATES.map((r) => (500_000 * (1 + r) ** years).toFixed(2)),
}));

export default function Example() {
  return <FanChart label="Retirement pot, 30 years" start={{ x: 'Today', value: '500000' }} steps={steps} />;
}
