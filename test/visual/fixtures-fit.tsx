import type { ReactNode } from 'react';
import {
  Button, Card, FinancialSummary, FinancialTable, JournalEntryView, LedgerTable, MetricRow, MetricTile, PageHeader, PortfolioAllocation, StatGrid, StatTile, StateGlyph, Tile, TrialBalance,
  holdingsSummary, positionsFromTransactions,
} from '@punji/ui';
import { cashEntries, cashOpening, journals, saleJournal } from '../../fixtures/accounting-data.ts';
import { portfolioQuotes, portfolioTransactions } from '../../fixtures/portfolio-data.ts';

// Container fit: pieces that follow the width of the space they are given, not the screen, drawn in a 320px column at every viewport
// (a sidebar, a narrow card). Synthetic data from the shared fixtures, never live.
const { holdings } = holdingsSummary(positionsFromTransactions(portfolioTransactions), portfolioQuotes);
const Block = ({ title, children }: { title: string; children: ReactNode }) => <section aria-label={title} style={{ display: 'grid', gap: 8 }}><h2 className="vr-h">{title}</h2>{children}</section>;
const Narrow = ({ width = 320, children }: { width?: number; children: ReactNode }) => <div style={{ width, maxWidth: '100%' }}>{children}</div>;

const metrics = [
  { id: 'a', label: 'Invested', value: 'NPR 7,43,88,2,27,129.27', note: '11 holdings' },
  { id: 'b', label: 'Value', value: 'NPR 6,64,181.70' },
];

function ContainerFitFixture() {
  return <div style={{ display: 'grid', gap: 24 }}>
    <Block title="PortfolioAllocation bar in a 350px card: names stay readable">
      <Narrow width={350}><Card title="Allocation" description="By sector"><PortfolioAllocation holdings={holdings} by="sector" view="bar" label="Allocation by sector" maxSlices={6} testId="vr-fit-alloc" /></Card></Narrow>
    </Block>
    <Block title="PortfolioAllocation donut in a 350px card">
      <Narrow width={350}><Card title="Allocation"><PortfolioAllocation holdings={holdings} label="Allocation by holding" testId="vr-fit-alloc-donut" /></Card></Narrow>
    </Block>
    <Block title="PageHeader as an h3 in a narrow column">
      <Narrow><PageHeader title="Portfolio" headingLevel={3} actions={<Button size="sm">Add</Button>} meta="14 Nov close" testId="vr-fit-header" /></Narrow>
    </Block>
    <Block title="StatGrid and FinancialSummary: two columns in a narrow container">
      <Narrow>
        <StatGrid label="Fit stats"><StatTile label="Invested" value="7,43,882" /><StatTile label="Value" value="6,64,181" /><StatTile label="Day" value="+2,596" /><StatTile label="Return" value="+0.41%" /></StatGrid>
        <FinancialSummary label="Fit summary" metrics={metrics} />
      </Narrow>
    </Block>
    <Block title="MetricTile with a long exact figure in 320px">
      <Narrow><MetricRow label="Fit metrics" count={2}>{metrics.map((m) => <MetricTile key={m.id} label={m.label} value={m.value} note={m.note} compact />)}</MetricRow></Narrow>
    </Block>
    <Block title="Tile with five-letter symbols">
      <div className="vr-row"><Tile text="NABIL" /><Tile text="NTC" /><Tile text="SHIVM" /><Tile text="UPPER" /></div>
    </Block>
    <Block title="Button stacked">
      <div className="vr-row">{(['chart', 'clock', 'bell', 'info'] as const).map((icon, i) => <Button key={icon} variant="secondary" stacked icon={<StateGlyph name={icon} size={18} />}>{['Send', 'Pay bills', 'Alerts', 'Statements'][i]}</Button>)}</div>
    </Block>
    <Block title="FinancialTable stacks into cards in a 320px column">
      <Narrow><div data-testid="vr-fit-fintable"><FinancialTable caption="Holdings (NPR)" rows={holdings.slice(0, 3)} rowKey={(h) => h.symbol} emptyTitle="None" sort={{ key: 'symbol', dir: 'asc' }} onSort={() => {}} columns={[
        { key: 'symbol', label: 'Symbol', rowHeader: true, sortable: true, render: (h) => h.symbol },
        { key: 'units', label: 'Units', num: true, render: (h) => String(h.quantity) },
        { key: 'value', label: 'Cost', num: true, render: (h) => String(h.costBasis) },
      ]} /></div></Narrow>
    </Block>
    <Block title="TrialBalance in 320px"><Narrow><TrialBalance caption="Trial balance (NPR)" data={journals} testId="vr-fit-trial" /></Narrow></Block>
    <Block title="JournalEntryView in 320px"><Narrow><JournalEntryView journal={saleJournal} testId="vr-fit-journal" /></Narrow></Block>
    <Block title="LedgerTable in 320px"><Narrow><LedgerTable caption="Cash ledger (NPR)" entries={cashEntries} normal="debit" opening={cashOpening} testId="vr-fit-ledger" /></Narrow></Block>
  </div>;
}

export const fitRegistry: Record<string, () => ReactNode> = {
  'container-fit': ContainerFitFixture,
};
