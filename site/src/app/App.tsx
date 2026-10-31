import { createElement, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Drawer } from '@punji/ui/drawer';
import { headFor, pagePath, REPO } from '../paths.ts';
import { applyHead } from './head.ts';
import { homeView, loadRoute, pageData, pageView, routeReady } from './load.ts';
import type { ClientRoute } from './nav.ts';
import { BASE, Link, useRoute } from './router.tsx';
import { NotFound } from './NotFound.tsx';
import { Sidebar } from './Sidebar.tsx';
import { Search } from './Search.tsx';
import { useTheme, type ThemeChoice } from './theme.ts';
import { CloseIcon, ExternalIcon, GitHubIcon, MenuIcon, MonitorIcon, MoonIcon, SunIcon, Wordmark } from './icons.tsx';

const THEMES: { value: ThemeChoice; label: string; Icon: () => React.JSX.Element }[] = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'System', Icon: MonitorIcon },
];

/** Light, dark or the system setting as three icon buttons (a toggle group); the choice persists. */
function ThemeSwitch() {
  const [theme, setTheme] = useTheme();
  return (
    <div className="doc-theme" role="group" aria-label="Theme">
      {THEMES.map(({ value, label, Icon }) => (
        <button key={value} type="button" aria-pressed={theme === value} aria-label={label} title={`${label} theme`} onClick={() => setTheme(value)} data-testid={`theme-${value}`}>
          <Icon />
        </button>
      ))}
    </div>
  );
}

function Brand() {
  return (
    <Link className="doc-brand" to="/" aria-label="Punji UI home">
      <Wordmark height={20} />
      <span className="doc-brand-ui" aria-hidden="true">
        UI
      </span>
    </Link>
  );
}

function Footer() {
  return (
    <footer className="doc-footer">
      <div className="doc-footer-brand">
        <Wordmark height={16} />
        <span>Finance-first React components. MIT licensed.</span>
      </div>
      <ul className="doc-footer-links" aria-label="Project">
        {[
          ['GitHub', REPO],
          ['Roadmap', `${REPO}/blob/main/ROADMAP.md`],
          ['Licence', `${REPO}/blob/main/LICENSE`],
          ['Security', `${REPO}/blob/main/SECURITY.md`],
        ].map(([label, href]) => (
          <li key={label}>
            <a href={href} target="_blank" rel="noopener noreferrer">
              {label}
              <ExternalIcon />
              <span className="kit-sr"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="doc-footer-note">Prices, companies and accounts on this site are synthetic sample data, not market data.</p>
    </footer>
  );
}

/** The route's head: a page's description comes with its page data, which is loaded before the route shows. */
function headOf(route: ClientRoute) {
  if (route.kind !== 'page') return headFor(route, SITE_ORIGIN, BASE);
  const data = pageData(route.page.slug);
  return headFor(data ? { kind: 'page', page: data.page } : { kind: 'notfound' }, SITE_ORIGIN, BASE);
}

/** `path` is the pathname the HTML was rendered for; it keeps the server render and hydration identical. */
export function App({ path }: { path: string }) {
  const location = useRoute(path);
  // The route on screen. Links load a route before changing the URL, so it is normally ready at once; Back and Forward
  // to a page not yet loaded keep the current page until its chunks arrive (or reload it if they cannot be fetched).
  const [, loaded] = useReducer((n: number) => n + 1, 0);
  const [shown, setShown] = useState(location);
  const ready = routeReady(location);
  if (ready && shown !== location) setShown(location);
  useEffect(() => {
    if (ready) return;
    let live = true;
    loadRoute(location).then(
      () => live && loaded(),
      () => window.location.reload(),
    );
    return () => {
      live = false;
    };
  }, [location, ready]);
  const route = ready ? location : shown;
  const current = route.kind === 'page' ? pagePath(route.page) : route.kind === 'home' ? '/' : '';
  const [menu, setMenu] = useState(false);
  const first = useRef(true);

  // Route change: set the head, scroll to the top and move focus to the new page's heading.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    applyHead(headOf(route));
    window.scrollTo(0, 0);
    document.getElementById('page-title')?.focus({ preventScroll: true });
  }, [route]);

  const view = useMemo(() => {
    if (route.kind === 'notfound') return <NotFound />;
    // The views are module-level components from their own chunks (load.ts), looked up once they are loaded.
    if (route.kind === 'home') return createElement(homeView());
    return createElement(pageView(), { key: route.page.slug, data: pageData(route.page.slug)! });
  }, [route]);

  return (
    <div className={`doc-app${route.kind === 'home' ? ' is-home' : ''}`}>
      <a className="doc-skip" href="#main">
        Skip to content
      </a>
      <header className="doc-header">
        <div className="doc-header-in">
          <button type="button" className="doc-icon-btn doc-menu-btn" onClick={() => setMenu(true)} aria-haspopup="dialog" aria-label="Open the page menu" data-testid="menu">
            <MenuIcon />
          </button>
          <Brand />
          <span className="doc-version" title="Not published to npm yet">
            {PKG_VERSION} <span>pre-release</span>
          </span>
          <Search />
          <div className="doc-header-end">
            <a className="doc-github" href={REPO} target="_blank" rel="noopener noreferrer">
              <GitHubIcon />
              <span className="doc-github-text">GitHub</span>
              <span className="kit-sr"> (opens in a new tab)</span>
            </a>
            <ThemeSwitch />
          </div>
        </div>
      </header>
      <div className="doc-body">
        <aside className="doc-aside">
          <Sidebar current={current} />
        </aside>
        <main id="main" className="doc-main" tabIndex={-1}>
          {view}
          <Footer />
        </main>
      </div>
      <Drawer open={menu} label="Documentation pages" onClose={() => setMenu(false)}>
        <div className="doc-drawer">
          <div className="doc-drawer-bar">
            <Brand />
            <button type="button" className="doc-icon-btn" onClick={() => setMenu(false)} aria-label="Close the page menu">
              <CloseIcon />
            </button>
          </div>
          <Sidebar current={current} onNavigate={() => setMenu(false)} idPrefix="drawer" />
          <a className="doc-drawer-github" href={REPO} target="_blank" rel="noopener noreferrer">
            <GitHubIcon /> GitHub<span className="kit-sr"> (opens in a new tab)</span>
          </a>
        </div>
      </Drawer>
    </div>
  );
}
