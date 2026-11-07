import { BalanceHistoryChart } from '@punji/ui/balance-history-chart';
import { money } from '@punji/ui/money';

const npr = (crore: number) => money(BigInt(Math.round(crore * 100)) * 10_000_000n, 'NPR');

export default function Example() {
  return (
    <BalanceHistoryChart
      label="Debt, equity and cash, FY21 to FY26"
      periods={[
        { key: '21', label: 'FY21', debt: npr(620), equity: npr(540), cash: npr(130) },
        { key: '22', label: 'FY22', debt: npr(700), equity: npr(610), cash: npr(120) },
        { key: '23', label: 'FY23', debt: npr(760), equity: npr(700), cash: npr(165) },
        { key: '24', label: 'FY24', debt: npr(690), equity: npr(820), cash: npr(210) },
        { key: '25', label: 'FY25', debt: npr(610), equity: npr(960), cash: npr(260) },
        { key: '26', label: 'FY26', debt: npr(540), equity: npr(1120), cash: npr(335) },
      ]}
    />
  );
}
