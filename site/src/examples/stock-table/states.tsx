import { useState } from 'react';
import { StockTable } from '@punji/ui/stock-table';
import { SegmentedControl } from '@punji/ui/controls';
import { quotes } from '../../sample.ts';

type View = 'ready' | 'loading' | 'error' | 'empty';

export default function Example() {
  const [view, setView] = useState<View>('loading');
  return (
    <div className="ex-stack">
      <SegmentedControl<View>
        label="State"
        prefix="stock-state"
        size="sm"
        value={view}
        onChange={setView}
        options={[
          { value: 'ready', label: 'Ready' },
          { value: 'loading', label: 'Loading' },
          { value: 'error', label: 'Error' },
          { value: 'empty', label: 'Empty' },
        ]}
      />
      <StockTable
        caption="Quotes by state"
        quotes={view === 'ready' ? quotes.slice(0, 4) : []}
        state={view === 'loading' || view === 'error' ? view : 'ready'}
        emptyLabel="No quotes match your filter."
        loadingLabel="Loading quotes…"
        errorLabel="Quotes could not be loaded."
        retryLabel="Try again"
        onRetry={() => setView('loading')}
      />
    </div>
  );
}
