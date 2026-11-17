import { BreadthChart } from '@punji/ui/breadth-chart';
import { Card } from '@punji/ui/card';
import { sampleBreadthDays } from '../../sample.ts';

// The advance-decline line: each day's advances minus declines added to a running total. Days come in as the counts that
// MarketBreadth shows. A rising line means more stocks are taking part in the rise than not.
const days = sampleBreadthDays(120);

export default function Example() {
  return (
    <Card title="A/D line over 120 sessions" description="Move the cursor to read each day's counts and whether advances or declines led.">
      <BreadthChart mode="advance-decline" label="Market advance-decline line" days={days} />
    </Card>
  );
}
