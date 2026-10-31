import { HoldingsTable } from '@punji/ui/holdings-table';
import { holdingsSummary, positionsFromTransactions } from '@punji/ui/portfolio';
import { portfolioQuotes, portfolioTransactions } from '../../sample.ts';

// BFC did not trade (no LTP) and IPOX has no previous close. A missing price is a dash with a spoken "No value", never zero:
// BFC keeps its cost but has no value, P&L or weight, the totals leave it out and the note under the table names it.
const symbols = ['NABIL', 'BFC', 'IPOX'];
const { holdings, totals } = holdingsSummary(
  positionsFromTransactions(portfolioTransactions.filter((t) => symbols.includes(t.symbol))),
  portfolioQuotes,
);

export default function Example() {
  return <HoldingsTable caption="Holdings with missing quotes" holdings={holdings} totals={totals} density="compact" />;
}
