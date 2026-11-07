/**
 * InboxList (design.punji.app/components/inbox-list): a list of notifications,
 * for a Popover on a wide screen and the whole screen on a phone (the head's
 * back button shows there).
 *
 *   InboxList     the head (title, the unread count or "All caught up", one
 *                 action), a filter, an optional note (offline), the body
 *                 (groups, or one state), and a footer (older ones)
 *   InboxGroup    a day's rows under its label (Today, Earlier)
 *   InboxRow      one notification: the kind's icon chip, the sentence, kind
 *                 and time, and the unread weight and dot. One tap opens it;
 *                 the row has no other control.
 *   InboxState    the state a list holds instead of rows (empty, caught up, error)
 *   InboxSkeleton rows shaped like the real ones while the list loads
 *
 * Text is passed as text and printed as text: never markup.
 */
import type { MouseEvent, ReactNode } from 'react';

import { AppLink } from '../internal/link.tsx';
import type { LinkComponent } from '../internal/link.tsx';
import { Skeleton } from '../states/States.tsx';

export interface InboxListProps {
  /** The heading ("Notifications"). */
  title: string;
  /** "3 unread", "All caught up"; nothing while it loads. Announced politely when it changes. */
  meta?: ReactNode;
  /** The head's one action (Mark all read). */
  action?: { label: string; onClick: () => void; disabled?: boolean; testId?: string };
  /** The phone's back button (full screen); leave it out on a wide screen, where Esc and a click outside close. */
  onBack?: () => void;
  /** The back button's accessible name. */
  backLabel?: string;
  /** All | Unread (a SegmentedControl). */
  filter?: ReactNode;
  /** One line above the list (offline, showing what loaded earlier). */
  note?: ReactNode;
  /** InboxGroup rows, an InboxSkeleton, or one InboxState (empty, caught up, error). */
  children: ReactNode;
  /** Older notifications. */
  footer?: { label: string; onClick: () => void; busy?: boolean; testId?: string };
  /** Becomes data-testid on the root; the back button gets `<testId>-back`. */
  testId?: string;
}

/**
 * @stability beta
 */
