import { useMemo, useState } from 'react';
import { Card } from '@punji/ui/card';
import { ChipRow } from '@punji/ui/controls';
import { useMediaQuery } from '@punji/ui/hooks';
import { MarketBreadth } from '@punji/ui/market-breadth';
import { MarketHeatmap, heatmapItemsFromQuotes } from '@punji/ui/market-heatmap';
import { MarketIndices, type MarketIndex } from '@punji/ui/market-indices';
import { MarketMovers } from '@punji/ui/market-movers';
import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { MoneyDisplay } from '@punji/ui/money-display';
import { compactCount } from '@punji/ui/stock-table';
import { ScreenTitle } from '../shared/kit.tsx';
import { INDEX_BASE, SECTOR_BASE, SECTOR_NAMES, portalTime } from './market.ts';
import { npr, quoteMoney, usePortal } from './store.ts';

const rupeesShort = (n: number) => `Rs ${compactCount(Math.round(n))}`;

/** The day at a glance: indices, breadth, where the money moved (heatmap) and the movers. Prerendered. */
export function Overview() {
  const { state, derived, dispatch, open } = usePortal();
  const narrow = useMediaQuery('(max-width: 899px)');
  const [sector, setSector] = useState('all');
  const { paths } = state.market;
  const indices: MarketIndex[] = [
    { id: 'NEPSE', name: 'NEPSE', value: paths.NEPSE?.at(-1) ?? INDEX_BASE, previousValue: INDEX_BASE, history: paths.NEPSE },
    ...SECTOR_NAMES.map((s) => ({ id: s, name: s, value: paths[s]?.at(-1) ?? SECTOR_BASE[s]!, previousValue: SECTOR_BASE[s]!, history: paths[s] })),
  ];
  const items = useMemo(() => heatmapItemsFromQuotes(sector === 'all' ? derived.quotes : derived.quotes.filter((q) => q.sector === sector), 'turnover'), [derived.quotes, sector]);
  const asOf = `As of ${portalTime(state.market.tick)}, 1 Nov 2026`;
  const { breadth } = derived;

  return (
    <div className="app-stack">
      <ScreenTitle aside={<span className="app-small app-muted">{asOf}</span>}>Market overview</ScreenTitle>
      <MarketIndices indices={indices} label="NEPSE and sector indices" variant={narrow ? 'strip' : 'cards'} testId="mp-indices" />

      <MetricRow label="Market summary" count={4} dense>
        <MetricTile label="Turnover" value={<MoneyDisplay value={derived.turnover} preset={npr} compact />} note="Sum of today's floorsheet" compact />
        <MetricTile label="Shares traded" value={compactCount(derived.volume)} note={`${derived.contracts.toLocaleString('en-IN')} contracts`} compact />
        <MetricTile label="Scrips traded" value={`${derived.traded} of ${derived.quotes.length}`} note="Listed companies" compact />
        <MetricTile label="Advances" value={String(breadth.advances)} note={`${breadth.declines} declines, ${breadth.unchanged} unchanged`} compact />
      </MetricRow>

      <Card title="Breadth" description="Companies up, down and flat against yesterday's close" headingLevel={3}>
        <MarketBreadth
          label="NEPSE breadth"
          {...breadth}
          extra={[
            { id: 'upper', label: 'At upper circuit', value: derived.upperCircuit, tone: 'up' },
            { id: 'lower', label: 'At lower circuit', value: derived.lowerCircuit, tone: 'down' },
            { id: 'traded', label: 'Scrips traded', value: derived.traded },
          ]}
          testId="mp-breadth"
        />
      </Card>

      <div className="app-grid is-split mp-overview-grid">
        <Card title="Sector heatmap" description="Tile size is turnover; colour and the signed number are today's change. Choose a tile to open the company." headingLevel={3}>
          <div className="app-stack">
            <ChipRow label="Sector" prefix="mp-heat" size="sm" wrap={!narrow} value={sector} onChange={setSector} options={[{ value: 'all', label: 'All' }, ...SECTOR_NAMES.map((s) => ({ value: s, label: s }))]} />
            <MarketHeatmap items={items} label={`${sector === 'all' ? 'NEPSE' : sector} turnover heatmap`} sizeLabel="Turnover" formatSize={rupeesShort} aspect={narrow ? 1 : 1.6} onSelect={open} testId="mp-heatmap" />
          </div>
        </Card>
        <MarketMovers
          quotes={derived.quotes}
          label="Movers"
          limit={8}
          tabLabels={{ active: 'Turnover' }}
          money={quoteMoney}
          live={state.running}
          state={state.feedDown ? 'error' : 'ready'}
          errorLabel="The price feed stopped. Reconnect to see live movers."
          onRetry={() => dispatch({ type: 'feed', down: false })}
          retryLabel="Reconnect"
          renderSymbol={(q) => (
            <button type="button" className="app-sym" onClick={() => open(q.symbol)}>
              <strong>{q.symbol}</strong>
              <span>{q.name}</span>
            </button>
          )}
          footer={<span className="app-small app-muted">{asOf}</span>}
          testId="mp-movers"
        />
      </div>
    </div>
  );
}
