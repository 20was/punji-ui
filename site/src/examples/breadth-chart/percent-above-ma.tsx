import { useMemo } from 'react';
import { BreadthChart } from '@punji/ui/breadth-chart';
import { Card } from '@punji/ui/card';
import { sampleConstituents } from '../../sample.ts';

// The share of constituents whose close is above their own 50-day simple moving average, from decimal-string closes. A day
// with no constituent that has 50 closes yet has no share: the line starts later and the table says "none".
export default function Example() {
  const constituents = useMemo(() => sampleConstituents(40, 260), []);
  return (
    <Card title="Share of 40 stocks above their 50-day average" description="The dashed line is 50 percent.">
      <BreadthChart mode="percent-above-ma" label="Stocks above their 50-day average" constituents={constituents} period={50} />
    </Card>
  );
}
