import { Card } from '@punji/ui/card';
import { PriceLimitIndicator, circuitLimits, limitPosition } from '@punji/ui/price-limit';
import { DataRow, DataRows } from '@punji/ui/rows';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { circuit } from '../../sample.ts';

const npr = nepalMoneyConfig();

// No published limits: derive them from the previous close and a band rate.
// Each limit rounds toward the close. Many exchanges round to a tick, so prefer published figures.
const { lower, upper } = circuitLimits(circuit.previousClose, '0.10');
const ltp = 51_000n;

export default function Example() {
  const { state } = limitPosition(ltp, lower, upper);
  return (
    <Card title="NABIL daily band" description="Limits derived from the previous close, 10%" headingLevel={3}>
      <PriceLimitIndicator symbol="NABIL" ltp={ltp} previousClose={circuit.previousClose} bandRate="0.10" />
      <DataRows label="Derived limits">
        <DataRow label="Lower limit" value={<MoneyDisplay value={lower} preset={npr} />} />
        <DataRow label="Upper limit" value={<MoneyDisplay value={upper} preset={npr} />} />
        <DataRow label="Stuck at a limit?" value={state === 'at-upper' ? 'At the upper limit' : state === 'at-lower' ? 'At the lower limit' : 'No'} />
      </DataRows>
      <PriceLimitIndicator symbol="BFC" ltp={null} />
    </Card>
  );
}
