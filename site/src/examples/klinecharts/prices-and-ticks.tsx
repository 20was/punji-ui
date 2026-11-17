import { Card } from '@punji/ui/card';
import { createMoneyChartFormatter, mergeTickIntoBar, type KLineMoneyBar } from '@punji/ui/klinecharts';
import { DataRow, DataRows } from '@punji/ui/rows';

// No chart library runs on this page: these are the adapter's own helpers. In your app, feed ticks through the chart's
// ref: ref.current.tick({ timestamp, price }, 60_000).
const format = createMoneyChartFormatter({ currency: 'NPR', locale: 'en-IN', display: 'code' });
const ticks = [
  { timestamp: 1_000, price: 9007199254740993n },
  { timestamp: 21_000, price: 9007199254740995n },
  { timestamp: 50_000, price: 9007199254740991n },
];
let bar: KLineMoneyBar | undefined;
for (const tick of ticks) bar = mergeTickIntoBar(bar, tick, 60_000) ?? bar;

export default function Example() {
  return (
    <Card title="Price formatter and tick merge" description="Prices past 2^53 minor units stay exact; ticks fold into one bar." headingLevel={3}>
      <DataRows label="One 60 second bar built from three ticks" flush>
        <DataRow label="Open" value={format(bar!.open)} />
        <DataRow label="High" value={format(bar!.high)} />
        <DataRow label="Low" value={format(bar!.low)} />
        <DataRow label="Close" value={format(bar!.close)} />
      </DataRows>
    </Card>
  );
}
