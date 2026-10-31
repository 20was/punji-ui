import { useState } from 'react';
import { ChipRow } from '@punji/ui/controls';
import { Card } from '@punji/ui/card';
import { quotes } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

// ChipRow is a single choice: exactly one chip is pressed (aria-pressed). The counts come from the data, not from the chips.
const sectors = [...new Set(quotes.map((q) => q.sector))];
const options = [
  { value: 'All', label: 'All', count: quotes.length },
  ...sectors.map((s) => ({ value: s, label: s, count: quotes.filter((q) => q.sector === s).length })),
];

export default function Example() {
  const [sector, setSector] = useState('All');
  const shown = quotes.filter((q) => sector === 'All' || q.sector === sector);
  return (
    <Stack>
      <ChipRow label="Sector" prefix="sector" options={options} value={sector} onChange={setSector} wrap />
      <Card title={`${sector}: ${shown.length} listed`} headingLevel={3}>
        <p className="ex-label">{shown.map((q) => q.symbol).join(', ')}</p>
      </Card>
    </Stack>
  );
}
