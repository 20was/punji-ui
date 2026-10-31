import { useState } from 'react';
import { HoldingsTable, type HoldingColumn } from '@punji/ui/holdings-table';
import { holdingsSummary, positionsFromTransactions, sortHoldings, type HoldingSort } from '@punji/ui/portfolio';
import { useColumnVisibility } from '@punji/ui/use-column-visibility';
import { portfolioQuotes, portfolioTransactions } from '../../sample.ts';

const ALL: HoldingColumn[] = ['symbol', 'value', 'quantity', 'cost', 'ltp', 'pnl', 'day', 'weight', 'sector'];

// Your trades and today's quotes in; exact bigint arithmetic out. Sorting and column choice stay with you.
const { holdings, totals } = holdingsSummary(positionsFromTransactions(portfolioTransactions), portfolioQuotes);

export default function Example() {
  const [sort, setSort] = useState<HoldingSort>({ key: 'value', dir: 'desc' });
  const columns = useColumnVisibility({ columns: ALL, defaultHidden: new Set(['sector', 'cost']) });
  return (
    <HoldingsTable
      caption="Holdings, NPR"
      holdings={sortHoldings(holdings, sort)}
      totals={totals}
      columns={columns.visible as HoldingColumn[]}
      sort={sort}
      onSortChange={(next) => setSort(next)}
      exportFilename="holdings.csv"
      maxHeight={420}
    />
  );
}
