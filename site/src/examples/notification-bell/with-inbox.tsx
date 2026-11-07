import { useRef, useState } from 'react';
import { InboxGroup, InboxList, InboxRow } from '@punji/ui/inbox-list';
import { NotificationBell } from '@punji/ui/notification-bell';
import { Popover, PopoverAnchor } from '@punji/ui/popover';

// The bell is the Popover's anchor and trigger; aria-expanded follows the state. Esc closes it and focus returns here.
export default function Example() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(2);
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <div style={{ minHeight: '24rem', display: 'flex', justifyContent: 'flex-end' }}>
      <PopoverAnchor>
        <NotificationBell ref={anchor} count={unread} label={unread ? `Notifications, ${unread} unread` : 'Notifications'} expanded={open} controls="bell-inbox" onClick={() => setOpen((v) => !v)} />
        <Popover open={open} anchor={anchor} onClose={() => setOpen(false)} label="Notifications" id="bell-inbox" align="end">
          <div style={{ inlineSize: 'min(22rem, calc(100vw - 32px))' }}>
            <InboxList title="Notifications" meta={unread ? `${unread} unread` : 'All caught up'} action={{ label: 'Mark all read', onClick: () => setUnread(0), disabled: !unread }}>
              <InboxGroup label="Today">
                <InboxRow icon="percent" tone="gain" title="NABIL declared a 12% cash dividend" kind="Dividend" time="11:05" unread={unread > 0} unreadLabel="Unread" onOpen={() => setUnread(0)} />
              </InboxGroup>
            </InboxList>
          </div>
        </Popover>
      </PopoverAnchor>
    </div>
  );
}
