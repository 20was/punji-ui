import { TransactionList } from '@punji/ui/transaction-list';
import { transactions, manyTransactions } from '../../sample.ts';

// Date headings in Bikram Sambat with Nepali month names, and a paged list (Pagination, one-based pages).
export default function Example() {
  return (
    <div className="ex-stack">
      <TransactionList transactions={transactions.slice(0, 3)} calendar="bs" language="ne" showCompletedStatus />
      <TransactionList transactions={manyTransactions} pageSize={6} />
    </div>
  );
}
