import { CashFlowChart } from '@punji/ui/cash-flow-chart';
import { money } from '@punji/ui/money';

const npr = (rupees: number) => money(BigInt(rupees) * 100n, 'NPR');

export default function Example() {
  return (
    <CashFlowChart
      label="Household cash flow, Shrawan to Poush"
      periods={[
        { key: 'shr', label: 'Shrawan', inflow: npr(180_000), outflow: npr(120_000) },
        { key: 'bha', label: 'Bhadra', inflow: npr(175_000), outflow: npr(140_000) },
        { key: 'asw', label: 'Ashwin', inflow: npr(210_000), outflow: npr(260_000) },
        { key: 'kar', label: 'Kartik', inflow: npr(190_000), outflow: npr(150_000) },
        { key: 'man', label: 'Mangsir', inflow: npr(185_000), outflow: npr(135_000) },
        { key: 'pou', label: 'Poush', inflow: npr(200_000), outflow: npr(145_000) },
      ]}
    />
  );
}
