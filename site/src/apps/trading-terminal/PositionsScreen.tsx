import { useState } from 'react';
import { Card } from '@punji/ui/card';
import { HoldingsTable } from '@punji/ui/holdings-table';
import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PortfolioOverview } from '@punji/ui/portfolio-overview';
import { sortHoldings, type HoldingSort } from '@punji/ui/portfolio';
import { ScreenTitle } from '../shared/kit.tsx';
import { timeAt } from '../shared/sim.ts';
import { npr, useTerminal } from './store.ts';

/**
 * Positions and P&L marked to the live prices. Every figure comes from one `holdingsSummary` over the account's
 * trades, the same one the market watch and the ticket read, so the screens agree to the paisa.
 */
export default function PositionsScreen() {
  const { state, derived, dispatch, go } = useTerminal();
  const [sort, setSort] = useState<HoldingSort>({ key: 'value', dir: 'desc' });
  const { summary } = derived;
  const holdings = sortHoldings(summary.holdings, sort);
  return (
    <div className="app-stack">
      <ScreenTitle>Positions</ScreenTitle>
      <PortfolioOverview totals={summary.totals} asOf={`As of ${timeAt(state.market.tick)}`} label="Positions summary" testId="tt-overview" />
      <MetricRow label="Account" count={4} dense>
        <MetricTile label="Account value" value={<MoneyDisplay value={derived.accountValue} preset={npr} />} note="Cash plus positions at LTP" compact testId="tt-account-value" />
        <MetricTile label="Cash" value={<MoneyDisplay value={state.cash} preset={npr} />} note="After every fill, fees and tax" compact testId="tt-cash" />
        <MetricTile label="Held for orders" value={<MoneyDisplay value={derived.reserved} preset={npr} />} note="Live buy orders at their limit" compact />
        <MetricTile label="Fees and tax paid" value={<MoneyDisplay value={summary.totals.totalFees} preset={npr} />} note="Commission, SEBON, DP, CGT" compact />
      </MetricRow>
      <Card title="Holdings" description="Average cost method; realised P&L is after fees and capital gains tax" headingLevel={3} flush>
        <HoldingsTable
          caption="Positions"
          holdings={holdings}
          totals={summary.totals}
          sort={sort}
          onSortChange={setSort}
          density="compact"
          bare
          exportFilename="positions.csv"
          emptyLabel="No open positions. Buy from the market watch or the ticket."
          renderSymbol={(h) => (
            <button
              type="button"
              className="app-sym"
              onClick={() => {
                dispatch({ type: 'select', symbol: h.symbol });
                go('symbol');
              }}
            >
              <strong>{h.symbol}</strong>
              <span>{h.name}</span>
            </button>
          )}
          testId="tt-holdings"
        />
      </Card>
    </div>
  );
}
