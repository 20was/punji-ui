import { CandlestickChart } from '@punji/ui/candlestick-chart';

// A wrong candle is not drawn, is counted under the chart and stays in the table with its reason.
// The time axis keeps the holiday gap; the default session axis would close it.
const candles = [
  { date: '2025-11-09', open: 480, high: 486, low: 478, close: 484, volume: 41_000 },
  { date: '2025-11-10', open: 484, high: 489, low: 483, close: 488, volume: 52_500 },
  { date: '2025-11-11', open: 488, high: 486, low: 484, close: 485, volume: 38_000 },
  { date: '2025-11-12', open: 485, high: 487, low: 481, close: 482, volume: null },
  { date: '2025-11-23', open: 482, high: 490, low: 480, close: 489, volume: 61_200 },
  { date: '2025-11-24', open: 489, high: 489, low: 489, close: 489, volume: 0 },
];

export default function Example() {
  return <CandlestickChart label="NABIL with a bad candle, a missing volume and a gap" candles={candles} axis="time" height={220} />;
}
