import { useState } from 'react';
import { formatTimestamp } from '@punji/ui/banking';
import { Button } from '@punji/ui/button';
import { ChipRow } from '@punji/ui/controls';
import { EmptyState } from '@punji/ui/states';
import { ScreenTitle } from '../shared/kit.tsx';
import { useBank, type NoticeKind } from './store.ts';

type Filter = 'all' | 'unread' | NoticeKind;
const KIND_LABEL: Record<NoticeKind, string> = { transaction: 'Money', security: 'Security', reminder: 'Reminder', offer: 'Offer' };

/** Notifications: money in and out, security, reminders and offers, with unread state and filters. */
export default function AlertsScreen() {
  const { state, derived, dispatch, go } = useBank();
  const [filter, setFilter] = useState<Filter>('all');
  const shown = state.notifications.filter((n) => filter === 'all' || (filter === 'unread' ? !n.read : n.kind === filter));
  const count = (f: Filter) => state.notifications.filter((n) => f === 'all' || (f === 'unread' ? !n.read : n.kind === f)).length;
  const options: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'transaction', label: 'Money' },
    { value: 'security', label: 'Security' },
    { value: 'reminder', label: 'Reminders' },
    { value: 'offer', label: 'Offers' },
  ];

  return (
    <div className="app-stack">
      <ScreenTitle
        aside={
          <Button size="sm" variant="secondary" onClick={() => dispatch({ type: 'read', id: 'all' })} disabled={derived.unread === 0} testId="rb-read-all">
            Mark all read
          </Button>
        }
      >
        Notifications
      </ScreenTitle>
      <ChipRow options={options.map((o) => ({ ...o, count: count(o.value) }))} value={filter} onChange={setFilter} prefix="rb-alerts" label="Show" size="sm" wrap />
      {shown.length === 0 ? (
        <EmptyState
          title={filter === 'unread' ? 'All caught up' : 'Nothing here yet'}
          body={filter === 'unread' ? 'You have read every notification.' : 'Notifications of this kind will show here.'}
          headingLevel={3}
          role="status"
          action={
            <Button size="sm" variant="secondary" onClick={() => setFilter('all')}>
              Show all
            </Button>
          }
        />
      ) : (
        <ul className="rb-alerts" aria-label="Notifications" data-testid="rb-alerts">
          {shown.map((n) => {
            const when = formatTimestamp(n.at, { timeZone: 'Asia/Kathmandu' });
            return (
              <li key={n.id} data-unread={n.read ? undefined : 'true'}>
                <span className="rb-alert-kind" data-kind={n.kind}>
                  {KIND_LABEL[n.kind]}
                </span>
                <div className="rb-alert-main">
                  <h3 className="rb-alert-title">
                    {!n.read && <span className="kit-sr">Unread: </span>}
                    {n.title}
                  </h3>
                  <p className="rb-alert-body">{n.body}</p>
                  <p className="rb-alert-meta">
                    {when ? <time dateTime={when.iso}>{when.text}</time> : null}
                    {n.kind === 'transaction' && (
                      <Button size="sm" variant="ghost" onClick={() => go('accounts')}>
                        Statement
                      </Button>
                    )}
                    {n.kind === 'security' && n.title.startsWith('New sign-in') && (
                      <Button size="sm" variant="ghost" onClick={() => go('cards')}>
                        Freeze cards
                      </Button>
                    )}
                  </p>
                </div>
                {!n.read && (
                  <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'read', id: n.id })} aria-label={`Mark read: ${n.title}`}>
                    Mark read
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
