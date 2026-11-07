import { useState } from 'react';
import { ReorderList } from '@punji/ui/reorder-list';

const all = [
  { key: 'NABIL', title: 'NABIL', sub: 'Nabil Bank Limited' },
  { key: 'NICA', title: 'NICA', sub: 'NIC Asia Bank Limited' },
  { key: 'HDL', title: 'HDL', sub: 'Himalayan Distillery Limited' },
];

// Touch: 44px Up and Down buttons, no drag, so a scroll never moves a row. Words can be replaced with `labels`.
export default function Example() {
  const [keys, setKeys] = useState(all.map((i) => i.key));
  const [last, setLast] = useState<string | null>(null);
  const items = keys.map((k) => all.find((i) => i.key === k)!);
  return (
    <div style={{ inlineSize: 'min(24rem, 100%)' }}>
      <ReorderList
        mode="buttons"
        items={items}
        movedKey={last}
        onChange={(next) => {
          setLast(next.find((k, i) => k !== keys[i]) ?? null);
          setKeys(next);
        }}
        label="Reorder watchlist"
      />
    </div>
  );
}
