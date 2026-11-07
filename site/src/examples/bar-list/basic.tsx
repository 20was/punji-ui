import { useState } from 'react';

import { BarList, type BarListItem } from '@punji/ui/bar-list';
import { Card } from '@punji/ui/card';
import { MoneyDisplay } from '@punji/ui/money-display';

// Amounts are bigint minor units: the bars are exact, and the printed value is the formatted amount.
const sectors: { id: string; label: string; minor: bigint | null }[] = [
  { id: 'banks', label: 'Commercial Banks', minor: 9_412_600_000_00n },
  { id: 'hydro', label: 'Hydropower', minor: 3_120_450_000_00n },
  { id: 'insurance', label: 'Life Insurance', minor: 1_870_000_000_00n },
  { id: 'hotels', label: 'Hotels and Tourism', minor: null },
];

export default function Example() {
  const [picked, setPicked] = useState('none');
  const items: BarListItem[] = sectors.map((s) => ({
    id: s.id,
    label: s.label,
    value: s.minor,
    valueText: s.minor === null ? 'No data' : <MoneyDisplay value={s.minor} currency="NPR" compact locale="en-IN" />,
    disabled: s.id === 'insurance',
  }));
  return (
    <Card title="Turnover by sector" description={`Last session · opened: ${picked}`} headingLevel={3}>
      <BarList label="Turnover by sector" items={items} empty="No sectors" onItemClick={setPicked} />
    </Card>
  );
}
