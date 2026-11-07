import { PerformanceChart } from '@punji/ui/performance-chart';
import { performanceDates, performanceSeries } from '../../sample.ts';

// axis="quiet": three levels inside the plot and only the first and last dates. A dashed second series is the benchmark.
export default function Example() {
  return (
    <div style={{ maxWidth: 420 }}>
      <PerformanceChart
        label="Last three months against NEPSE"
        dates={performanceDates}
        series={performanceSeries.slice(0, 2)}
        axis="quiet"
        height={140}
      />
    </div>
  );
}
