import { TransactionHistory } from '@punji/ui/transaction-history';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  return (
    <Stack>
      <TransactionHistory transactions={[]} caption="Loading" state="loading" />
      <TransactionHistory transactions={[]} caption="Empty" />
      <TransactionHistory transactions={[]} caption="Error" state="error" onRetry={() => undefined} />
    </Stack>
  );
}
