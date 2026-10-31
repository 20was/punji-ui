import { useState } from 'react';
import { TransactionHistory } from '@punji/ui/transaction-history';
import type { TransactionFilters } from '@punji/ui/portfolio';
import { portfolioTransactions } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

// Controlled filters, for example to keep them in the URL. The totals row sums what the filters match, not just this page.
export default function Example() {
  const [filters, setFilters] = useState<TransactionFilters>({ types: ['sell', 'dividend'], symbol: 'NABIL' });
  return (
    <Stack>
      <TransactionHistory transactions={portfolioTransactions} caption="NABIL sales and dividends" filters={filters} onFiltersChange={setFilters} pageSize={5} />
      <p>{JSON.stringify(filters)}</p>
    </Stack>
  );
}
