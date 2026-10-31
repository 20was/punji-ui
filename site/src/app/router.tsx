import { useMemo, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { normaliseBase } from '../paths.ts';
import { loadRoute } from './load.ts';
import { parseClientRoute, type ClientRoute } from './nav.ts';

// Path routing with the History API. The deploy base (BASE_PATH) comes from Vite's `base`.
export const BASE = normaliseBase(import.meta.env.BASE_URL);

/** The location's path relative to the base ('/components/button/'), or '/__outside__/' when it is not under the base. */
export function relativePath(pathname: string): string {
  const withSlash = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (!withSlash.startsWith(BASE)) return '/__outside__/';
  return `/${withSlash.slice(BASE.length)}`;
}

/** An app path ('/components/button/') as a real URL path under the base. */
export const hrefFor = (path: string): string => `${BASE.replace(/\/$/, '')}${path}`;

const NAVIGATE = 'punji:navigate';

const subscribe = (notify: () => void) => {
  window.addEventListener('popstate', notify);
  window.addEventListener(NAVIGATE, notify);
  return () => {
    window.removeEventListener('popstate', notify);
    window.removeEventListener(NAVIGATE, notify);
  };
};

/** The current route. `initial` is the pathname the HTML was rendered for (server render and hydration). */
export function useRoute(initial: string): ClientRoute {
  const path = useSyncExternalStore(subscribe, () => window.location.pathname, () => initial);
  return useMemo(() => parseClientRoute(relativePath(path)), [path]);
}

let latest = 0;

/**
 * Go to an app path. The route's chunks load first and the URL changes once they are in, so the old page stays until
 * the new one can render whole. A click made while another page loads wins over it. If a chunk cannot be fetched
 * (offline, or a new deploy removed it), the browser loads the page itself.
 */
export async function navigate(path: string): Promise<void> {
  const ticket = ++latest;
  try {
    await loadRoute(parseClientRoute(path));
  } catch {
    window.location.assign(hrefFor(path));
    return;
  }
  if (ticket !== latest) return;
  window.history.pushState(null, '', hrefFor(path));
  window.dispatchEvent(new Event(NAVIGATE));
}

/** Old `#/slug` links: the slug ('' for the overview), or null when the URL has no legacy hash. */
export function legacyHashSlug(hash: string): string | null {
  const match = /^#\/([^?]*)/.exec(hash);
  return match ? match[1]!.replace(/\/+$/, '') : null;
}

export function Link({ to, onClick, children, ...rest }: { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || rest.target === '_blank') return;
    event.preventDefault();
    void navigate(to);
  };
  return (
    <a {...rest} href={hrefFor(to)} onClick={handle}>
      {children}
    </a>
  );
}
