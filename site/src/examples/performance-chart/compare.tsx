import { PerformanceChart } from '@punji/ui/performance-chart';
import { performanceDates, performanceSeries } from '../../sample.ts';

// rebase={100}: every series is an index that starts at 100, so a rupee portfolio and two indices compare on one scale.
// endLabels prints each last level at the right edge; the labels spread apart where the lines finish close together.
export default function Example() {
  return (
    <PerformanceChart
      label="Portfolio, NEPSE and Sensitive, each rebased to 100"
      dates={performanceDates}
      series={performanceSeries}
      rebase={100}
      area={false}
      endLabels
      formatIndex={(v) => v.toFixed(1)}
    />
  );
}
