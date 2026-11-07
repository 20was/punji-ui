import { Card } from '@punji/ui/card';
import { createMoneyChartFormatter, mergeTickIntoCandle, type MoneyCandle } from '@punji/ui/lightweight-charts';
import { DataRow, DataRows } from '@punji/ui/rows';

// No chart library runs on this page: these are the adapter's own helpers. In your app, pass the same formatter as the
// series priceFormat (moneyPriceFormat does) and feed ticks through the chart's ref: ref.current.tick(tick, 60).
const format = createMoneyChartFormatter({ currency: 'NPR', locale: 'en-IN', display: 'code' });
const ticks = [
  { time: 1_000, price: 9007199254740993n },
  { time: 1_020, price: 9007199254740995n },
  { time: 1_050, price: 9007199254740991n },
];
let candle: MoneyCandle | undefined;
for (const tick of ticks) candle = mergeTickIntoCandle(candle, tick, 60) ?? candle;

export default function Example() {
  return (
    <Card title="Price formatter and tick merge" description="Prices past 2^53 minor units stay exact; ticks fold into one candle." headingLevel={3}>
      <DataRows label="One 60 second candle built from three ticks" flush>
        <DataRow label="Open" value={format(candle!.open)} />
        <DataRow label="High" value={format(candle!.high)} />
        <DataRow label="Low" value={format(candle!.low)} />
        <DataRow label="Close" value={format(candle!.close)} />
      </DataRows>
    </Card>
  );
}
