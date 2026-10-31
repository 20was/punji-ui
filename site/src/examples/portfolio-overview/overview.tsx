import { PortfolioOverview } from '@punji/ui/portfolio-overview';
import { Card } from '@punji/ui/card';
import { holdingsSummary, positionsFromTransactions } from '@punji/ui/portfolio';
import { portfolioQuotes, portfolioTransactions } from '../../sample.ts';

const { totals } = holdingsSummary(positionsFromTransactions(portfolioTransactions), portfolioQuotes);

// totals.complete is false here: BFC has no price and IPOX no previous close, so the note under the figures says so.
export default function Example() {
  return (
    <Card>
      <PortfolioOverview totals={totals} asOf="14 Nov 2025 close" />
    </Card>
  );
}
