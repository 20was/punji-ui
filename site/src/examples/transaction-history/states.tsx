import { TransactionHistory } from '@punji/ui/transaction-history';

export default function Example() {
  return (
    <div className="ex-stack">
      <TransactionHistory transactions={[]} caption="Loading" state="loading" />
      <TransactionHistory transactions={[]} caption="Empty" />
      <TransactionHistory transactions={[]} caption="Error" state="error" onRetry={() => undefined} />
    </div>
  );
}
