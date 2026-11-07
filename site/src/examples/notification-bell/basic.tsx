import { NotificationBell } from '@punji/ui/notification-bell';

const bell = (count: number | null, label: string) => <NotificationBell count={count} label={label} expanded={false} onClick={() => {}} />;

// The badge is drawn up to 99 and as 99+ past it; the name keeps the real number. Loading (null) and none unread draw
// no badge at all, never a 0.
export default function Example() {
  return (
    <div style={{ display: 'flex', gap: 'var(--pu-space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
      {bell(null, 'Notifications (loading)')}
      {bell(0, 'Notifications, none unread')}
      {bell(3, 'Notifications, 3 unread')}
      {bell(128, 'Notifications, 128 unread')}
      <NotificationBell count={2} label="Notifications, 2 unread, staff only" expanded={false} onClick={() => {}} staffOnly />
    </div>
  );
}
