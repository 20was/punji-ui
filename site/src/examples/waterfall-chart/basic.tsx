import { money } from '@punji/ui/money';
import { WaterfallChart } from '@punji/ui/waterfall-chart';

// Amounts are exact bigint minor units (paisa): NPR 5,00,000.00 is 50_000_000n.
const npr = (rupees: number) => money(BigInt(rupees) * 100n, 'NPR');

export default function Example() {
  return (
    <WaterfallChart
      label="Profit bridge, fiscal year 2082/83"
      steps={[
        { key: 'open', label: 'Opening', amount: npr(500_000), total: true },
        { key: 'sales', label: 'Sales', amount: npr(1_200_000) },
        { key: 'cogs', label: 'Cost of sales', amount: npr(-700_000) },
        { key: 'staff', label: 'Salaries', amount: npr(-250_000) },
        { key: 'tax', label: 'Tax', amount: npr(-90_000) },
        { key: 'close', label: 'Closing', amount: npr(0), total: true },
      ]}
    />
  );
}
