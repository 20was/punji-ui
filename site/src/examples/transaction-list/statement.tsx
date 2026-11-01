import { Card } from '@punji/ui/card';
import { TransactionList } from '@punji/ui/transaction-list';
import { accounts, transactions } from '../../sample.ts';

// Amounts are signed bigint minor units: negative leaves the account (Dr), positive enters it (Cr).
// Only pending, failed and reversed entries show a status; the balance column shows what the bank stated.
// (The shared fixture's formula-text row is left to the CSV export example, where neutralising it is the point.)
const statement = transactions.filter((t) => !t.counterparty.startsWith('='));

export default function Example() {
  return (
    <div style={{ width: 'min(100%, 720px)', marginInline: 'auto' }}>
      <Card title={`${accounts.savings.institution} savings`} description="Statement, 9 to 14 November 2025" headingLevel={3}>
        <TransactionList transactions={statement} showBalance />
      </Card>
    </div>
  );
}
