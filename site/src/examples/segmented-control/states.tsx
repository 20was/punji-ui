import { useState } from 'react';
import { SegmentedControl } from '@punji/ui/controls';

type Scope = 'mine' | 'family' | 'all';

export default function Example() {
  const [scope, setScope] = useState<Scope>('mine');
  return (
    <div className="ex-stack">
      <p className="doc-muted">Accent tone: the one choice that frames a whole page. At most one per page.</p>
      <SegmentedControl<Scope>
        label="Whose portfolio"
        prefix="seg-accent"
        tone="accent"
        value={scope}
        onChange={setScope}
        options={[
          { value: 'mine', label: 'Mine' },
          { value: 'family', label: 'Family', count: 2 },
          { value: 'all', label: 'Everyone' },
        ]}
      />
      <p className="doc-muted">Disabled while there is nothing to choose yet.</p>
      <SegmentedControl<Scope>
        label="Scope, no data yet"
        prefix="seg-off"
        disabled
        value={scope}
        onChange={setScope}
        options={[
          { value: 'mine', label: 'Mine' },
          { value: 'family', label: 'Family' },
          { value: 'all', label: 'Everyone' },
        ]}
      />
    </div>
  );
}
