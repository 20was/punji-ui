/**
 * PageLayout + PageHeader: the page ground (ambient light in dark) and the
 * header every page uses, as the Punji app's PageLayout and PageHeader:
 * a back circle on the left, a large title, a
 * meta line under it (what is on the page), up to three actions on the right.
 */
import type { ReactNode } from 'react';
import type { LinkComponent } from '../internal/link.tsx';


export interface PageLayoutProps {
  /** The page: a PageHeader and its sections. Rendered inside the page's one <main>. */
  children: ReactNode;
  /** Navigation drawn before <main> (a tab bar, a side nav). */
  nav?: ReactNode;
}

export function PageLayout({ children, nav }: PageLayoutProps) {
  return (
    <div className="kit-page">
      {nav}
      <main id="main" className="kit-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

interface HeaderProps {
  /** The page's title: the one h1. */
  title: ReactNode;
  /** Where back goes; omit on a root page (no back circle). */
  backTo?: string;
  /** The link element for `backTo` (wrap your router's link). Default: a plain <a>. */
  linkComponent?: LinkComponent;
  /** The back link's accessible name. Default "Back". */
  backLabel?: string;
  /** A line under the title saying what is on the page. */
  meta?: ReactNode;
  /** Up to three actions on the right (Buttons or links). */
  actions?: ReactNode;
  /** A small label over the title: the page's group ("Research"). */
  eyebrow?: ReactNode;
  /** A tool page's header: a smaller title, so the tool is in the first screen. */
  compact?: boolean;
  /** Beside the title: what the page's figures are as of (a StatusPill: "After the 19 Oct close"). */
  stamp?: ReactNode;
  /** Becomes data-testid on the header. */
  testId?: string;
}

export function PageHeader({ title, backTo, linkComponent, backLabel = 'Back', meta, actions, eyebrow, compact, stamp, testId }: HeaderProps) {
  const L = linkComponent ?? 'a';
  return (
    <header className={`kit-header${backTo ? '' : ' no-back'}${compact ? ' compact' : ''}${eyebrow ? ' has-eyebrow' : ''}`} data-testid={testId}>
      {eyebrow && <p className="kit-header-k">{eyebrow}</p>}
      {backTo && (
        <L className="kit-circle kit-back" href={backTo} aria-label={backLabel} data-testid="back-button">
          <ChevronLeft />
        </L>
      )}
      {stamp ? (
        <div className="kit-header-title">
          <h1>{title}</h1>
          {stamp}
        </div>
      ) : (
        <h1>{title}</h1>
      )}
      {actions && <div className="kit-header-actions">{actions}</div>}
      {meta && <div className="kit-header-meta">{meta}</div>}
    </header>
  );
}

/** Section title + one action, as the app's ListSectionHeader. */
export interface ListSectionHeaderProps {
  /** The section's title (an h2, or an h3 with level 3). */
  title: ReactNode;
  /** A quiet line at the end ("12 stocks"). Ignored when there is an `action`. */
  detail?: ReactNode;
  /** One action at the end (a ghost Button or a link). Replaces `detail`. */
  action?: ReactNode;
  /** The heading's id, for aria-labelledby on the section it names. */
  id?: string;
  /** A small capitalised caption over a group of rows inside a card. */
  caption?: boolean;
  /** sm: a quiet sub-heading inside a card ("Family you track"). */
  size?: 'sm';
  /** The heading level: 2 (default) or 3 inside a card. */
  level?: 2 | 3;
}

export function ListSectionHeader({ title, detail, action, id, caption, size, level = 2 }: ListSectionHeaderProps) {
  const H = level === 3 ? 'h3' : 'h2';
  return (
    <div className={`kit-section-h${caption ? ' caption' : ''}${size === 'sm' ? ' sm' : ''}`}>
      <H id={id}>{title}</H>
      {action ?? (detail && <span className="detail">{detail}</span>)}
    </div>
  );
}

export function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function ChevronRight() {
  return (
    <svg className="kit-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
