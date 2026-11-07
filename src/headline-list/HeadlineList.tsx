/**
 * HeadlineList (design.punji.app/components/headline-list): a short list of headlines, newest first. Each row is the
 * headline, wrapping onto as many lines as it needs (never cut), and one quiet line under it (the source and when). A
 * headline with an address on another site is a link that opens in a new tab, with an arrow and `newTabLabel` said
 * after its words; one without is plain text. Rows are split by hairlines inside the card that holds them.
 */
import type { ReactNode } from 'react';

import { AppLink } from '../internal/link.tsx';

export interface Headline {
  /** A stable key for the row. */
  key: string;
  /** The headline. Wraps; never cut. */
  title: ReactNode;
  /** The source and the time ("Company filing · 2 days ago"). */
  line?: ReactNode;
  /** An http(s) address on another site; none (or any other address): the row opens nothing. */
  href?: string | null;
  /** Sets `data-testid` on the row's list item. */
  testId?: string;
}

export interface HeadlineListProps {
  /** The headlines, newest first. */
  items: readonly Headline[];
  /** Names the list for screen readers. */
  label: string;
  /** Said after a link's words, in the reader's language. Default "(opens in a new tab)". */
  newTabLabel?: string;
  /** Sets `data-testid` on the list. */
  testId?: string;
  /** Extra class names, layout only. */
  className?: string;
}

/**
 * @stability beta
 */
export function HeadlineList({ items, label, newTabLabel = '(opens in a new tab)', testId, className }: HeadlineListProps) {
  return (
    <ul className={`pu-headline-list${className ? ` ${className}` : ''}`} aria-label={label} data-testid={testId}>
      {items.map((h) => {
        const body = (
          <span className="pu-headline-list-main">
            <span className="pu-headline-list-title">{h.title}</span>
            {h.line && <span className="pu-headline-list-line">{h.line}</span>}
          </span>
        );
        return (
          <li key={h.key} data-testid={h.testId}>
            {h.href && /^https?:\/\//.test(h.href) ? (
              <AppLink external className="pu-headline-list-row" href={h.href} target="_blank">
                {body}
                <svg className="pu-headline-list-out" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <path d="M7 17L17 7M9 7h8v8" />
                </svg>
                <span className="kit-sr"> {newTabLabel}</span>
              </AppLink>
            ) : (
              <div className="pu-headline-list-row">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
