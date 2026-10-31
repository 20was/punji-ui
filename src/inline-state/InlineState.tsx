/**
 * InlineState (design.punji.app/components/inline-state): a state inside a
 * card, where its data would be: an icon tile, a title, one line and its
 * actions. Locked ("Not included on this account", with a lock, never a plan
 * name), failed (what happened and Try again), empty (why, and the one next
 * step), offline, stale or slow. `layout="row"` is a one-line banner with its
 * action at the end (a list that did not load, prices that stopped);
 * `"stack"` puts the actions under the words. A failure is an alert (`role`).
 *
 * Use EmptyState for a whole page or panel that has nothing, RetryNote for a
 * single line with Try again, Note for a caveat beside data. The icon is
 * decorative and the tone only tints it: the title and body say the state.
 */
import type { ReactNode } from 'react';

export type StateIcon = 'lock' | 'error' | 'clock' | 'offline' | 'info' | 'star' | 'bell' | 'chart' | 'eyeOff' | 'check';

const PATHS: Record<StateIcon, string> = {
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 118 0v4',
  error: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7.5v5M12 16h.01',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  offline: 'M3 3l18 18M8.5 16.5a5 5 0 017 0M5 12.6a10 10 0 015.3-2.5M19 12.6a10 10 0 00-2-1.5M2 8.8a15 15 0 015.2-3.1M22 8.8A15 15 0 0011 5M12 20h.01',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v5M12 7.5h.01',
  star: 'M12 4.5l2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 16.3l-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z',
  bell: 'M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20.5a2 2 0 004 0',
  chart: 'M4 19V9M10 19V5M16 19v-7M21 19H3',
  eyeOff: 'M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10 10 0 0121 12a16 16 0 01-2.4 3M6.6 6.6A16 16 0 003 12s3.5 6 9 6a9.7 9.7 0 003.4-.6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
};

/** One of the state icons, drawn in the current colour (decorative). */
export function StateGlyph({ name, size = 18 }: { name: StateIcon; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function InlineState({ icon, tone, title, body, actions, layout = 'stack', bare = false, role, className, testId }: {
  icon: StateIcon;
  /** The icon tile's colour: error (loss), warn (amber), or quiet (default). */
  tone?: 'error' | 'warn';
  title?: ReactNode;
  body?: ReactNode;
  /** Buttons or links (a Try again). */
  actions?: ReactNode;
  /** row: a one-line banner; stack: actions under the words. */
  layout?: 'stack' | 'row';
  /** No ground of its own: the state is the card's whole content (a Card holding only this). */
  bare?: boolean;
  /** 'alert' for a failure, 'status' for a state that changes (offline, stale). */
  role?: 'alert' | 'status';
  /** Layout only (margin, flex, grid placement). */
  className?: string;
  testId?: string;
}) {
  return (
    <div className={`kit-istate ${layout}${bare ? ' bare' : ''}${tone ? ` ${tone}` : ''}${className ? ` ${className}` : ''}`} role={role} data-testid={testId}>
      <span className="kit-istate-ic">
        <StateGlyph name={icon} />
      </span>
      <div className="kit-istate-tx">
        {title && <b>{title}</b>}
        {body && <p>{body}</p>}
      </div>
      {actions && <div className="kit-istate-acts">{actions}</div>}
    </div>
  );
}
