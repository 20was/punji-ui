import { useState } from 'react';
import { InboxGroup, InboxList, InboxRow, type InboxRowProps } from '@punji/ui/inbox-list';

// Groups of rows, an unread dot and weight (and "Unread" for screen readers), a staff-only row, and a footer.
export default function Example() {
  const [read, setRead] = useState<readonly string[]>([]);
  const row = (id: string, props: Omit<InboxRowProps, 'unread' | 'unreadLabel' | 'onOpen'>, unread = true) => (
    <InboxRow key={id} {...props} unread={unread && !read.includes(id)} unreadLabel="Unread" onOpen={() => setRead((r) => [...r, id])} />
  );
  const left = 3 - read.length;
  return (
    <div style={{ inlineSize: 'min(26rem, 100%)', border: '1px solid var(--pu-color-card-border)', borderRadius: 'var(--pu-radius-lg)', overflow: 'hidden' }}>
      <InboxList
        title="Notifications"
        meta={left > 0 ? `${left} unread` : 'All caught up'}
        action={{ label: 'Mark all read', onClick: () => setRead(['a', 'b', 'c']), disabled: left === 0 }}
        footer={{ label: 'Older notifications', onClick: () => {} }}
      >
        <InboxGroup label="Today">
          {row('a', { icon: 'trendDown', tone: 'loss', title: 'NICA fell below your alert of Rs 780', body: 'Last traded at Rs 776.50', kind: 'Price alert', time: '11:05' })}
          {row('b', { icon: 'calendar', tone: 'info', title: 'Book close for HDL tomorrow', kind: 'Book close', time: '09:30', href: '#hdl' })}
        </InboxGroup>
        <InboxGroup label="Earlier">
          {row('c', { icon: 'plus', tone: 'gain', title: 'Bonus shares credited for SHL', kind: 'Corporate action', time: 'Fri 16 Oct, 15:05' })}
          {row('d', { icon: 'news', title: 'Market wrap for Thursday', kind: 'News', time: 'Thu 15 Oct, 18:00' }, false)}
          {row('e', { icon: 'gift', title: 'Early access to the screener', kind: 'Launch', time: 'Wed 14 Oct, 10:00', staffLabel: 'Staff only' }, false)}
        </InboxGroup>
      </InboxList>
    </div>
  );
}
