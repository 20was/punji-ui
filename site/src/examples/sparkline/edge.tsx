import { Card } from '@punji/ui/card';
import { Sparkline } from '@punji/ui/sparkline';
import { DataRow, DataRows } from '@punji/ui/rows';
import { sampleCloses } from '../../sample.ts';

// Gaps are dropped (not zero). Fewer than two real values draw a dashed rule. Long series keep their spikes.
const long = sampleCloses(500, 3, 400);
long[200] = 700;

export default function Example() {
  return (
    <Card title="Awkward feeds" description="What a trend column shows when the data is thin" headingLevel={3}>
      <DataRows label="Trend edge cases">
        <DataRow label="Two missing days" value={<Sparkline values={[10, null, 12, undefined, Number.NaN, 15, 14]} label="Gaps dropped" />} />
        <DataRow label="Newly listed" value={<Sparkline values={[42]} label="One close" />} />
        <DataRow label="No history" value={<Sparkline values={[]} label="No closes" />} />
        <DataRow label="400 closes, one spike" value={<Sparkline values={long} maxPoints={60} label="400 closes with one spike" />} />
      </DataRows>
    </Card>
  );
}
