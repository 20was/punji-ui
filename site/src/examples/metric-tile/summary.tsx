import { SummaryFigure } from '@punji/ui/summary-figure';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';

const preset = nepalMoneyConfig();

export default function Example() {
  return (
    <div className="ex-stack">
      <SummaryFigure label="If you sold everything today" value={<MoneyDisplay value={12_450_000n} preset={preset} />} note="after Rs 1,120 fees" />
      <SummaryFigure tone="tint" size="lg" label="Dividends this fiscal year" value={<MoneyDisplay value={3_120_000n} preset={preset} />} note="2082/83" />
    </div>
  );
}
