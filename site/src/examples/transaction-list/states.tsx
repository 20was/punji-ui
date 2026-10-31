import { TransactionList } from '@punji/ui/transaction-list';
import { TransactionStatus } from '@punji/ui/transaction-status';

export default function Example() {
  return (
    <div className="ex-stack">
      <div className="ex-row">
        <TransactionStatus status="completed" />
        <TransactionStatus status="pending" />
        <TransactionStatus status="failed" />
        <TransactionStatus status="reversed" />
      </div>
      <TransactionList transactions={[]} loading />
      <TransactionList transactions={[]} />
      <TransactionList transactions={[]} error onRetry={() => undefined} />
    </div>
  );
}
