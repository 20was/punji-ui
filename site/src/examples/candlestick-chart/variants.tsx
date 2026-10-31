import { CandlestickChart } from '@punji/ui/candlestick-chart';
import { nabilCandles } from '../../sample.ts';

// OHLC bars, red-up colours (some markets) and hollow up candles so direction survives without colour.
const recent = nabilCandles.slice(-30);

export default function Example() {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <CandlestickChart label="OHLC bars, last 30 sessions" candles={recent} variant="bars" volume={false} height={200} />
      <CandlestickChart label="Hollow up candles, red-up" candles={recent} hollowUp convention="red-up" volume={false} height={200} />
    </div>
  );
}
