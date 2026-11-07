import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { SegmentedControl } from '@punji/ui/controls';
import { InboxList, InboxSkeleton, InboxState } from '@punji/ui/inbox-list';
import { InlineState } from '@punji/ui/inline-state';

type View = 'loading' | 'empty' | 'error';

// While it loads: the skeleton (one status region). Empty and error: one InboxState holding an InlineState.
export default function Example() {
  const [view, setView] = useState<View>('loading');
  return (
    <div style={{ display: 'grid', gap: 'var(--pu-space-3)', inlineSize: 'min(26rem, 100%)' }}>
      <SegmentedControl<View>
        label="State"
        prefix="inbox-state"
        size="sm"
        value={view}
        onChange={setView}
        options={[{ value: 'loading', label: 'Loading' }, { value: 'empty', label: 'Empty' }, { value: 'error', label: 'Error' }]}
      />
      <div style={{ border: '1px solid var(--pu-color-card-border)', borderRadius: 'var(--pu-radius-lg)', overflow: 'hidden' }}>
        <InboxList title="Notifications" meta={view === 'empty' ? 'All caught up' : undefined}>
          {view === 'loading' ? <InboxSkeleton label="Loading notifications" rows={3} /> : null}
          {view === 'empty' ? (
            <InboxState>
              <InlineState icon="bell" title="No notifications yet" body="Price alerts and corporate actions show up here." />
            </InboxState>
          ) : null}
          {view === 'error' ? (
            <InboxState>
              <InlineState icon="error" tone="danger" title="Could not load notifications" actions={<Button variant="secondary" size="sm">Try again</Button>} />
            </InboxState>
          ) : null}
        </InboxList>
      </div>
    </div>
  );
}
