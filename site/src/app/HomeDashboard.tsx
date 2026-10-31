// The homepage's "Built with Punji UI" screen. Every visible part is an export of @punji/ui; the data is the
// shared synthetic fixtures (fixtures/*.ts) the examples and the visual-regression gate also use. Layout is the
// only site CSS (.home-dash*). Kept apart from Home.tsx so it reads like an example you could copy.
import { Card } from '@punji/ui/card';
import { CandlestickChart } from '@punji/ui/candlestick-chart';
import { MarketIndices } from '@punji/ui/market-indices';
import { getMarketSession, nepseSchedule } from '@punji/ui/market-status';
import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { ShareDonut, ShareLegend, SHARE_TONES, type ShareItem } from '@punji/ui/meter';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { PriceChange } from '@punji/ui/price-change';
import { StockTable, sortQuotes } from '@punji/ui/stock-table';
import { TransactionList } from '@punji/ui/transaction-list';
import { holdings, marketIndices, nabilCandles, quotes, sampleNow, sectorShares, transactions } from '../sample.ts';

const npr = nepalMoneyConfig();

// Portfolio totals, exact: units held (holdings[i].qty, same order as quotes) times the price in paisa, summed as bigint.
const UNITS = holdings.map((h) => h.qty);
const value = quotes.reduce((sum, q, i) => sum + (q.ltp ?? 0n) * BigInt(UNITS[i] ?? 0), 0n);
const previous = quotes.reduce((sum, q, i) => sum + (q.previousClose ?? 0n) * BigInt(UNITS[i] ?? 0), 0n);
const largest = quotes.map((q, i) => ({ q, worth: (q.ltp ?? 0n) * BigInt(UNITS[i] ?? 0) })).toSorted((a, b) => (b.worth > a.worth ? 1 : -1))[0]!;

const sectors: ShareItem[] = sectorShares.map((s, i) => ({ key: s.key, label: s.label, pct: s.pct, tone: SHARE_TONES[i] ?? 'rest' }));
// Gainers only: a flat or falling stock is not a top gainer.
const movers = sortQuotes(quotes, { key: 'changePercent', dir: 'desc' })
  .filter((q) => q.ltp !== null && q.previousClose !== null && q.ltp > q.previousClose)
  .slice(0, 6);
const nabil = quotes.find((q) => q.symbol === 'NABIL')!;

export function HomeDashboard() {
  return (
    <div className="home-dash">
      <div className="home-dash-top">
        <MarketIndices indices={marketIndices.slice(0, 3)} label="Market indices" variant="strip" session={getMarketSession(sampleNow, nepseSchedule)} />
      </div>
      <div className="home-dash-grid">
        <div className="home-dash-metrics">
          <MetricRow label="Portfolio totals" count={4}>
            <MetricTile label="Portfolio value" value={<MoneyDisplay value={value} preset={npr} />} note="12 holdings, at the last close" />
            <MetricTile
              label="Today"
              value={<PriceChange current={value} previous={previous} preset={npr} showPercent={false} />}
              note={<PriceChange size="sm" current={value} previous={previous} preset={npr} showAbsolute={false} />}
            />
            <MetricTile label="Largest position" value={largest.q.symbol} note={<MoneyDisplay value={largest.worth} preset={npr} />} />
            <MetricTile tone="inverse" label="Cash in NIC Asia savings" value={<MoneyDisplay value={transactions[0]!.balance ?? 0n} preset={npr} />} note="Statement balance" />
          </MetricRow>
        </div>
        <div className="home-dash-chart">
          <Card
            title="NABIL · Nabil Bank Limited"
            headingLevel={3}
            meta="Daily"
            action={
              <span className="home-dash-quote">
                <MoneyDisplay value={nabil.ltp} preset={npr} />
                <PriceChange size="sm" current={nabil.ltp} previous={nabil.previousClose} preset={npr} />
              </span>
            }
          >
            <CandlestickChart label="NABIL, last 40 daily candles with volume" candles={nabilCandles.slice(-40)} averages={[{ type: 'sma', window: 10 }]} height={240} />
          </Card>
        </div>
        <div className="home-dash-alloc">
          <Card title="Allocation" description="By sector, share of invested value" headingLevel={3} stretch>
            <div className="home-dash-donut">
              <ShareDonut items={sectors} count={12} unit="holdings" label="Holdings by sector: Banking 46 percent, Hydropower 22, Manufacturing 14, Insurance 10, Telecom 8" />
              <ShareLegend items={sectors} layout="rows" label="Sectors" />
            </div>
          </Card>
        </div>
        <div className="home-dash-movers">
          <Card title="Top gainers" description="NEPSE, by percent change" headingLevel={3} flush stretch>
            <StockTable caption="Top gainers today" quotes={movers} columns={['symbol', 'ltp', 'change', 'trend']} bare />
          </Card>
        </div>
        <div className="home-dash-tx">
          <Card title="Recent transactions" description="NIC Asia Bank savings" headingLevel={3} stretch>
            <TransactionList transactions={transactions.slice(0, 4)} />
          </Card>
        </div>
      </div>
    </div>
  );
}
