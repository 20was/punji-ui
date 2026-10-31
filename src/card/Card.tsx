/**
 * Card (design.punji.app/components/card): one surface for one section of a
 * page, an optional header (title, a line, one action) and its content.
 * Rows inside a card are separated by hairlines, never by another card: a
 * card never holds a card (the walkthrough fails on one). `tone="inverse"`
 * is the one card on a page that stands out (a summary at the top of a
 * panel); never two on one screen.
 */
import type { ReactNode } from 'react';


export interface CardProps {
  children: ReactNode;
  /** The section's heading (an h2 unless `headingLevel` says otherwise). */
  title?: ReactNode;
  /** One line under the title: what the section shows, or as of when. */
  description?: ReactNode;
  /** Keep the description to one line, cut with an ellipsis (a long company name beside the header's actions); pass the full text as a string so it shows on hover. */
  clipDescription?: boolean;
  /** A quiet count or word beside the title ("Watchlist 9"). */
  meta?: ReactNode;
  /** One action on the header's right (a ghost Button or a link), or a StatusPill. */
  action?: ReactNode;
  /** A StatusDisc before the title. */
  icon?: ReactNode;
  /** A hairline under the header (a panel whose body starts with its own figures). */
  rule?: boolean;
  /** No inner padding: the content (a table, a row list) runs to the edges. */
  flush?: boolean;
  /** A small uppercase line over the title ("Selected sector"). */
  eyebrow?: ReactNode;
  /** 'lg': a 24px title, for a panel that names the one thing it shows. */
  size?: 'lg';
  headingLevel?: 2 | 3;
  /** Names the section for screen readers when there is no title. */
  label?: string;
  testId?: string;
  /** Docked at the card's foot under a hairline (one or two buttons): stays at the bottom however short the content. */
  footer?: ReactNode;
  /** Fill the grid cell's height (a Desk panel beside a longer list), so the footer sits at the bottom. */
  stretch?: boolean;
  /** 'inverse': the one card on a page that stands out (a summary), on the inverse surface; the kit pieces inside follow it. */
  tone?: 'inverse';
  /** Layout only (grid placement), never a restyle. */
  className?: string;
}

export function Card({ children, title, description, clipDescription, meta, action, icon, rule, flush, footer, stretch, tone, eyebrow, size, headingLevel = 2, label, testId, className }: CardProps) {
  const H = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <section className={`kit-card${flush ? ' flush' : ''}${stretch ? ' stretch' : ''}${footer ? ' has-foot' : ''}${tone === 'inverse' ? ' kit-inv' : ''}${size === 'lg' ? ' kit-card-lg' : ''}${className ? ` ${className}` : ''}`} aria-label={title ? undefined : label} data-testid={testId}>
      {(title || action) && (
        <header className={`kit-card-h${rule ? ' rule' : ''}${icon ? ' has-icon' : ''}`}>
          {icon}
          <div className="kit-card-t">
            {eyebrow && <p className="kit-card-eyebrow">{eyebrow}</p>}
            {title && (
              <H>
                {title}
                {meta !== undefined && meta !== null && <span className="kit-card-meta">{meta}</span>}
              </H>
            )}
            {description && (clipDescription ? <p className="clip" title={typeof description === 'string' ? description : undefined}>{description}</p> : <p>{description}</p>)}
          </div>
          {action}
        </header>
      )}
      {children}
      {footer && <footer className="kit-card-f">{footer}</footer>}
    </section>
  );
}
