import { CandlestickChart } from '@punji/ui/candlestick-chart';
import { nabilCandles } from '../../sample.ts';

// Sixty NABIL sessions (Sunday to Thursday) with volume, a 10-session simple and a 20-session exponential average.
export default function Example() {
  return (
    <CandlestickChart
      label="NABIL, daily candles with volume"
      candles={nabilCandles}
      averages={[{ type: 'sma', window: 10 }, { type: 'ema', window: 20 }]}
    />
  );
}
