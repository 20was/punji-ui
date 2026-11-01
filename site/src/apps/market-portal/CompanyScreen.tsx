import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { CandlestickChart, type Candle } from '@punji/ui/candlestick-chart';
import { Card } from '@punji/ui/card';
import { CompanySearch } from '@punji/ui/company-search';
import { SegmentedControl } from '@punji/ui/controls';
import { CorporateActionTimeline } from '@punji/ui/corporate-action-timeline';
import { DepthChart } from '@punji/ui/depth-chart';
import { DividendHistory } from '@punji/ui/dividend-history';
import { FinancialSummary, FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { KeyStats } from '@punji/ui/key-stats';
import { MoneyDisplay } from '@punji/ui/money-display';
import { formatPrice, formatQuantity } from '@punji/ui/nepal/market-format';
import { OrderBookDepth } from '@punji/ui/order-book';
import { PriceChange } from '@punji/ui/price-change';
import { compactCount } from '@punji/ui/stock-table';
import { ScreenTitle } from '../shared/kit.tsx';
import { SESSION_DATE, bookFor, type LiveQuote } from '../shared/sim.ts';
import { COMPANIES, companyEvents, companyOf, dividendsOf, fundamentalsOf, portalTime, quartersOf, range52, yearOf } from './market.ts';
import { MAX_COMPARE, npr, signedPct, changePct, usePortal } from './store.ts';

const RANGES = { '1M': 21, '3M': 63, '6M': 125, '1Y': 250 } as const;
type Range = keyof typeof RANGES;
const rsN = (rupees: number) => `Rs ${formatPrice(rupees)}`;
const rs = (paisa: bigint) => rsN(Number(paisa) / 100);
const crore = (paisa: bigint) => `Rs ${(Number(paisa) / 1e9).toLocaleString('en-IN', { maximumFractionDigits: 2 })} cr`;
const OPTIONS = COMPANIES.map((c) => ({ symbol: c.symbol, name: c.name, sector: c.sector }));

type Quarter = ReturnType<typeof quartersOf>[number];
const QUARTER_COLUMNS: FinancialColumn<Quarter>[] = [
  { key: 'label', label: 'Quarter', rowHeader: true, render: (q) => q.label },
  { key: 'revenue', label: 'Revenue', num: true, render: (q) => crore(q.revenue) },
  { key: 'profit', label: 'Net profit', num: true, render: (q) => crore(q.profit) },
  { key: 'eps', label: 'EPS (annualised)', num: true, render: (q) => rs(q.eps) },
];

/** One company: price and volume, key statistics, results, dividends, corporate actions, the order book and peers. */
export default function CompanyScreen() {
  const { state, derived, dispatch, go, open } = usePortal();
  const [range, setRange] = useState<Range>('6M');
  const quote = derived.bySymbol.get(state.symbol)!;
  const c = companyOf(state.symbol)!;
  const f = fundamentalsOf(c, quote.ltp);
  const r52 = range52(c, quote);
  // The React compiler memoises these; the yearly candles and events are cached in market.ts.
  const candles: Candle[] = [...yearOf(c).slice(-(RANGES[range] - 1)), { date: SESSION_DATE, open: Number(quote.open) / 100, high: Number(quote.high) / 100, low: Number(quote.low) / 100, close: Number(quote.ltp) / 100, volume: quote.volume }];
  // The book moves every few ticks, not every tick, so it can be read.
  const book = bookFor(quote, Math.floor(state.market.tick / 3));
  const quarters = quartersOf(c);
  const dividends = dividendsOf(c);
  const events = companyEvents(c);
  const peers = derived.quotes.filter((q) => q.sector === c.sector);
  const watching = state.watchlist.includes(c.symbol);
  const comparing = state.compare.includes(c.symbol);
  const holdings100 = quote.ltp * 100n;

  const peerColumns: FinancialColumn<LiveQuote>[] = [
    {
      key: 'symbol',
      label: 'Company',
      rowHeader: true,
      render: (q) =>
        q.symbol === c.symbol ? (
          <span className="app-sym" aria-current="true">
            <strong>{q.symbol}</strong>
            <span>{q.name} (this page)</span>
          </span>
        ) : (
          <button type="button" className="app-sym" onClick={() => open(q.symbol)}>
            <strong>{q.symbol}</strong>
            <span>{q.name}</span>
          </button>
        ),
    },
    { key: 'ltp', label: 'LTP', num: true, render: (q) => formatPrice(Number(q.ltp) / 100) },
    { key: 'change', label: 'Change', num: true, render: (q) => signedPct(changePct(q)) },
    { key: 'pe', label: 'P/E', num: true, render: (q) => fundamentalsOf(companyOf(q.symbol)!, q.ltp).pe?.toFixed(2) ?? 'Loss' },
    { key: 'pb', label: 'P/B', num: true, wide: true, render: (q) => fundamentalsOf(companyOf(q.symbol)!, q.ltp).pb.toFixed(2) },
    { key: 'cap', label: 'Market cap', num: true, wide: true, render: (q) => compactCount(Number(q.ltp * BigInt(companyOf(q.symbol)!.listedShares)) / 100) },
  ];

  return (
    <div className="app-stack">
      <ScreenTitle
        aside={
          <>
            <Button size="sm" variant="secondary" aria-pressed={watching} onClick={() => dispatch({ type: 'watch', symbol: c.symbol })} testId="mp-co-watch">
              {watching ? 'Watching' : 'Watch'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!comparing && state.compare.length >= MAX_COMPARE}
              onClick={() => {
                if (!comparing) dispatch({ type: 'compare-add', symbol: c.symbol });
                go('compare');
              }}
              testId="mp-co-compare"
            >
              {comparing ? 'In comparison' : 'Compare'}
            </Button>
          </>
        }
      >
        {c.symbol} <span className="mp-title-name">{c.name}</span>
      </ScreenTitle>
      <div className="mp-co-head">
        <div className="mp-quote" data-testid="mp-co-quote">
          <span className="mp-quote-price">
            <MoneyDisplay value={quote.ltp} preset={npr} />
          </span>
          <PriceChange current={quote.ltp} previous={quote.previousClose} preset={npr} />
          <span className="app-muted app-small">
            {c.sector} · as of {portalTime(state.market.tick)}
          </span>
        </div>
        <div className="mp-co-search">
          <CompanySearch
            options={OPTIONS}
            label="Open another company"
            placeholder="Symbol or name"
            onOpen={(s) => dispatch({ type: 'select', symbol: s })}
            sub={(o) => `${o.name} · ${o.sector}`}
            none={(q) => `No listed company matches “${q}”.`}
            size="md"
            shortcut={null}
            testId="mp-co-search"
            optionTestId="mp-co-opt"
          />
        </div>
      </div>

      <Card
        title="Price and volume"
        description={`${candles.length} daily sessions; today is live`}
        headingLevel={3}
        action={<SegmentedControl<Range> label="Chart period" prefix="mp-range" size="sm" value={range} onChange={setRange} options={(Object.keys(RANGES) as Range[]).map((value) => ({ value, label: value }))} />}
      >
        <CandlestickChart
          label={`${c.symbol}, ${candles.length} daily candles with volume`}
          candles={candles}
          averages={[{ type: 'sma', window: 20 }, { type: 'ema', window: 50 }]}
          height={300}
          formatPrice={rsN}
          formatVolume={formatQuantity}
          testId="mp-co-candles"
        />
      </Card>

      <div className="app-grid is-halves">
        <Card title="Key statistics" headingLevel={3}>
          <KeyStats
            cols={2}
            empty="Not published"
            label={`${c.symbol} key statistics`}
            items={[
              { label: 'Open', value: rs(quote.open) },
              { label: 'Previous close', value: rs(quote.previousClose) },
              { label: 'Day range', value: `${formatPrice(Number(quote.low) / 100)} – ${formatPrice(Number(quote.high) / 100)}` },
              { label: '52-week range', value: `${formatPrice(Number(r52.low) / 100)} – ${formatPrice(Number(r52.high) / 100)}` },
              { label: 'Volume', value: formatQuantity(quote.volume), sub: `${quote.trades} contracts` },
              { label: 'Turnover', value: <MoneyDisplay value={quote.turnover} preset={npr} compact /> },
              { label: 'Market cap', value: crore(f.marketCap), sub: `${compactCount(c.listedShares)} listed shares` },
              { label: 'P/E', value: f.pe === null ? 'Loss-making' : f.pe.toFixed(2), sub: `EPS ${rs(c.eps)}` },
              { label: 'P/B', value: f.pb.toFixed(2), sub: `Book value ${rs(c.bookValue)}` },
              { label: 'Dividend yield', value: `${f.dividendYield.toFixed(2)}%`, sub: `${c.cash}% cash, ${c.bonus}% bonus last year` },
              { label: 'Circuit band', value: `${formatPrice(Number(quote.lowerLimit) / 100)} – ${formatPrice(Number(quote.upperLimit) / 100)}` },
              { label: 'ROE', value: `${f.roe.toFixed(2)}%`, tone: f.roe < 0 ? 'down' : undefined },
            ]}
            testId="mp-co-stats"
          />
        </Card>
        <Card title="Financial summary" description="Latest quarters, FY 2083/84 and 2082/83" headingLevel={3}>
          <div className="app-stack">
            <FinancialSummary
              label={`${c.symbol} results`}
              metrics={[
                { id: 'profit', label: 'Net profit (TTM)', value: crore(c.eps * BigInt(c.listedShares)) },
                { id: 'eps', label: 'EPS (TTM)', value: rs(c.eps) },
                { id: 'bv', label: 'Book value / share', value: rs(c.bookValue) },
                { id: 'roe', label: 'ROE', value: `${f.roe.toFixed(2)}%` },
              ]}
            />
            <FinancialTable caption={`${c.symbol} quarterly results`} columns={QUARTER_COLUMNS} rows={quarters} rowKey={(q) => q.id} emptyTitle="No results published" />
          </div>
        </Card>
      </div>

      <div className="app-grid is-halves">
        <Card title="Dividends" description={`On 100 shares (now worth ${rs(holdings100)}); bonus at par, by fiscal year`} headingLevel={3}>
          <DividendHistory entries={dividends} caption={`${c.symbol} dividends on 100 shares`} money={npr} marketValue={holdings100} emptyLabel="This company has paid no dividend in five years." chartHeight={180} testId="mp-co-dividends" />
        </Card>
        <Card title="Corporate actions" description="Bikram Sambat dates first, Gregorian under them" headingLevel={3}>
          {events.length > 0 ? (
            <CorporateActionTimeline events={events} today={SESSION_DATE} label={`${c.symbol} corporate actions`} testId="mp-co-timeline" />
          ) : (
            <p className="app-muted">No book close, AGM or issue is announced for {c.symbol}.</p>
          )}
        </Card>
      </div>

      <div className="app-grid is-halves">
        <Card title="Depth" description="Cumulative quantity, ten levels a side" headingLevel={3}>
          <DepthChart label={`${c.symbol} order book depth`} bids={book.bids} asks={book.asks} height={200} formatPrice={rsN} formatQuantity={formatQuantity} />
        </Card>
        <Card title="Order book" description="Best five levels a side" headingLevel={3}>
          <OrderBookDepth
            bids={book.bids}
            asks={book.asks}
            levels={5}
            labels={{ buyQty: 'Buy qty', bid: 'Bid', ask: 'Ask', sellQty: 'Sell qty', caption: `Order book for ${c.symbol}`, buyTotal: (pct, qty) => `Buy ${pct} · ${qty}`, sellTotal: (pct, qty) => `Sell ${pct} · ${qty}` }}
          />
        </Card>
      </div>

      <Card title="Peers" description={`${c.sector}, ${peers.length} companies at live prices`} headingLevel={3} flush>
        <FinancialTable caption={`${c.sector} peers`} columns={peerColumns} rows={peers} rowKey={(q) => q.symbol} emptyTitle="No peers listed" />
      </Card>
      <p className="app-small app-muted">Prices in tables are rupees. Results, dividends and events are simulated for this demo; the price, volume and book follow the live session.</p>
    </div>
  );
}
