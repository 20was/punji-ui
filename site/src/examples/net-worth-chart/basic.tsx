import { money } from '@punji/ui/money';
import { NetWorthChart } from '@punji/ui/net-worth-chart';

const npr = (rupees: number) => money(BigInt(rupees) * 100n, 'NPR');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// A year: savings grow, a loan in April lifts liabilities above assets for a while.
const assets = [900, 940, 980, 1010, 1060, 1100, 1150, 1210, 1270, 1330, 1400, 1470];
const owed = [300, 290, 280, 1050, 1030, 1010, 990, 970, 950, 930, 910, 890];

export default function Example() {
  return (
    <NetWorthChart
      label="Net worth in 2026"
      points={months.map((m, i) => ({ key: m, label: m, assets: npr(assets[i]! * 1000), liabilities: npr(owed[i]! * 1000) }))}
    />
  );
}
