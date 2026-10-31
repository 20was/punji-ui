import { PerformanceChart } from '@punji/ui/performance-chart';
import { performanceDates, performanceSeries } from '../../sample.ts';

// normalize={false}: the portfolio's own rupee value, with the gain and loss area against its first value.
export default function Example() {
  return (
    <PerformanceChart
      label="Portfolio value"
      dates={performanceDates}
      series={performanceSeries.slice(0, 1)}
      normalize={false}
      formatValue={(v) => `Rs ${new Intl.NumberFormat('en-IN').format(v)}`}
    />
  );
}
