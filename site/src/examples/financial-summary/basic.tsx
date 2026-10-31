import { FinancialSummary } from '@punji/ui/financial';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';

const preset = nepalMoneyConfig();

// You calculate and format the amounts, and say which currency and as-of date they are. The component lays them out:
// two across on a phone, up to four across on a wide screen (columns = the number of metrics, at most four).
export default function Example() {
  return (
    <FinancialSummary
      label="Portfolio totals"
      metrics={[
        { id: 'invested', label: 'Invested', value: <MoneyDisplay value={84_250_000n} preset={preset} compact />, note: '12 holdings' },
        { id: 'value', label: 'Current value', value: <MoneyDisplay value={96_730_000n} preset={preset} compact />, note: 'After the 14 Nov close' },
        { id: 'gain', label: 'Total return', value: '+14.8%', note: 'Not annualised' },
      ]}
    />
  );
}
