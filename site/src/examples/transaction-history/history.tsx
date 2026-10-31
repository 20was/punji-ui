import { TransactionHistory } from '@punji/ui/transaction-history';
import { portfolioTransactions } from '../../sample.ts';

// Newest first, ten to a page. Each sale shows the realised P&L that computePosition gives for that sale,
// computed over the whole history before any filter, so filtering never changes it.
export default function Example() {
  return <TransactionHistory transactions={portfolioTransactions} caption="Transactions, NPR" />;
}
