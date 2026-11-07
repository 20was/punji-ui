import { useState } from 'react';
import { ReorderList } from '@punji/ui/reorder-list';

const all = [
  { key: 'NABIL', title: 'NABIL', sub: 'Nabil Bank Limited' },
  { key: 'NICA', title: 'NICA', sub: 'NIC Asia Bank Limited' },
  { key: 'HDL', title: 'HDL', sub: 'Himalayan Distillery Limited' },
  { key: 'SHL', title: 'SHL', sub: 'Soaltee Hotel Limited' },
];

// Focus a handle, Space to pick up, ArrowUp or ArrowDown to move, Space to drop, Esc to put it back. Each step is spoken.
// Drag with a mouse works too. The list is controlled; saving is yours.
export default function Example() {
  const [keys, setKeys] = useState(all.map((i) => i.key));
  const items = keys.map((k) => all.find((i) => i.key === k)!);
  return (
    <div style={{ inlineSize: 'min(24rem, 100%)' }}>
      <ReorderList items={items} onChange={setKeys} label="Reorder watchlist" />
    </div>
  );
}
