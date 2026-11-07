import { CandlestickChart, type PriceEvent, type PriceLevel } from '@punji/ui/candlestick-chart';
import { Card } from '@punji/ui/card';
import { nabilCandles } from '../../sample.ts';

// Events sit on the time axis (a circle for a dividend, a diamond for a split, a square for earnings, a triangle for
// your own) and are listed in a table; focus the chart and press Shift with the arrow keys to jump between them.
// Levels are dashed lines (support dotted-dash, resistance dotted, cost basis dash-dot) whose labels never overlap.
const at = (i: number) => nabilCandles[i]!.date;
const last = nabilCandles.at(-1)!.close;
const events: PriceEvent[] = [
  { date: at(12), kind: 'dividend', label: 'Bonus 10%', detail: 'Book closure after this date' },
  { date: at(28), kind: 'earnings', label: 'Q1 results' },
  { date: at(41), kind: 'split', label: '1:2 split' },
  { date: at(52), kind: 'custom', label: 'AGM' },
];
const levels: PriceLevel[] = [
  { price: Math.round(last * 0.96), label: 'Support', kind: 'support' },
  { price: Math.round(last * 0.97), label: 'Your cost', kind: 'cost-basis' },
  { price: Math.round(last * 1.04), label: 'Resistance', kind: 'resistance' },
];

export default function Example() {
  return (
    <Card title="NABIL, events and levels" description="Press Shift with the arrow keys to jump between events.">
      <CandlestickChart label="NABIL with events and levels" candles={nabilCandles} events={events} levels={levels} height={260} />
    </Card>
  );
}
