import { useMemo, useState } from 'react';
import { SplitBar } from '@punji/ui/bars';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { KeyStats } from '@punji/ui/key-stats';
import { PageHeader } from '@punji/ui/layout';
import { MarketHeatmap, heatmapItemsFromQuotes } from '@punji/ui/market-heatmap';
import { MarketIndices } from '@punji/ui/market-indices';
import { MarketMovers, type MoverKind } from '@punji/ui/market-movers';
import { MarketStatus, getMarketSession, nepseSchedule } from '@punji/ui/market-status';
import { ShareBar, SHARE_TONES, type ShareItem } from '@punji/ui/meter';
import { MoneyDisplay } from '@punji/ui/money-display';
import { formatCompactMoney, nepalMoneyConfig } from '@punji/ui/money';
import { StockTable, sortQuotes, type QuoteSort } from '@punji/ui/stock-table';
import { marketIndices, quotes as closing, sampleNow } from '../../sample.ts';
import './screen.css';

// A live market board. Every panel reads one array of quotes; "Receive a tick" stands in for your socket and hands
// the panels new props (prices move by 50 paisa steps). The table flashes the cells that changed (live).
const npr = nepalMoneyConfig();
const session = getMarketSession(sampleNow, nepseSchedule);

export default function Example() {
  const [step, setStep] = useState(0);
  const [sort, setSort] = useState<QuoteSort>({ key: 'turnover', dir: 'desc' });
  const [tab, setTab] = useState<MoverKind>('gainers');
  const quotes = useMemo(
    () =>
      closing.map((q, i) => {
        const ltp = q.ltp === null || step === 0 ? q.ltp : q.ltp + BigInt(((step * (i + 3)) % 9) - 4) * 50n;
        return { ...q, ltp, turnover: ltp === null || q.volume === null ? null : ltp * BigInt(q.volume) };
      }),
    [step],
  );
  const breadth = useMemo(() => {
    let up = 0,
      flat = 0,
      down = 0;
    for (const q of quotes) {
      if (q.ltp === null || q.previousClose === null) continue;
      if (q.ltp > q.previousClose) up += 1;
      else if (q.ltp < q.previousClose) down += 1;
      else flat += 1;
    }
    return { up, flat, down };
  }, [quotes]);
  const turnover = quotes.reduce((sum, q) => sum + (q.turnover ?? 0n), 0n);
  const volume = quotes.reduce((sum, q) => sum + (q.volume ?? 0), 0);
  // Turnover by sector as whole percents; the largest sector absorbs the rounding so the bar adds up to 100.
  const sectors = useMemo(() => {
    const by = new Map<string, bigint>();
    for (const q of quotes) by.set(q.sector, (by.get(q.sector) ?? 0n) + (q.turnover ?? 0n));
    const total = [...by.values()].reduce((a, b) => a + b, 0n) || 1n;
    const rows = [...by].toSorted((a, b) => (b[1] > a[1] ? 1 : -1)).map(([label, t]) => ({ label, pct: Number((t * 100n) / total) }));
    rows[0]!.pct += 100 - rows.reduce((a, r) => a + r.pct, 0);
    return rows.map((r, i): ShareItem => ({ key: r.label, label: r.label, pct: r.pct, tone: SHARE_TONES[i] ?? 'rest' }));
  }, [quotes]);

  return (
    <div className="sc-mkt">
      <PageHeader
        headingLevel={3}
        title="Market"
        stamp={<MarketStatus session={session} market="NEPSE" />}
        actions={
          <Button variant="secondary" size="sm" onClick={() => setStep((s) => s + 1)}>
            Receive a tick
          </Button>
        }
      />

      <MarketIndices indices={marketIndices} label="NEPSE indices" variant="cards" asOf="Index values at the 14 Nov close" />

      <div className="sc-mkt-row">
        <Card title="Breadth" description={`${quotes.length} listed companies on this board`} headingLevel={3} stretch>
          <div className="sc-mkt-breadth">
            <SplitBar
              parts={[
                { key: 'up', value: breadth.up, tone: 'gain', label: `${breadth.up} up` },
                { key: 'flat', value: breadth.flat, tone: 'neutral', label: `${breadth.flat} unchanged` },
                { key: 'down', value: breadth.down, tone: 'loss', label: `${breadth.down} down` },
              ]}
            />
            <ShareBar
              items={sectors}
              label={`Turnover by sector: ${sectors.map((x) => `${x.label} ${x.pct} percent`).join(', ')}`}
              legend="list"
              foot="Share of today’s turnover by sector."
            />
            <KeyStats
              cols={3}
              label="Session totals"
              empty="Not published"
              items={[
                { label: 'Turnover', value: <MoneyDisplay value={turnover} preset={npr} compact /> },
                { label: 'Shares traded', value: volume.toLocaleString('en-IN') },
                { label: 'Ticks received', value: String(step) },
              ]}
            />
          </div>
        </Card>
        <Card label="Turnover heatmap" stretch>
          <MarketHeatmap
            items={heatmapItemsFromQuotes(quotes, 'turnover')}
            label="NEPSE turnover heatmap"
            sizeLabel="Turnover"
            formatSize={(v) => formatCompactMoney(BigInt(Math.round(v)), npr)}
          />
        </Card>
      </div>

      <div className="sc-mkt-main">
        <Card title="Live prices" description="Sorted by turnover; choose a column to sort" headingLevel={3} flush>
          <StockTable
            caption="NEPSE live prices, NPR"
            quotes={sortQuotes(quotes, sort)}
            sort={sort}
            onSortChange={setSort}
            columns={['symbol', 'ltp', 'change', 'volume', 'turnover', 'trend']}
            live
            maxHeight={440}
          />
        </Card>
        <Card title="Movers" description="By percent change and turnover" headingLevel={3}>
          <MarketMovers quotes={quotes} label="Movers" tab={tab} onTabChange={setTab} limit={5} footer="Synthetic data, not market data." />
        </Card>
      </div>
    </div>
  );
}
