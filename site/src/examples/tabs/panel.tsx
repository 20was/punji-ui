import { useState } from 'react';
import { PanelTabs } from '@punji/ui/tabs';

type View = 'watch' | 'lists' | 'alerts';

const icon = (path: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

// PanelTabs: an icon over one short word, sharing the panel's width. The same ARIA tabs as Tabs.
export default function Example() {
  const [view, setView] = useState<View>('watch');
  return (
    <div className="ex-stack">
      <PanelTabs<View>
        label="Side panel"
        prefix="panel-tabs"
        panelId="panel-tabs-body"
        value={view}
        onChange={setView}
        options={[
          { value: 'watch', label: 'Watch', icon: icon('M12 5c-5 0-9 7-9 7s4 7 9 7 9-7 9-7-4-7-9-7zM12 9a3 3 0 100 6 3 3 0 000-6z') },
          { value: 'lists', label: 'Lists', icon: icon('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01') },
          { value: 'alerts', label: 'Alerts', icon: icon('M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4') },
        ]}
      />
      <div id="panel-tabs-body" role="tabpanel" aria-labelledby={`panel-tabs-${view}`} tabIndex={0}>
        Showing {view}.
      </div>
    </div>
  );
}
