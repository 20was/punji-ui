import { useMemo, useState } from 'react';
import { Button } from '@punji/ui/button';
import { CandlestickChart } from '@punji/ui/candlestick-chart';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { DepthChart } from '@punji/ui/depth-chart';
import { MoneyDisplay } from '@punji/ui/money-display';
import { formatPrice, formatQuantity } from '@punji/ui/nepal/market-format';
import { OrderBookDepth } from '@punji/ui/order-book';
import { PriceChange } from '@punji/ui/price-change';
import { PriceLimitIndicator } from '@punji/ui/price-limit';
import { SplitPane } from '@punji/ui/split-pane';
import { ScreenTitle } from '../shared/kit.tsx';
import { bookFor, dailyCandles, scripBySymbol } from '../shared/sim.ts';
import { npr, quoteOf, useTerminal } from './store.ts';
import { Ticket } from './Ticket.tsx';

const RANGES = { '1M': 22, '3M': 64, '6M': 126 } as const;
type Range = keyof typeof RANGES;
const rs = (rupees: number) => `Rs ${formatPrice(rupees)}`;

/**
 * One scrip: the quote, daily candles with today's live session as the last candle, the order book and its depth,
 * the circuit band, and the order ticket. On a wide screen the chart and the ticket sit in a resizable split pane.
 */
export default function SymbolScreen() {
  const { state, derived, dispatch } = useTerminal();
  const [range, setRange] = useState<Range>('3M');
  const [split, setSplit] = useState(64);
  const quote = quoteOf(derived, state.symbol)!;
  const scrip = scripBySymbol(state.symbol)!;
  const candles = useMemo(() => dailyCandles(scrip, RANGES[range] - 1, quote), [scrip, range, quote]);
  // The book moves every few ticks, not every tick, so it can be read.
  const bookTick = Math.floor(state.market.tick / 3);
  const book = useMemo(() => bookFor(quote, bookTick), [quote, bookTick]);
  const watching = state.watchlist.includes(quote.symbol);

  const chart = (
    <div className="app-stack">
      <Card
        title="Price"
        description={`Daily candles, ${candles.length} sessions; today is live`}
        headingLevel={3}
        action={
          <SegmentedControl<Range>
            label="Chart period"
            prefix="tt-range"
            size="sm"
            value={range}
            onChange={setRange}
            options={(Object.keys(RANGES) as Range[]).map((value) => ({ value, label: value }))}
          />
        }
      >
        <CandlestickChart
          label={`${quote.symbol}, ${candles.length} daily candles with volume`}
          candles={candles}
          averages={[
            { type: 'sma', window: 10 },
            { type: 'ema', window: 20 },
          ]}
          height={300}
          formatPrice={rs}
          formatVolume={formatQuantity}
          testId="tt-candles"
        />
      </Card>
      <Card title="Depth" description="Cumulative quantity, ten levels a side" headingLevel={3}>
        <DepthChart label={`${quote.symbol} order book depth`} bids={book.bids} asks={book.asks} height={200} formatPrice={rs} formatQuantity={formatQuantity} />
      </Card>
    </div>
  );

  const side = (
    <div className="app-stack">
      <Card title="Order" headingLevel={3} testId="tt-symbol-ticket">
        <Ticket />
      </Card>
      <Card title="Order book" description="Best five levels a side" headingLevel={3}>
        <OrderBookDepth
          bids={book.bids}
          asks={book.asks}
          levels={5}
          labels={{
            buyQty: 'Buy qty',
            bid: 'Bid',
            ask: 'Ask',
            sellQty: 'Sell qty',
            caption: `Order book for ${quote.symbol}`,
            buyTotal: (pct, qty) => `Buy ${pct} · ${qty}`,
            sellTotal: (pct, qty) => `Sell ${pct} · ${qty}`,
          }}
        />
      </Card>
      <Card title="Circuit band" description="±10% of the previous close" headingLevel={3}>
        <PriceLimitIndicator symbol={quote.symbol} ltp={quote.ltp} previousClose={quote.previousClose} lowerLimit={quote.lowerLimit} upperLimit={quote.upperLimit} money={npr} />
      </Card>
    </div>
  );

  return (
    <div className="app-stack">
      <ScreenTitle
        aside={
          <Button size="sm" variant="secondary" aria-pressed={watching} onClick={() => dispatch({ type: 'watch', symbol: quote.symbol })} testId="tt-watch-toggle">
            {watching ? 'Watching' : 'Watch'}
          </Button>
        }
      >
        {quote.symbol} <span className="tt-title-name">{quote.name}</span>
      </ScreenTitle>
      <div className="tt-quote" data-testid="tt-quote">
        <span className="tt-quote-price">
          <MoneyDisplay value={quote.ltp} preset={npr} />
        </span>
        <PriceChange current={quote.ltp} previous={quote.previousClose} preset={npr} />
        <span className="app-muted app-small">
          {scrip.sector} · volume {formatQuantity(quote.volume)} · {quote.trades} trades
        </span>
      </div>
      <SplitPane label="Resize the chart and the order panel" start={chart} end={side} size={split} onSizeChange={setSplit} min={45} max={75} testId="tt-split" className="tt-split" />
    </div>
  );
}