export function InboxList({ title, meta, action, onBack, backLabel = 'Back', filter, note, children, footer, testId }: InboxListProps) {
  return (
    <div className="pu-inbox" data-testid={testId}>
      <div className="pu-inbox-head">
        {onBack ? (
          <button type="button" className="pu-inbox-back" onClick={onBack} aria-label={backLabel} data-testid={testId ? `${testId}-back` : undefined}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        ) : null}
        <h2>{title}</h2>
        <span className="pu-inbox-meta" aria-live="polite">{meta}</span>
        {action ? (
          <button type="button" className="pu-inbox-act" onClick={action.onClick} disabled={action.disabled} data-testid={action.testId}>
            {action.label}
          </button>
        ) : null}
      </div>
      {filter ? <div className="pu-inbox-filter">{filter}</div> : null}
      {note ? <div className="pu-inbox-note">{note}</div> : null}
      <div className="pu-inbox-body">{children}</div>
      {footer ? (
        <div className="pu-inbox-foot">
          <button type="button" className="pu-inbox-more" onClick={footer.onClick} disabled={footer.busy} aria-busy={footer.busy || undefined} data-testid={footer.testId}>
            {footer.label}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export interface InboxGroupProps {
  /** The group's label (Today, Earlier). Names the section. */
  label: string;
  /** InboxRow items. */
  children: ReactNode;
  /** Becomes data-testid on the group. */
  testId?: string;
}

/**
 * A day's rows under its label.
 * @stability beta
 */
export function InboxGroup({ label, children, testId }: InboxGroupProps) {
  return (
    <section className="pu-inbox-group" aria-label={label} data-testid={testId}>
      <h3 className="pu-inbox-group-head" aria-hidden="true">{label}</h3>
      {/* oxlint-disable-next-line jsx-a11y/no-redundant-roles -- Safari drops list semantics from list-style: none lists unless the role is explicit */}
      <ul role="list">{children}</ul>
    </section>
  );
}

/** The state a list holds instead of rows (an InlineState inside). */
export interface InboxStateProps {
  /** The state's content. */
  children: ReactNode;
  /** Becomes data-testid. */
  testId?: string;
}

/**
 * @stability beta
 */
export function InboxState({ children, testId }: InboxStateProps) {
  return (
    <div className="pu-inbox-state" data-testid={testId}>
      {children}
    </div>
  );
}

export type InboxIcon = 'calendar' | 'plus' | 'trendDown' | 'star' | 'bell' | 'info' | 'pulse' | 'percent' | 'ticket' | 'sun' | 'moon' | 'news' | 'gift' | 'eyeOff';
/** The chip's colour: info (a date), gain (shares to add), warn (less than before), loss (an alert fired), neutral. */
export type InboxTone = 'info' | 'gain' | 'warn' | 'loss' | 'neutral';

const ICONS: Record<InboxIcon, string> = {
  calendar: 'M4 6.5h16v13.5H4zM4 10.5h16M8.5 4v4M15.5 4v4',
  plus: 'M12 5v14M5 12h14',
  trendDown: 'M3 7l6 6 4-4 8 8M15 17h6v-6',
  star: 'M12 4.5l2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 16.3l-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z',
  bell: 'M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20.5a2 2 0 004 0',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v5M12 7.5h.01',
  pulse: 'M3 12h4l3-7 4 14 3-7h4',
  percent: 'M19 5L5 19M7.5 9.5a2 2 0 100-4 2 2 0 000 4zM16.5 18.5a2 2 0 100-4 2 2 0 000 4z',
  ticket: 'M4 7h16v3a2 2 0 000 4v3H4v-3a2 2 0 000-4zM14 7v10',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
  news: 'M5 5h11v14H6a1 1 0 01-1-1zM16 9h3v9a1 1 0 01-1 1h-2M8 9h5M8 12.5h5M8 16h3',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3-5-3-5 0M12 7c1.5-3 5-3 5 0',
  eyeOff: 'M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10 10 0 0121 12a16 16 0 01-2.4 3M6.6 6.6A16 16 0 003 12s3.5 6 9 6a9.7 9.7 0 003.4-.6',
};

export interface InboxRowProps {
  /** The kind's glyph. */
  icon: InboxIcon;
  /** The chip's colour. Default 'neutral'. */
  tone?: InboxTone;
  /** The sentence (text, never markup). */
  title: string;
  /** A second line. */
  body?: string | null;
  /** The kind's quiet word ("Book close"). */
  kind: string;
  /** "11:05" today, "Fri 16 Oct, 15:05" earlier. Pass it already formatted. */
  time: string;
  /** Whether it is unread (weight and a dot). */
  unread: boolean;
  /** Said for a screen reader on an unread row ("Unread"). */
  unreadLabel: string;
  /** Only staff see this kind ("Staff only", with the eye-off mark); never shown to a member. */
  staffLabel?: string | null;
  /** The page it opens (an internal path the caller has checked); none: the row is a button that only marks itself read. */
  href?: string | null;
  /** Opened (a click, Enter or Space). For a link, the caller may prevent the default and navigate itself. */
  onOpen: (e: MouseEvent<HTMLElement>) => void;
  /** Link component for `href`; wins over LinkProvider. */
  linkComponent?: LinkComponent;
  /** Becomes data-testid on the row's control. */
  testId?: string;
}

/**
 * One notification. One tap opens it; the row has no other control.
 * @stability beta
 */
export function InboxRow({ icon, tone = 'neutral', title, body, kind, time, unread, unreadLabel, staffLabel, href, onOpen, linkComponent, testId }: InboxRowProps) {
  const inner = (
    <>
      <span className={`pu-inbox-chip${tone === 'neutral' ? '' : ` pu-inbox-chip-${tone}`}`} aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={ICONS[staffLabel ? 'eyeOff' : icon]} />
        </svg>
      </span>
      <span className="pu-inbox-text">
        <span className="pu-inbox-title">{title}</span>
        {body ? <span className="pu-inbox-body-text">{body}</span> : null}
        <span className="pu-inbox-meta-line">
          {staffLabel ? `${staffLabel} · ${time}` : `${kind} · ${time}`}
          {unread ? <span className="kit-sr">, {unreadLabel}</span> : null}
        </span>
      </span>
      {unread ? <i className="pu-inbox-dot" aria-hidden="true" /> : <i aria-hidden="true" />}
    </>
  );
  const cls = `pu-inbox-row${unread ? ' pu-inbox-unread' : ''}`;
  return (
    <li>
      {href ? (
        <AppLink className={cls} href={href} linkComponent={linkComponent} onClick={onOpen} data-testid={testId} data-unread={unread || undefined}>
          {inner}
        </AppLink>
      ) : (
        <button type="button" className={cls} onClick={onOpen} data-testid={testId} data-unread={unread || undefined}>
          {inner}
        </button>
      )}
    </li>
  );
}

export interface InboxSkeletonProps {
  /** How many placeholder rows (default 5). */
  rows?: number;
  /** The loading region's name ("Loading notifications"). */
  label: string;
  /** Becomes data-testid. */
  testId?: string;
}

/**
 * Rows shaped like the real ones while the list loads (role="status").
 * @stability beta
 */
export function InboxSkeleton({ rows = 5, label, testId = 'inbox-skeleton' }: InboxSkeletonProps) {
  return (
    <div role="status" aria-label={label} data-testid={testId}>
      <span className="pu-inbox-group-head">
        <Skeleton width={44} height={10} />
      </span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="pu-inbox-skel" aria-hidden="true">
          <Skeleton width={36} height={36} radius={10} />
          <span>
            <Skeleton width={`${72 - (i % 3) * 12}%`} height={12} />
            <Skeleton width={`${90 - (i % 2) * 14}%`} height={10} />
            <Skeleton width={96} height={9} />
          </span>
        </div>
      ))}
    </div>
  );
}
