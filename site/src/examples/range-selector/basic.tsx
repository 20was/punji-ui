import { useState } from 'react';

import { money } from '@punji/ui/money';
import { NetWorthChart } from '@punji/ui/net-worth-chart';
import { filterByRange, RangeSelector, type ChartRange } from '@punji/ui/range-selector';
import { Stack } from '@punji/ui/stack';

const npr = (rupees: number) => money(BigInt(rupees) * 100n, 'NPR');
// Twenty-four month ends, oldest first. Dates are "YYYY-MM-DD".
const all = Array.from({ length: 24 }, (_, i) => {
  const year = 2025 + Math.floor(i / 12);
  const month = (i % 12) + 1;
  const date = `${year}-${String(month).padStart(2, '0')}-28`;
  return { date, assets: 900_000 + i * 24_000, owed: 400_000 - i * 6_000 };
});

export default function Example() {
  const [range, setRange] = useState<ChartRange>('1Y');
  const rows = filterByRange(all, (r) => r.date, range);
  return (
    <Stack>
      <RangeSelector value={range} onChange={setRange} label="Net worth range" />
      <NetWorthChart
        label={`Net worth, ${range}`}
        points={rows.map((r) => ({ key: r.date, label: r.date.slice(0, 7), assets: npr(r.assets), liabilities: npr(r.owed) }))}
      />
    </Stack>
  );
}
