import { PortfolioAllocation } from '@punji/ui/portfolio-allocation';
import { holdingsSummary, positionsFromTransactions } from '@punji/ui/portfolio';
import { portfolioQuotes, portfolioTransactions } from '../../sample.ts';

const { holdings } = holdingsSummary(positionsFromTransactions(portfolioTransactions), portfolioQuotes);

// A stacked bar by sector, with the exact-values table shown (by default it is visually hidden for screen readers).
export default function Example() {
  return <PortfolioAllocation holdings={holdings} by="sector" view="bar" label="Allocation by sector" maxSlices={8} tableView="visible" />;
}
