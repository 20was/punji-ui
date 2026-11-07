import { SeasonalityChart } from '@punji/ui/seasonality-chart';

// Invented monthly returns in percent for seven BS years; index 0 is Baisakh.
const years = [2075, 2076, 2077, 2078, 2079, 2080, 2081].map((year, y) => ({
  year,
  months: Array.from({ length: 12 }, (_, m) => Math.round(((((m * 5 + y * 3) % 11) - 4) * 1.1 + (m === 6 ? 3 : 0)) * 10) / 10),
}));

export default function Example() {
  return <SeasonalityChart label="NEPSE by Bikram Sambat month" calendar="bs" years={years} />;
}
