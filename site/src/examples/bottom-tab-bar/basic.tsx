import { useState } from 'react';
import { BottomTabBar } from '@punji/ui/bottom-tab-bar';
import { MenuItemRow, MenuList } from '@punji/ui/menu';

const icon = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// Placement "inline" keeps the preview in the page; the real bar is fixed to the bottom of a phone. You say which tab
// is current. More opens the Sheet; here the page controls it (`open`) so a choice in the list can close it.
export default function Example() {
  const [current, setCurrent] = useState('markets');
  const [open, setOpen] = useState(false);
  return (
    <div style={{ inlineSize: 'min(24rem, 100%)', border: '1px solid var(--pu-color-card-border)', borderRadius: 'var(--pu-radius-lg)', overflow: 'hidden' }}>
      <p style={{ margin: 0, padding: 'var(--pu-space-6) var(--pu-space-4)', fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)' }}>Current: {current}</p>
      <BottomTabBar
        label="Example: main"
        placement="inline"
        current={current}
        tabs={[
          { id: 'markets', label: 'Markets', icon: icon('M4 19V9M10 19V5M16 19v-8M22 19H2'), href: '#markets' },
          { id: 'portfolio', label: 'Portfolio', icon: icon('M4 8h16v11H4zM9 8V5h6v3'), href: '#portfolio' },
          { id: 'watchlist', label: 'Watchlist', icon: icon('M12 4.5l2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 16.3l-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z'), href: '#watchlist' },
          { id: 'alerts', label: 'Alerts', icon: icon('M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20.5a2 2 0 004 0'), href: '#alerts' },
        ]}
        open={open}
        onOpenChange={setOpen}
        more={
          <MenuList label="More" onClose={() => setOpen(false)}>
            <MenuItemRow to="#settings" next>
              Settings
            </MenuItemRow>
            <MenuItemRow to="#feedback" next>
              Feedback
            </MenuItemRow>
            <MenuItemRow onSelect={() => setCurrent('more')}>Mark More as current</MenuItemRow>
          </MenuList>
        }
        moreTitle="More"
      />
    </div>
  );
}
