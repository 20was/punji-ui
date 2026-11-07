'use client';

/**
 * RouteAnnouncer (design.punji.app/components/route-announcer): makes a client-side navigation perceivable. A router
 * changes the URL and swaps the DOM; the browser announces nothing and focus stays on a link that no longer exists
 * (WCAG 4.1.3, 2.4.3). This writes the new page title into a polite live region.
 *
 * It does not import a router. Two ways to tell it a route changed:
 *
 *   `routeKey`  pass the pathname (or any value that changes per route). The title is announced and focus moves to
 *               the element with `focusId` (default `main`), so the next Tab starts in the new content.
 *   no props    it watches `document.title` and announces each change. It announces only; focus is not moved, since
 *               a title can change without a navigation ("(3) Inbox").
 *
 * The first render is skipped (the browser announced the page it loaded). The title is read after `delay` ms because
 * the new route's `<title>` lands only once its component has committed.
 */
import { useEffect, useRef, useState } from 'react';

export interface RouteAnnouncerProps {
  /** A value that changes on every navigation, usually the pathname. With it, a change announces the title and moves focus. Without it, the title itself is watched. */
  routeKey?: string;
  /** The id of the element that takes focus after a navigation (give it `tabIndex={-1}`; one without is given it). Used with `routeKey`. Default 'main'. */
  focusId?: string;
  /** Wait this long (ms) for the new title to land before reading it. Default 120. */
  delay?: number;
  /** Becomes data-testid on the live region. */
  testId?: string;
}

/**
 * @stability beta
 */
export function RouteAnnouncer({ routeKey, focusId = 'main', delay = 120, testId }: RouteAnnouncerProps) {
  const [message, setMessage] = useState('');
  const seen = useRef<string | undefined>(routeKey);

  // Pathname mode: announce and move focus on every change after the first.
  useEffect(() => {
    if (routeKey === undefined) return;
    // Unchanged since the last run (the first render, or React re-running the effect in development): nothing to announce.
    if (seen.current === routeKey) return;
    seen.current = routeKey;
    const target = document.getElementById(focusId);
    if (target) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    const timer = window.setTimeout(() => setMessage(document.title || routeKey), delay);
    return () => window.clearTimeout(timer);
  }, [routeKey, focusId, delay]);

  // Title mode: announce when the document title changes.
  useEffect(() => {
    if (routeKey !== undefined || typeof MutationObserver === 'undefined') return;
    let last = document.title;
    let timer: number | undefined;
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (document.title === last) return;
        last = document.title;
        setMessage(last);
      }, delay);
    });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [routeKey, delay]);

  return (
    <div className="pu-route-announcer" aria-live="polite" aria-atomic="true" data-testid={testId}>
      {message}
    </div>
  );
}
