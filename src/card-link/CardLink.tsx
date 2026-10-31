/**
 * CardLink (design.punji.app/components/card-link): the one text link of a
 * card's or a panel's header ("Open portfolio", "All alerts", "Markets"), in
 * the link colour so it never reads as a button or as plain bold text.
 *
 *   in the app      `linkComponent` (your router's link) or a plain <a>,
 *                   same tab, with a chevron
 *   another site    an absolute http(s) URL: a new tab with
 *                   rel="noopener noreferrer", an arrow icon, and
 *                   `newTabLabel` said after the words
 *
 * Which one is decided by `href` alone (an http(s) address is another site),
 * unless `external` says so for a link whose address the caller already knows
 * the side of. Never pick the icon by hand.
 */
import type { ReactNode } from 'react';
import type { LinkComponent } from '../internal/link.tsx';

import { ChevronRight } from '../layout/Layout.tsx';

/** The arrow of a link that leaves for another site in a new tab (decorative: the words say it). */
export function ExternalIcon() {
  return (
    <svg className="kit-ext" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}

export interface CardLinkProps {
  /** A path in the app (same tab, chevron) or an http(s) address (new tab, arrow). */
  href: string;
  /** The words: where it goes ("Open portfolio", "Markets"). */
  children: ReactNode;
  /** Override what `href` says: true for another site, false for the app. */
  external?: boolean;
  /** The link element for an in-app `href` (wrap your router's link). Default: a plain <a>. */
  linkComponent?: LinkComponent;
  /** Said after the words of an outgoing link, in the reader's language. Default: "(opens in a new tab)". */
  newTabLabel?: string;
  /** A fuller name when the words alone are vague ("Stock page: NABIL"); the new-tab words are added to an outgoing one. */
  ariaLabel?: string;
  testId?: string;
  /** Layout only (margin, grid placement), never a restyle. */
  className?: string;
}

export function CardLink({ href, children, external, linkComponent, newTabLabel = '(opens in a new tab)', ariaLabel, testId, className }: CardLinkProps) {
  const out = external ?? /^https?:/.test(href);
  const cls = `kit-cardlink${out ? ' out' : ''}${className ? ` ${className}` : ''}`;
  if (out)
    return (
      <a className={cls} href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel ? `${ariaLabel} ${newTabLabel}` : undefined} data-testid={testId} data-link="out">
        {children}
        <ExternalIcon />
        {!ariaLabel && <span className="kit-sr"> {newTabLabel}</span>}
      </a>
    );
  const L = linkComponent ?? 'a';
  return (
    <L className={cls} href={href} aria-label={ariaLabel} data-testid={testId} data-link="in">
      {children}
      <ChevronRight />
    </L>
  );
}
