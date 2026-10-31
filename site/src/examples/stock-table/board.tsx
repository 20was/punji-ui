import { useState } from 'react';
import { StockTable, sortQuotes, type QuoteSort, type StockColumn } from '@punji/ui/stock-table';
import { useColumnVisibility } from '@punji/ui/use-column-visibility';
import { quotes } from '../../sample.ts';

const ALL: StockColumn[] = ['symbol', 'ltp', 'change', 'volume', 'turnover', 'trend'];

export default function Example() {
  const [sort, setSort] = useState<QuoteSort>({ key: 'changePercent', dir: 'desc' });
  const columns = useColumnVisibility({ columns: ALL, defaultHidden: new Set(['trend']) });
  return (
    <StockTable
      caption="NEPSE quotes, NPR"
      quotes={sortQuotes(quotes, sort)}
      sort={sort}
      onSortChange={setSort}
      columns={columns.visible as StockColumn[]}
      maxHeight={360}
    />
  );
}
