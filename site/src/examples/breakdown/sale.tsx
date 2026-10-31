import { Breakdown, BreakdownRow } from '@punji/ui/breakdown';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';

const preset = nepalMoneyConfig();

// The caller computes every amount (here, made-up fees); Breakdown only lays them out and rules off the total.
export default function Example() {
  return (
    <Breakdown>
      <BreakdownRow label="Sale amount" note="100 shares at Rs 1,240" value="Rs 1,24,000.00" />
      <BreakdownRow label="Broker commission" note="0.40% of the amount" value="- Rs 496.00" tone="down" />
      <BreakdownRow label="Regulator fee" note="0.015% of the amount" value="- Rs 18.60" tone="down" />
      <BreakdownRow label="You receive" total value={<MoneyDisplay value={12_348_540n} preset={preset} />} />
    </Breakdown>
  );
}
