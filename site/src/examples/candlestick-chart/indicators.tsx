import { CandlestickChart } from '@punji/ui/candlestick-chart';
import { Card } from '@punji/ui/card';
import { bollingerIndicator } from '@punji/ui/bollinger-indicator';
import { macdIndicator } from '@punji/ui/macd-indicator';
import { rsiIndicator } from '@punji/ui/rsi-indicator';
import { vwapIndicator } from '@punji/ui/vwap-indicator';
import { sampleCandles } from '../../sample.ts';

// Each indicator is its own module: import only the ones you draw and a plain candlestick chart ships none of their maths.
// Bollinger Bands and VWAP draw over the price; RSI and MACD get a pane each below it with a title, the latest value
// and axis levels. The table gains a column per line and the readout says the zone in words ("overbought").
const candles = sampleCandles(160, 5, 487.5, '2025-03-02');
const indicators = [bollingerIndicator(), vwapIndicator(), rsiIndicator(), macdIndicator()];

export default function Example() {
  return (
    <Card title="NABIL, 160 sessions" description="Bollinger 20 and 2, VWAP, RSI 14, MACD 12, 26 and 9">
      <CandlestickChart label="NABIL with indicators" candles={candles} indicators={indicators} height={260} />
    </Card>
  );
}
