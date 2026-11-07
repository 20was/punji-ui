import { RollingReturnsChart } from '@punji/ui/rolling-returns-chart';

// Invented monthly NAVs for 4 years: a fund with a wobble against a steadier index.
const dates = Array.from({ length: 48 }, (_, i) => new Date(Date.UTC(2022, i, 28)).toISOString().slice(0, 10));
const fund = Array.from({ length: 48 }, (_, i) => 100 * 1.009 ** i * (1 + 0.04 * Math.sin(i / 3.2)));
const index = Array.from({ length: 48 }, (_, i) => 100 * 1.006 ** i * (1 + 0.015 * Math.sin(i / 4)));

export default function Example() {
  return (
    <RollingReturnsChart
      label="Rolling 12-month return"
      dates={dates}
      window={12}
      series={[
        { key: 'fund', label: 'Growth fund', values: fund },
        { key: 'index', label: 'Index', values: index },
      ]}
    />
  );
}
