import { YieldCurveChart } from '@punji/ui/yield-curve-chart';

// Invented crude oil futures settlement prices by contract month.
const contracts = ['Dec 26', 'Jan 27', 'Mar 27', 'Jun 27', 'Sep 27', 'Dec 27'];
const points = (values: number[]) => contracts.map((maturity, i) => ({ maturity, value: values[i] }));

export default function Example() {
  return (
    <YieldCurveChart
      label="Crude oil futures curve"
      mode="term-structure"
      unit=" USD"
      curves={[
        { key: 'now', label: 'Today', points: points([78.5, 77.9, 77.2, 76.9, 77.4, 77.8]) },
        { key: 'week', label: '1 week ago', points: points([75.2, 75.4, 75.6, 75.9, 76.1, 76.4]) },
      ]}
    />
  );
}
