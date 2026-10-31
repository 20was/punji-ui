import { TransactionList } from '@punji/ui/transaction-list';
import { transactions, manyTransactions } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

// Date headings in Bikram Sambat with Nepali month names, and a paged list (Pagination, one-based pages).
export default function Example() {
  return (
    <Stack>
      <TransactionList transactions={transactions.slice(0, 3)} calendar="bs" language="ne" showCompletedStatus />
      <TransactionList transactions={manyTransactions} pageSize={6} />
    </Stack>
  );
}
