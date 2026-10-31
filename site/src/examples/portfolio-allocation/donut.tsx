import { PortfolioAllocation } from '@punji/ui/portfolio-allocation';
import { Card } from '@punji/ui/card';
import { holdingsSummary, positionsFromTransactions } from '@punji/ui/portfolio';
import { portfolioQuotes, portfolioTransactions } from '../../sample.ts';

const { holdings } = holdingsSummary(positionsFromTransactions(portfolioTransactions), portfolioQuotes);

// Six slices at most: the five largest and "Other" for the rest. The shares add up to exactly 100.
// BFC has no price, so it is left out and named under the chart rather than drawn as zero.
export default function Example() {
  return (
    <Card title="Allocation by holding">
      <PortfolioAllocation holdings={holdings} label="Allocation by holding" maxSlices={6} />
    </Card>
  );
}
