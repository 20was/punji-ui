/**
 * PromptCard (design.punji.app/components/prompt-card): the one thing to do on
 * an empty page. A small eyebrow, a large headline, a line of why, and its
 * actions (one primary). `OutlineTile` is a dashed outline of what will show
 * once there is data: a title, a line and a simple drawing, and no figures, so
 * nothing on it can be mistaken for one.
 *
 * Not an EmptyState: that is a state (empty, failed) inside a page or a card,
 * with an optional status role; a PromptCard is the page's invitation, with
 * the largest headline on the page, never inside a card.
 */
import type { ReactNode } from 'react';

export interface PromptCardProps {
  /** A small line over the headline ("Watchlist"). */
  eyebrow?: ReactNode;
  /** The headline: what to do ("Add your first stock"). */
  title: ReactNode;
  /** One line: why. */
  body?: ReactNode;
  /** The buttons or links; one primary. */
  actions?: ReactNode;
  /** The headline's level (1 to 4). Default 2; 1 when the card is the whole page's content. */
  headingLevel?: 1 | 2 | 3 | 4;
  /** Becomes data-testid on the root. */
  testId?: string;
  /** Extra class names on the root. */
  className?: string;
}

/**
 * The empty page's prompt: eyebrow, large headline, why, actions.
 * @stability beta
 */
export function PromptCard({ eyebrow, title, body, actions, headingLevel = 2, testId, className }: PromptCardProps) {
  const Heading = `h${headingLevel}` as 'h2';
  return (
    <section className={`pu-prompt${className ? ` ${className}` : ''}`} data-testid={testId}>
      {eyebrow && <p className="pu-prompt-eyebrow">{eyebrow}</p>}
      <Heading className="pu-prompt-title">{title}</Heading>
      {body && <p className="pu-prompt-body">{body}</p>}
      {actions && <div className="pu-prompt-actions">{actions}</div>}
    </section>
  );
}

export interface OutlineTileProps {
  /** What will be here ("Your gain and loss"). */
  title: ReactNode;
  /** One line about it. */
  body?: ReactNode;
  /** SVG children in a 200 by 60 box (paths and circles, stroked in the outline colour). Decorative. */
  drawing?: ReactNode;
  /** Becomes data-testid on the root. */
  testId?: string;
  /** Extra class names on the root. */
  className?: string;
}

/**
 * A dashed outline of what will show once there is data. It holds no figures.
 * @stability beta
 */
export function OutlineTile({ title, body, drawing, testId, className }: OutlineTileProps) {
  return (
    <div className={`pu-outline-tile${className ? ` ${className}` : ''}`} data-testid={testId}>
      {drawing && (
        <svg className="pu-outline-tile-drawing" viewBox="0 0 200 60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          {drawing}
        </svg>
      )}
      <strong className="pu-outline-tile-title">{title}</strong>
      {body && <span className="pu-outline-tile-body">{body}</span>}
    </div>
  );
}
