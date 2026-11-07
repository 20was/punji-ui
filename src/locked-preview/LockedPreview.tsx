/**
 * LockedPreview (design.punji.app/components/locked-preview): what a signed-in
 * view looks like, shown to someone who is not signed in. A card on the
 * inverse surface holds EXAMPLE rows, blurred and hidden from assistive
 * technology, with a lock over them, one line on what is behind it and one
 * action (sign in).
 *
 * The example is shapes, not data: bars where a name and a figure would be
 * (`LockedRow`, `LockedTile`). It carries no name and no number, so nothing in
 * it can be read as a fact about anyone. A reader who is signed in never sees
 * this card. Like `LockedNote`, it is a message, not a lock.
 */
import type { ReactNode } from 'react';

import { Card } from '../card/Card.tsx';

export interface LockedPreviewProps {
  /** The view the example stands for ("Today's most active brokers"). The card's heading. */
  title: ReactNode;
  /** An optional small label beside the title ("Preview"). */
  stamp?: ReactNode;
  /** The example: static markup (LockedRow, LockedTile), never interactive; it is blurred and aria-hidden. */
  children: ReactNode;
  /** What is behind the lock, as a heading. */
  lockTitle: ReactNode;
  /** One line on how to get it. */
  lockText: ReactNode;
  /** The one action (a sign-in Button or link). */
  action: ReactNode;
  /** A quiet line under the action. */
  foot?: ReactNode;
  /** The lock heading's level (default 3, under the card's h2). */
  lockHeadingLevel?: 3 | 4;
  /** Layout only. */
  className?: string;
  /** Becomes data-testid on the card. */
  testId?: string;
}

/**
 * @remarks A locked state is a message, not a lock. UX safeguard only. The example holds no data, and the server must still withhold the real view.
 *
 * @stability beta
 */
export function LockedPreview({ title, stamp, children, lockTitle, lockText, action, foot, lockHeadingLevel = 3, className, testId }: LockedPreviewProps) {
  const Heading = `h${lockHeadingLevel}` as 'h3' | 'h4';
  return (
    <Card tone="inverse" title={title} action={stamp ? <span className="pu-locked-stamp">{stamp}</span> : undefined} className={className} testId={testId}>
      <div className="pu-locked-stage">
        <div className="pu-locked-ghost" aria-hidden="true" inert>
          {children}
        </div>
        <div className="pu-locked-gate">
          <div className="pu-locked-box">
            <span className="pu-locked-lock" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </span>
            <Heading>{lockTitle}</Heading>
            <p>{lockText}</p>
            {action}
            {foot ? <p className="pu-locked-foot">{foot}</p> : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

const WIDTHS = [62, 48, 70, 54, 66, 44];

export interface LockedRowProps {
  /** Which row this is: varies the bar widths so a stack of them does not look uniform. */
  index?: number;
  /** A square before the name bar (default true). */
  badge?: boolean;
  /** A bar between the name and the value (default true). */
  bar?: boolean;
}

/**
 * A row-shaped placeholder: an optional badge square, a name bar, a diverging bar and a value bar. Static; no text.
 * @stability beta
 */
export function LockedRow({ index = 0, badge = true, bar = true }: LockedRowProps) {
  const w = WIDTHS[index % WIDTHS.length]!;
  return (
    <div className={`pu-locked-row${badge ? ' pu-locked-has-badge' : ''}${bar ? ' pu-locked-has-bar' : ''}`}>
      {badge ? <span className="pu-locked-sq" /> : null}
      <span className="pu-locked-shape" style={{ inlineSize: `${w}%` }} />
      {bar ? (
        <span className="pu-locked-track">
          <span className={`pu-locked-fill${index % 2 ? ' pu-locked-neg' : ''}`} style={{ inlineSize: `${w - 12}%` }} />
        </span>
      ) : null}
      <span className="pu-locked-shape pu-locked-val" />
    </div>
  );
}

/**
 * A tile-shaped placeholder: a label bar over a figure bar.
 * @stability beta
 */
export function LockedTile() {
  return (
    <div className="pu-locked-tile">
      <span className="pu-locked-shape pu-locked-lab" />
      <span className="pu-locked-shape pu-locked-fig" />
    </div>
  );
}
