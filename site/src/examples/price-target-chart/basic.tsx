import { PriceTargetChart } from '@punji/ui/price-target-chart';

const closes = [1010.5, 1032, 1018.25, 1046, 1071.75, 1058, 1089.5, 1102, 1094.25, 1121.5, 1138, 1127.75];
const history = closes.map((c, i) => ({ date: new Date(Date.UTC(2026, i, 28)).toISOString().slice(0, 10), close: c.toFixed(2) }));

// Prices are decimal strings; the targets come from your data vendor.
export default function Example() {
  return <PriceTargetChart label="Price and analyst targets" history={history} targets={{ date: '2027-11-28', low: '1040.00', average: '1295.50', high: '1480.00' }} />;
}
