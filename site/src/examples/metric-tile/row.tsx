import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { MoneyDisplay } from '@punji/ui/money-display';
import { MeterBar } from '@punji/ui/meter';
import { nepalMoneyConfig } from '@punji/ui/money';

const preset = nepalMoneyConfig();
const meter = (pct: number) => <MeterBar parts={[{ value: pct, tone: 'chart' }]} max={100} />;

export default function Example() {
  return (
    <MetricRow label="Portfolio totals" count={4}>
      <MetricTile label="Invested" value={<MoneyDisplay value={84_250_000n} preset={preset} compact />} note="12 holdings" meter={meter(100)} />
      <MetricTile label="Current value" value={<MoneyDisplay value={96_730_000n} preset={preset} compact />} note="After the 14 Nov close" meter={meter(100)} />
      <MetricTile label="Total return" value="+14.8%" note="Not annualised" meter={meter(40)} />
      <MetricTile tone="inverse" label="If you sold today" value={<MoneyDisplay value={95_600_000n} preset={preset} compact />} note="After fees" meter={meter(100)} />
    </MetricRow>
  );
}
