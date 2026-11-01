import { DataRow, DataRows } from '@punji/ui/rows';
import { formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import { brokerCommission, commissionSlabFor, nepseFeeSchedule, type NepseFeeSchedule } from '@punji/ui/nepse-fees';

const npr = nepalMoneyConfig();
// The same schedule with marginal bands, like income-tax slabs. Rates stay configurable strings.
const marginal: NepseFeeSchedule = { ...nepseFeeSchedule, commission: { ...nepseFeeSchedule.commission, method: 'marginal' } };
// Rs 1,000 · Rs 50,000 · Rs 50,000.01 · Rs 6 lakh · Rs 1.5 crore, in paisa.
const amounts = [100_000n, 5_000_000n, 5_000_001n, 60_000_000n, 1_500_000_000n];

export default function Example() {
  return (
    <DataRows label="Commission on an order amount">
      {amounts.map((amount) => (
        <DataRow
          key={amount.toString()}
          label={`${formatMoney(amount, npr)} · band rate ${commissionSlabFor(amount).rate}`}
          value={`${formatMoney(brokerCommission(amount), npr)} (marginal ${formatMoney(brokerCommission(amount, marginal), npr)})`}
        />
      ))}
    </DataRows>
  );
}
