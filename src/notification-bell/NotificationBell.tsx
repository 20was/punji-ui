/**
 * NotificationBell (design.punji.app/components/notification-bell): a bar
 * button with a bell and the unread count. The count is drawn up to 99 and
 * as 99+ past it; the button's name always carries the real number
 * ("Notifications, 128 unread"). No count yet (still loading) or none unread:
 * no badge at all, never a 0. `staffOnly` adds the eye-off mark staff see on
 * a hidden launch.
 */
import type { MouseEvent, Ref } from 'react';

/** The badge's text: the count up to 99, then 99+; null when nothing is drawn. */
export function badgeText(count: number | null | undefined): string | null {
  if (count === null || count === undefined || !Number.isFinite(count) || count < 1) return null;
  return count > 99 ? '99+' : String(Math.floor(count));
}

export interface NotificationBellProps {
  /** Unread, as the reader may see them; null while it loads. */
  count: number | null;
  /** The whole accessible name, count included ("Notifications, 3 unread"; "Notifications" when none or loading). */
  label: string;
  /** Called on a click, Enter or Space. */
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Whether the inbox it opens is open (aria-expanded). */
  expanded: boolean;
  /** The inbox's id (aria-controls). */
  controls?: string;
  /** A hidden launch staff can see: the eye-off mark. */
  staffOnly?: boolean;
  /** Becomes data-testid on the button; the badge gets `<testId>-count`. */
  testId?: string;
  /** Layout only (margin, grid placement). */
  className?: string;
  /** React 19: a ref is a prop. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * @stability beta
 */
export function NotificationBell({ count, label, onClick, expanded, controls, staffOnly = false, testId, className, ref }: NotificationBellProps) {
  const n = badgeText(count);
  return (
    <button
      ref={ref}
      type="button"
      className={`pu-bell${className ? ` ${className}` : ''}`}
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      data-testid={testId}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20.5a2 2 0 004 0" />
      </svg>
      {n ? (
        // Drawn from data-n (CSS content), not text: the name already says the real count, so "99+" is never a second, different name.
        <span className="pu-bell-n" aria-hidden="true" data-n={n} data-testid={testId ? `${testId}-count` : undefined} />
      ) : null}
      {staffOnly ? (
        <span className="pu-bell-staff" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10 10 0 0121 12a16 16 0 01-2.4 3M6.6 6.6A16 16 0 003 12s3.5 6 9 6a9.7 9.7 0 003.4-.6" />
          </svg>
        </span>
      ) : null}
    </button>
  );
}
