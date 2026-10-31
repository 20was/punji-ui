import { allocation } from '@punji/ui/calculations';
import { Card } from '@punji/ui/card';
import { DataRow, DataRows } from '@punji/ui/rows';
import { holdings } from '../../sample.ts';

// Rounded shares rarely add up to 100: 33.33 + 33.33 + 33.33 is 99.99.
// allocation hands the spare hundredths to the largest remainders, so the displayed shares total exactly 100.
const picks = holdings.filter((h) => ['NABIL', 'NTC', 'HDL'].includes(h.symbol));

export default function Example() {
  // Equal market values (Rs 1,00,000 each, in paisa) are the hard case.
  const slices = allocation(picks.map((h) => ({ id: h.symbol, value: 10_000_000n })));
  const total = slices.reduce((sum, s) => sum + (s.displayPercent ?? 0), 0);
  return (
    <Card title="Portfolio mix" description="Three holdings of equal value" headingLevel={3}>
      <DataRows label="Allocation">
        {slices.map((s) => (
          <DataRow key={s.id} label={s.id} value={`${s.displayPercent?.toFixed(2)}%`} />
        ))}
        <DataRow label="Total" total value={`${total.toFixed(2)}%`} />
      </DataRows>
    </Card>
  );
}
