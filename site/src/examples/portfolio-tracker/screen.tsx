import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { HoldingsTable, type HoldingColumn } from '@punji/ui/holdings-table';
import { PerformanceChart } from '@punji/ui/performance-chart';
import { holdingsSummary, positionsFromTransactions, sortHoldings, type HoldingSort } from '@punji/ui/portfolio';
import { PortfolioAllocation } from '@punji/ui/portfolio-allocation';
import { PortfolioOverview } from '@punji/ui/portfolio-overview';
import { StatusPill } from '@punji/ui/status-pill';
import { performanceDates, performanceSeries, portfolioQuotes, portfolioTransactions } from '../../sample.ts';
import './screen.css';

// A portfolio tracker: your trades and today's quotes in, exact bigint totals out (holdingsSummary). The overview,
// the chart against NEPSE, the sector allocation and the holdings table all read the same summary.
const { holdings, totals } = holdingsSummary(positionsFromTransactions(portfolioTransactions), portfolioQuotes);
const COLUMNS: HoldingColumn[] = ['symbol', 'value', 'quantity', 'ltp', 'pnl', 'day', 'weight'];
const RANGES = { '1M': 22, '3M': 60 } as const;
type Range = keyof typeof RANGES;

export default function Example() {
  const [sort, setSort] = useState<HoldingSort>({ key: 'value', dir: 'desc' });
  const [range, setRange] = useState<Range>('3M');
  const from = performanceDates.length - RANGES[range];
  return (
    <div className="sc-pf">
      <div className="sc-pf-head">
        <div className="sc-pf-title">
          <h3>Portfolio</h3>
          <StatusPill tone="info" size="sm">
            14 Nov close
          </StatusPill>
        </div>
        <div className="sc-pf-actions">
          <Button variant="secondary" size="sm">
            Import trades
          </Button>
          <Button size="sm">Add transaction</Button>
        </div>
      </div>

      <Card headingLevel={3} label="Portfolio overview">
        <PortfolioOverview totals={totals} asOf="14 Nov 2025 close" />
      </Card>

      <div className="sc-pf-grid">
        <div className="sc-pf-chart">
          <Card title="Performance" description="Portfolio value against NEPSE and Sensitive, rebased" headingLevel={3} stretch>
            <PerformanceChart
              label="Portfolio against NEPSE and Sensitive"
              dates={performanceDates.slice(from)}
              series={performanceSeries.map((s) => ({ ...s, values: s.values.slice(from) }))}
              height={240}
              periods={
                <SegmentedControl<Range>
                  label="Period"
                  prefix="sc-pf-range"
                  size="sm"
                  value={range}
                  onChange={setRange}
                  options={(Object.keys(RANGES) as Range[]).map((value) => ({ value, label: value }))}
                />
              }
            />
          </Card>
        </div>
        <div className="sc-pf-alloc">
          <Card title="Allocation" description="By sector, share of market value" headingLevel={3} stretch>
            <PortfolioAllocation holdings={holdings} by="sector" view="bar" label="Allocation by sector" maxSlices={6} />
          </Card>
        </div>
      </div>

      <Card title="Holdings" description={`${holdings.length} positions, NPR`} headingLevel={3}>
        <HoldingsTable
          caption="Holdings, NPR"
          holdings={sortHoldings(holdings, sort)}
          totals={totals}
          columns={COLUMNS}
          sort={sort}
          onSortChange={setSort}
          exportFilename="holdings.csv"
        />
      </Card>
    </div>
  );
}
