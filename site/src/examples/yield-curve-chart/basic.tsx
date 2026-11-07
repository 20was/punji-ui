import { YieldCurveChart, type YieldCurve } from '@punji/ui/yield-curve-chart';

const tenors = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y', '30Y'];
const curve = (key: string, label: string, values: number[]): YieldCurve => ({ key, label, points: tenors.map((maturity, i) => ({ maturity, value: values[i] })) });

// Invented yields in percent.
export default function Example() {
  return (
    <YieldCurveChart
      label="Government yields by maturity"
      curves={[
        curve('now', 'Today', [5.4, 5.5, 5.3, 4.9, 4.4, 4.2, 4.3, 4.5]),
        curve('month', '1 month ago', [5.3, 5.35, 5.2, 4.95, 4.55, 4.3, 4.4, 4.6]),
        curve('year', '1 year ago', [4.5, 4.7, 4.9, 4.9, 4.8, 4.5, 4.4, 4.5]),
      ]}
    />
  );
}
