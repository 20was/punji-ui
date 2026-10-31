import { Card } from '@punji/ui/card';
import { DebitCredit } from '@punji/ui/debit-credit';
import { DataRow, DataRows } from '@punji/ui/rows';

// The value is a signed net in minor units: positive is a debit, negative a credit. Zero has no side.
export default function Example() {
  return (
    <Card title="Cash account, 1010" description="How the same ledger balance reads in three layouts" headingLevel={3}>
      <DataRows label="Balances">
        <DataRow label="Cash sale (suffix)" value={<DebitCredit value={1250000n} />} />
        <DataRow label="Supplier payment (suffix)" value={<DebitCredit value={-300000n} />} />
        <DataRow label="Accounting parentheses" value={<DebitCredit value={-300000n} variant="signed" />} />
        <DataRow label="Minus sign" value={<DebitCredit value={-300000n} variant="signed" accounting={false} />} />
        <DataRow label="Debit column" value={<DebitCredit value={1250000n} variant="column" column="debit" />} />
        <DataRow label="Credit column" value={<DebitCredit value={-300000n} variant="column" column="credit" />} />
        <DataRow label="Settled" value={<DebitCredit value={0n} />} />
      </DataRows>
    </Card>
  );
}
