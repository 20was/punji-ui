import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { CandlestickChart } from '@punji/ui/candlestick-chart';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { DepthChart } from '@punji/ui/depth-chart';
import { KeyStats } from '@punji/ui/key-stats';
import { MarketStatus, getMarketSession, nepseSchedule } from '@punji/ui/market-status';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { formatPrice, formatQuantity } from '@punji/ui/nepal/market-format';
import { OrderBookDepth } from '@punji/ui/order-book';
import { PriceChange } from '@punji/ui/price-change';
import { PriceLimitIndicator, circuitLimits } from '@punji/ui/price-limit';
import { StatusPill } from '@punji/ui/status-pill';
import { depthAsks, depthBids, nabilCandles, sampleNow } from '../../sample.ts';
import './screen.css';

// A stock page: the quote, the daily candles with volume and averages, today's session, the circuit band, the order
// book and its depth. Candles and book levels are display numbers (rupees); the quote is exact bigint paisa.
const npr = nepalMoneyConfig();
const paisa = (rupees: number) => BigInt(Math.round(rupees * 100));
const last = nabilCandles.at(-1)!;
const prev = nabilCandles.at(-2)!;
const ltp = paisa(last.close);
const previousClose = paisa(prev.close);
const band = circuitLimits(previousClose, '0.10');
const RANGES = { '1M': 22, '3M': 60 } as const;
type Range = keyof typeof RANGES;
const rs = (rupees: number) => `Rs ${formatPrice(rupees)}`;

export default function Example() {
  const [range, setRange] = useState<Range>('3M');
  const [watching, setWatching] = useState(false);
  const candles = nabilCandles.slice(-RANGES[range]);
  const high = Math.max(...candles.map((c) => c.high));
  const low = Math.min(...candles.map((c) => c.low));
  return (
    <div className="sc-sd">
      <div className="sc-sd-head">
        <div className="sc-sd-id">
          <div>
            <h3>NABIL</h3>
            <p>Nabil Bank Limited · Commercial banks</p>
          </div>
        </div>
        <div className="sc-sd-quote">
          <span className="sc-sd-price">
            <MoneyDisplay value={ltp} preset={npr} />
          </span>
          <PriceChange current={ltp} previous={previousClose} preset={npr} />
        </div>
        <div className="sc-sd-actions">
          <MarketStatus session={getMarketSession(sampleNow, nepseSchedule)} size="sm" />
          <Button variant="secondary" size="sm" aria-pressed={watching} onClick={() => setWatching((w) => !w)}>
            {watching ? 'Watching' : 'Watch'}
          </Button>
          <Button size="sm">Add transaction</Button>
        </div>
      </div>

      <KeyStats
        layout="strip"
        label="NABIL last session"
        empty="Not published"
        items={[
          { label: 'Open', value: rs(last.open) },
          { label: 'High', value: rs(last.high) },
          { label: 'Low', value: rs(last.low) },
          { label: 'Volume', value: last.volume === null ? null : formatQuantity(last.volume) },
          { label: `${range} range`, value: `${formatPrice(low)} – ${formatPrice(high)}` },
        ]}
      />

      <div className="sc-sd-grid">
        <div className="sc-sd-main">
          <Card
            title="Price"
            description={`Daily candles, last ${candles.length} sessions, with volume`}
            headingLevel={3}
            action={
              <SegmentedControl<Range>
                label="Chart period"
                prefix="sc-sd-range"
                size="sm"
                value={range}
                onChange={setRange}
                options={(Object.keys(RANGES) as Range[]).map((value) => ({ value, label: value }))}
              />
            }
          >
            <CandlestickChart
              label={`NABIL, ${candles.length} daily candles with volume`}
              candles={candles}
              averages={[
                { type: 'sma', window: 10 },
                { type: 'ema', window: 20 },
              ]}
              height={300}
            />
          </Card>
          <Card title="Fundamentals" description="Latest published quarter" headingLevel={3}>
            <KeyStats
              cols={3}
              label="NABIL fundamentals"
              empty="Not published"
              items={[
                { label: 'EPS', value: '38.20', sub: 'Q1 2082/83, annualised' },
                { label: 'P/E', value: '12.8' },
                { label: 'Book value', value: 'Rs 214.10' },
                { label: 'Dividend yield', value: null },
                { label: 'Paid-up capital', value: 'Rs 27.06 Arba' },
                { label: 'Listed shares', value: '27,05,72,411' },
              ]}
            />
          </Card>
        </div>
        <div className="sc-sd-side">
          <Card title="Circuit band" description="±10% of the previous close" headingLevel={3}>
            <PriceLimitIndicator symbol="NABIL" ltp={ltp} previousClose={previousClose} lowerLimit={band.lower} upperLimit={band.upper} />
          </Card>
          <Card title="Order book" description="Best five levels a side" headingLevel={3} action={<StatusPill size="sm">Delayed</StatusPill>}>
            <OrderBookDepth
              bids={depthBids}
              asks={depthAsks}
              levels={5}
              labels={{
                buyQty: 'Buy qty',
                bid: 'Bid',
                ask: 'Ask',
                sellQty: 'Sell qty',
                caption: 'Order book for NABIL',
                buyTotal: (pct, qty) => `Buy ${pct} · ${qty}`,
                sellTotal: (pct, qty) => `Sell ${pct} · ${qty}`,
              }}
            />
          </Card>
          <Card title="Depth" description="Cumulative quantity, ten levels a side" headingLevel={3}>
            <DepthChart label="NABIL order book depth" bids={depthBids} asks={depthAsks} height={200} />
          </Card>
        </div>
      </div>
    </div>
  );
}
