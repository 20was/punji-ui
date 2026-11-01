import { Card } from '@punji/ui/card';
import { CandlestickChart } from '@punji/ui/candlestick-chart';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PriceChange } from '@punji/ui/price-change';
import { nepalMoneyConfig } from '@punji/ui/money';
import { nabilCandles } from '../../sample.ts';

// Sixty NABIL sessions (Sunday to Thursday) with volume, a 10-session simple and a 20-session exponential average,
// in the card a quote page would put it in. Arrow keys move the crosshair; the data table is under the chart.
const npr = nepalMoneyConfig();
const last = nabilCandles.at(-1)!;
const prev = nabilCandles.at(-2)!;
const paisa = (rupees: number) => BigInt(Math.round(rupees * 100));

export default function Example() {
  return (
    <Card
      title="NABIL · Nabil Bank Limited"
      description="Daily candles, last 60 sessions"
      action={
        <span style={{ display: 'grid', justifyItems: 'end', gap: 2 }}>
          <b>
            <MoneyDisplay value={paisa(last.close)} preset={npr} />
          </b>
          <PriceChange size="sm" current={paisa(last.close)} previous={paisa(prev.close)} preset={npr} />
        </span>
      }
    >
      <CandlestickChart label="NABIL, daily candles with volume" candles={nabilCandles} averages={[{ type: 'sma', window: 10 }, { type: 'ema', window: 20 }]} />
    </Card>
  );
}
