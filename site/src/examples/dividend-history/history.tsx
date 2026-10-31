import { DividendHistory } from '@punji/ui/dividend-history';
import { Card } from '@punji/ui/card';
import { dividendEntriesFromTransactions, holdingsSummary, positionsFromTransactions } from '@punji/ui/portfolio';
import { portfolioQuotes, portfolioTransactions } from '../../sample.ts';

const { totals } = holdingsSummary(positionsFromTransactions(portfolioTransactions), portfolioQuotes);
// Cash dividends, bonus issues (units x Rs 100 par) and rights subscribed, from the same history.
const entries = dividendEntriesFromTransactions(portfolioTransactions);

export default function Example() {
  return (
    <Card title="Dividends by fiscal year" description="Nepal fiscal years (Bikram Sambat)">
      <DividendHistory entries={entries} caption="Dividends by fiscal year" marketValue={totals.marketValue} costBasis={totals.costBasis} />
    </Card>
  );
}
