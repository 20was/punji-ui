import { TransactionList } from '@punji/ui/transaction-list';
import { transactions } from '../../sample.ts';

// Amounts are signed bigint minor units: negative leaves the account (Dr), positive enters it (Cr).
// Only pending, failed and reversed entries show a status; the balance column shows what the bank stated.
export default function Example() {
  return <TransactionList transactions={transactions} showBalance />;
}
