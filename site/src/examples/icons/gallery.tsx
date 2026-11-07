import { useMemo, useState } from 'react';
import { Icon, iconNames } from '@punji/ui/icons';
import { ListFilter } from '@punji/ui/list-filter';

// Every name Icon accepts, aliases included. Click a tile to copy its name.
export default function Example() {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const names = useMemo(() => iconNames(), []);
  const q = query.trim().toLowerCase();
  const shown = names.filter((n) => !q || n.toLowerCase().includes(q));
  return (
    <div>
      <ListFilter value={query} onChange={setQuery} label="Search icons" clear="Clear search" testId="icon-search" />
      <p className="doc-muted" role="status" style={{ margin: '8px 0' }}>
        {picked ? `Copied: ${picked}` : `${shown.length} of ${names.length} names`}
      </p>
      <ul aria-label="Icons" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 8 }}>
        {shown.map((name) => (
          <li key={name} style={{ minWidth: 0 }}>
            <button
              type="button"
              onClick={() => {
                setPicked(name);
                void navigator.clipboard?.writeText(name);
              }}
              style={{ width: '100%', minHeight: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, border: '1px solid currentColor', borderRadius: 8, background: 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer' }}
            >
              <Icon name={name} size="lg" />
              <span style={{ fontSize: 12, overflowWrap: 'anywhere', textAlign: 'center' }}>{name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
