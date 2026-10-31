import { useState } from 'react';
import { SegmentedSwitch } from '@punji/ui/controls';
import { Stack } from '@punji/ui/stack';

type View = 'overview' | 'holdings' | 'history';

// With panelId the segments are ARIA tabs (a roving tab stop) and must control a tabpanel.
// SegmentedSwitch is the same control at the 44px size, for a page's own views.
export default function Example() {
  const [view, setView] = useState<View>('overview');
  return (
    <Stack>
      <SegmentedSwitch<View>
        label="Portfolio views"
        prefix="seg-view"
        panelId="seg-view-panel"
        value={view}
        onChange={setView}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'holdings', label: 'Holdings', count: 12 },
          { value: 'history', label: 'History' },
        ]}
      />
      <div id="seg-view-panel" role="tabpanel" aria-labelledby={`seg-view-${view}`} tabIndex={0}>
        Showing the {view} view.
      </div>
    </Stack>
  );
}
