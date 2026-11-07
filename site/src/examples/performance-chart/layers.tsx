import { PerformanceChart } from '@punji/ui/performance-chart';
import { performanceDates, performanceSeries } from '../../sample.ts';

const rs = (v: number) => `Rs ${new Intl.NumberFormat('en-IN').format(Math.round(v))}`;
// The money put in: Rs 10 lakh at the start and a top-up of Rs 1 lakh on the 30th date.
const putIn = performanceDates.map((_, i) => (i < 30 ? 1_000_000 : 1_100_000));

export default function Example() {
  return (
    <PerformanceChart
      label="Plan value against the money put in, with a goal and the fall from each high"
      dates={performanceDates}
      series={performanceSeries.slice(0, 1).map((s) => ({ ...s, label: 'Plan value' }))}
      normalize={false}
      area={false}
      formatValue={rs}
      reference={{ value: 1_150_000, label: 'Goal' }}
      contributions={putIn}
      drawdown
    />
  );
}
