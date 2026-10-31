import { useState } from 'react';
import { StockTable, sortQuotes, type QuoteSort } from '@punji/ui/stock-table';
import { quotes } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

// Selection is controlled: keep the symbols in state and pass them back. Rows are keyed by symbol.
export default function Example() {
  const [sort, setSort] = useState<QuoteSort>({ key: 'turnover', dir: 'desc' });
  const [selected, setSelected] = useState<readonly string[]>(['NABIL']);
  return (
    <Stack>
      <StockTable
        caption="Select stocks to compare"
        quotes={sortQuotes(quotes, sort).slice(0, 6)}
        columns={['symbol', 'ltp', 'change', 'trend']}
        sort={sort}
        onSortChange={setSort}
        selectedSymbols={selected}
        onSelectedSymbolsChange={setSelected}
        selectLabel={(symbol) => `Compare ${symbol}`}
        density="compact"
        stack={false}
      />
      <p>{selected.length ? `Selected: ${selected.join(', ')}` : 'Nothing selected.'}</p>
    </Stack>
  );
}
