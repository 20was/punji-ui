/**
 * CardSection and CardSectionRow (design.punji.app/components/card-section): the sections of a `flush` Card. Each has
 * its own padding and a hairline above it when a section comes before: an optional heading (with a muted note after
 * it) and one thing on the heading's right (a legend, a SegmentedControl). A table inside runs on the card's surface,
 * without a box of its own. `CardSectionRow` sets two sections side by side.
 */
import type { CSSProperties, ReactNode } from 'react';

export interface CardSectionProps {
  /** The section's content. */
  children: ReactNode;
  /** The section's heading (an h2 unless `headingLevel` says otherwise). */
  title?: ReactNode;
  /** Muted words after the title ("stacked, % of paid-up"). */
  note?: ReactNode;
  /** One thing on the heading's right: a legend, a SegmentedControl. */
  aside?: ReactNode;
  /** The heading's id; with it the section is named by its heading. */
  titleId?: string;
  /** The title's heading level: 2 (default) or 3, to fit the page outline. */
  headingLevel?: 2 | 3;
  /** Fine print at the card's foot (sources, "Nothing here is advice"): muted, small, no hairline above. */
  foot?: boolean;
  /** Becomes data-testid on the section. */
  testId?: string;
  /** Layout only (margin, grid placement), never a restyle. */
  className?: string;
}

/**
 * @stability beta
 */
export function CardSection({ children, title, note, aside, titleId, headingLevel = 2, foot, testId, className }: CardSectionProps) {
  const H = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <section className={`pu-card-sec${foot ? ' foot' : ''}${className ? ` ${className}` : ''}`} aria-labelledby={title && titleId ? titleId : undefined} data-testid={testId}>
      {(title || aside) && (
        <header className="pu-card-sec-h">
          {title && (
            <H id={titleId}>
              {title}
              {note && <span>{note}</span>}
            </H>
          )}
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

export interface CardSectionRowProps {
  /** Two `CardSection`s. */
  children: ReactNode;
  /** The two columns' shares of the width (default even), once the row is wide enough for both. */
  weights?: readonly [number, number];
  /** Becomes data-testid on the row. */
  testId?: string;
  /** Layout only (margin), never a restyle. */
  className?: string;
}

/**
 * Two sections side by side (a figure beside its chart; bought beside sold), split by a vertical hairline once the
 * row has 880px of its own width, one over the other (a hairline between) under it.
 * @stability beta
 */
export function CardSectionRow({ children, weights = [1, 1], testId, className }: CardSectionRowProps) {
  return (
    <div className={`pu-card-row${className ? ` ${className}` : ''}`} data-testid={testId}>
      <div className="pu-card-row-i" style={{ '--card-row-cols': `minmax(0, ${weights[0]}fr) minmax(0, ${weights[1]}fr)` } as CSSProperties}>
        {children}
      </div>
    </div>
  );
}
