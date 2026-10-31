import { useState } from 'react';
import { PerformanceChart } from '@punji/ui/performance-chart';
import { SegmentedControl } from '@punji/ui/controls';
import { performanceDates, performanceSeries } from '../../sample.ts';

// The period selector is yours: slice the dates and every series to the same range.
const RANGES = { '1M': 22, '3M': 60, All: 60 } as const;
type Range = keyof typeof RANGES;

export default function Example() {
  const [range, setRange] = useState<Range>('All');
  const from = performanceDates.length - Math.min(RANGES[range], performanceDates.length);
  return (
    <PerformanceChart
      label="Portfolio against NEPSE and Sensitive"
      dates={performanceDates.slice(from)}
      series={performanceSeries.map((s) => ({ ...s, values: s.values.slice(from) }))}
      periods={
        <SegmentedControl<Range>
          label="Period"
          prefix="perf-range"
          size="sm"
          value={range}
          onChange={setRange}
          options={(Object.keys(RANGES) as Range[]).map((value) => ({ value, label: value }))}
        />
      }
    />
  );
}
