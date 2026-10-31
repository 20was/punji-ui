import { Card } from '@punji/ui/card';
import { Sparkline } from '@punji/ui/sparkline';
import { DataRow, DataRows } from '@punji/ui/rows';
import { quotes } from '../../sample.ts';

// Default tone: gain when the last value is above the first, loss when below, flat when equal.
// tone="chart" is neutral, for a row that should not read as good or bad news.
const pick = (symbol: string) => quotes.find((q) => q.symbol === symbol)!;

export default function Example() {
  return (
    <Card title="30-day trend" description="Closing prices" headingLevel={3}>
      <DataRows label="Trends">
        <DataRow label="HDL" value={<Sparkline values={pick('HDL').history} label="HDL, 30 closes" />} />
        <DataRow label="CHCL" value={<Sparkline values={pick('CHCL').history} label="CHCL, 30 closes" />} />
        <DataRow label="SBL, unchanged" value={<Sparkline values={[331, 331, 331, 331]} label="SBL, unchanged" />} />
        <DataRow label="NABIL, neutral" value={<Sparkline values={pick('NABIL').history} tone="chart" width={120} height={32} label="NABIL, 30 closes" />} />
      </DataRows>
    </Card>
  );
}
