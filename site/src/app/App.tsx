import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '@punji/ui/drawer';
import { headFor, pagePath, REPO, type Route } from '../seo.ts';
import { applyHead } from './head.ts';
import { BASE, Link, useRoute } from './router.tsx';
import { PageView } from './PageView.tsx';
import { Home } from './Home.tsx';
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

/** `path` is the pathname the HTML was rendered for; it keeps the server render and hydration identical. */
export function App({ path }: { path: string }) {
  const route: Route = useRoute(path);
  const current = route.kind === 'page' ? pagePath(route.page) : route.kind === 'home' ? '/' : '';
  const [menu, setMenu] = useState(false);
  const page = route.kind === 'page' ? route.page : undefined;
  const first = useRef(true);

  // Route change: set the head, scroll to the top and move focus to the new page's heading.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    applyHead(headFor(route, SITE_ORIGIN, BASE));
    window.scrollTo(0, 0);
    document.getElementById('page-title')?.focus({ preventScroll: true });
  }, [route]);

  const view = useMemo(() => (route.kind === 'notfound' ? <NotFound /> : page ? <PageView key={page.slug} page={page} /> : <Home />), [route, page]);

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
