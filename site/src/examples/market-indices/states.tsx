import { useState } from 'react';
import { MarketIndices } from '@punji/ui/market-indices';
import { SegmentedControl } from '@punji/ui/controls';
import { marketIndices } from '../../sample.ts';

type View = 'ready' | 'loading' | 'empty';

export default function Example() {
  const [view, setView] = useState<View>('loading');
  return (
    <div className="ex-stack">
      <SegmentedControl<View>
        label="State"
        prefix="indices-state"
        size="sm"
        value={view}
        onChange={setView}
        options={[
          { value: 'ready', label: 'Ready' },
          { value: 'loading', label: 'Loading' },
          { value: 'empty', label: 'Empty' },
        ]}
      />
      <MarketIndices
        indices={view === 'ready' ? marketIndices.slice(0, 3) : []}
        label="Market indices"
        loading={view === 'loading'}
        loadingLabel="Loading indices…"
        emptyLabel="No index values are published yet."
      />
    </div>
  );
}
