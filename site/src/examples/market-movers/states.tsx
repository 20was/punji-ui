import { useState } from 'react';
import { MarketMovers } from '@punji/ui/market-movers';
import { SegmentedControl } from '@punji/ui/controls';
import { quotes } from '../../sample.ts';

type View = 'ready' | 'loading' | 'error' | 'flat';

// 'flat' is a day on which nothing moved: no gainers and no losers, so each tab shows its own empty message.
export default function Example() {
  const [view, setView] = useState<View>('loading');
  const flat = quotes.map((q) => ({ ...q, previousClose: q.ltp }));
  return (
    <div className="ex-stack">
      <SegmentedControl<View>
        label="State"
        prefix="movers-state"
        size="sm"
        value={view}
        onChange={setView}
        options={[
          { value: 'ready', label: 'Ready' },
          { value: 'loading', label: 'Loading' },
          { value: 'error', label: 'Error' },
          { value: 'flat', label: 'Flat day' },
        ]}
      />
      <MarketMovers
        quotes={view === 'flat' ? flat : quotes}
        label="Market movers"
        limit={3}
        state={view === 'loading' || view === 'error' ? view : 'ready'}
        retryLabel="Try again"
        onRetry={() => setView('loading')}
        emptyLabels={{ gainers: 'No gainers today.', losers: 'No losers today.' }}
      />
    </div>
  );
}
