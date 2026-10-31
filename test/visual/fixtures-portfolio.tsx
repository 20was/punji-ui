import { useState, type ReactNode } from 'react';
import {
  Card, DividendHistory, HoldingsTable, PortfolioAllocation, PortfolioOverview, TransactionHistory,
  dividendEntriesFromTransactions, holdingsSummary, positionsFromTransactions, sortHoldings, type HoldingSort,
} from '@punji/ui';
import { portfolioQuotes, portfolioTransactions } from '../../fixtures/portfolio-data.ts';

// Portfolio compositions. All data comes from fixtures/portfolio-data.ts, the same file the docs site reads (one source).
// Synthetic, never live.
const noop = () => undefined;
const Block = ({ title, children }: { title: string; children: ReactNode }) => <section aria-label={title} style={{ display: 'grid', gap: 8 }}><h2 className="vr-h">{title}</h2>{children}</section>;
const Stack = ({ children }: { children: ReactNode }) => <div style={{ display: 'grid', gap: 24 }}>{children}</div>;

const { holdings, totals } = holdingsSummary(positionsFromTransactions(portfolioTransactions), portfolioQuotes);
const dividends = dividendEntriesFromTransactions(portfolioTransactions);

function HoldingsFixture({ mode }: { mode: 'ready' | 'states' | 'compact' }) {
  const [sort, setSort] = useState<HoldingSort>({ key: 'value', dir: 'desc' });
  const rows = sortHoldings(holdings, sort);
  if (mode === 'states') {
    return <Stack>
      <Block title="Loading"><HoldingsTable caption="Holdings · NPR" holdings={[]} state="loading" /></Block>
      <Block title="Empty"><HoldingsTable caption="Holdings · NPR" holdings={[]} emptyLabel="No holdings yet. Buy a share to see it here." /></Block>
      <Block title="Error"><HoldingsTable caption="Holdings · NPR" holdings={[]} state="error" onRetry={noop} /></Block>
    </Stack>;
  }
  if (mode === 'compact') {
    return <HoldingsTable caption="Holdings · NPR" holdings={rows} totals={totals} columns={['symbol', 'value', 'pnl', 'weight', 'sector']} density="compact" sort={sort} onSortChange={setSort} testId="vr-holdings-compact" />;
  }
  return <HoldingsTable caption="Holdings · NPR" holdings={rows} totals={totals} sort={sort} onSortChange={setSort} exportFilename="holdings.csv" testId="vr-holdings" />;
}

function AllocationFixture() {
  return <Stack>
    <Block title="Donut by holding, six slices with Other">
      <Card title="Allocation by holding"><PortfolioAllocation holdings={holdings} label="Allocation by holding" testId="vr-alloc-donut" /></Card>
    </Block>
    <Block title="Bar by sector">
      <Card title="Allocation by sector"><PortfolioAllocation holdings={holdings} by="sector" view="bar" label="Allocation by sector" maxSlices={8} tableView="visible" testId="vr-alloc-bar" /></Card>
    </Block>
    <Block title="Loading and empty">
      <Card title="Loading"><PortfolioAllocation holdings={holdings} label="Mix" state="loading" /></Card>
      <Card title="Empty"><PortfolioAllocation holdings={[]} label="Mix" /></Card>
    </Block>
  </Stack>;
}

function OverviewFixture() {
  const losing = holdingsSummary(positionsFromTransactions(portfolioTransactions.filter((t) => ['CHCL', 'UPPER', 'SHIVM'].includes(t.symbol))), portfolioQuotes).totals;
  return <Stack>
    <Block title="With a symbol that has no price"><Card><PortfolioOverview totals={totals} asOf="14 Nov 2025 close" testId="vr-overview" /></Card></Block>
    <Block title="A smaller book"><Card><PortfolioOverview totals={losing} /></Card></Block>
    <Block title="Loading"><Card><PortfolioOverview state="loading" /></Card></Block>
    <Block title="Error"><PortfolioOverview state="error" onRetry={noop} /></Block>
  </Stack>;
}

function DividendFixture() {
  const cashValue = totals.marketValue;
  return <Stack>
    <Block title="With yield on value and cost">
      <Card title="Dividends by fiscal year" description="Nepal fiscal years (Bikram Sambat)">
        <DividendHistory entries={dividends} caption="Dividends by fiscal year" marketValue={cashValue} costBasis={totals.costBasis} testId="vr-dividends" />
      </Card>
    </Block>
    <Block title="Empty"><DividendHistory entries={[]} caption="Dividends" /></Block>
  </Stack>;
}

function TransactionFixture({ mode }: { mode: 'default' | 'filtered' }) {
  return mode === 'filtered'
    ? <TransactionHistory transactions={portfolioTransactions} caption="Transactions" defaultFilters={{ types: ['sell', 'dividend'], symbol: 'NABIL' }} pageSize={5} testId="vr-tx-filtered" />
    : <TransactionHistory transactions={portfolioTransactions} caption="Transactions" pageSize={8} testId="vr-tx" />;
}

export const portfolioRegistry: Record<string, () => ReactNode> = {
  'holdings-table': () => <HoldingsFixture mode="ready" />,
  'holdings-table-compact': () => <HoldingsFixture mode="compact" />,
  'holdings-table-states': () => <HoldingsFixture mode="states" />,
  'portfolio-allocation': AllocationFixture,
  'portfolio-overview': OverviewFixture,
  'dividend-history': DividendFixture,
  'transaction-history': () => <TransactionFixture mode="default" />,
  'transaction-history-filtered': () => <TransactionFixture mode="filtered" />,
};
