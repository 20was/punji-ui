import { useState } from 'react';
import { ShareBar, SHARE_TONES, type ShareItem } from '@punji/ui/meter';
import { sectorShares } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

// An item with onSelect becomes a button with aria-pressed: filter by it, or open it.
export default function Example() {
  const [selected, setSelected] = useState<string | null>('hydro');
  const items: ShareItem[] = sectorShares.map((s, i) => ({
    key: s.key,
    label: s.label,
    sub: `${i + 2} stocks`,
    pct: s.pct,
    tone: SHARE_TONES[i] ?? 'rest',
    selected: selected === s.key,
    onSelect: () => setSelected((current) => (current === s.key ? null : s.key)),
  }));
  return (
    <Stack>
      <ShareBar items={items} label="Share of invested value by sector" legend="grid" />
      <p>{selected ? `Filtering by ${selected}.` : 'No filter.'}</p>
    </Stack>
  );
}
