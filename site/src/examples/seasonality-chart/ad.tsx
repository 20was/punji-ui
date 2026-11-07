import { SeasonalityChart } from '@punji/ui/seasonality-chart';

// Invented monthly returns for four Gregorian years. With minYears 4, December (three years) has no average yet.
const years = [2022, 2023, 2024, 2025].map((year, y) => ({
  year,
  months: Array.from({ length: 12 }, (_, m) => (m === 11 && y === 3 ? null : Math.round((((m * 7 + y * 5) % 13) - 5) * 0.9 * 10) / 10)),
}));

export default function Example() {
  return <SeasonalityChart label="Index by month, 2022 to 2025" years={years} minYears={4} />;
}
