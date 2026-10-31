import { TransactionList } from '@punji/ui/transaction-list';
import { TransactionStatus } from '@punji/ui/transaction-status';
import { Cluster, Stack } from '@punji/ui/stack';

export default function Example() {
  return (
    <Stack>
      <Cluster>
        <TransactionStatus status="completed" />
        <TransactionStatus status="pending" />
        <TransactionStatus status="failed" />
        <TransactionStatus status="reversed" />
      </Cluster>
      <TransactionList transactions={[]} loading />
      <TransactionList transactions={[]} />
      <TransactionList transactions={[]} error onRetry={() => undefined} />
    </Stack>
  );
}
