import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@punji/ui/financial';
import { Button } from '@punji/ui/button';
import { SegmentedControl } from '@punji/ui/controls';
import { Drawer } from '@punji/ui/drawer';
import { ListFilter } from '@punji/ui/list-filter';
import { useMediaQuery } from '@punji/ui/hooks';
import { GROUPS, PAGES, type PageDef } from '../registry.ts';
import { headFor, pagePath, type Route } from '../seo.ts';
import { applyHead } from './head.ts';
import { BASE, Link, useRoute } from './router.tsx';
import { PageView } from './PageView.tsx';
import { useTheme, type ThemeChoice } from './theme.ts';

const REPO = 'https://github.com/20was/punji-ui';
const ROADMAP = `${REPO}/blob/main/ROADMAP.md`;

function matches(page: PageDef, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [page.title, page.slug, ...page.api.map((a) => a.name)].join(' ').toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

function Sidebar({ current, query, onQuery, onNavigate }: { current: string; query: string; onQuery: (q: string) => void; onNavigate: () => void }) {
  const groups = GROUPS.map((group) => ({ group, pages: PAGES.filter((p) => p.group === group.id && matches(p, query)) }));
  const shown = groups.filter(({ pages }) => pages.length > 0 || !query.trim());
  return (
    <div className="doc-sidebar">
      <ListFilter value={query} onChange={onQuery} label="Search the documentation" clear="Clear search" testId="search" placeholder="Search components" size="md" />
      <ul className="doc-nav" aria-label="Pages by domain">
        <li>
          <Link to="/" aria-current={current === '/' ? 'page' : undefined} onClick={onNavigate}>
            Overview
          </Link>
        </li>
        {shown.map(({ group, pages }) => (
          <li key={group.id} className="doc-nav-group">
            <p className="doc-nav-title">{group.title}</p>
            {pages.length > 0 ? (
              <ul>
                {pages.map((page) => (
                  <li key={page.slug}>
                    <Link to={pagePath(page)} aria-current={pagePath(page) === current ? 'page' : undefined} onClick={onNavigate}>
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="doc-muted">No pages yet.</p>
            )}
            {!query.trim() && group.planned.length > 0 && (
              <p className="doc-planned">
                <a href={ROADMAP} target="_blank" rel="noopener noreferrer" title={`Not documented yet: ${group.planned.join(', ')}`}>
                  {group.planned.length} planned<span className="kit-sr"> in {group.title} (opens ROADMAP.md in a new tab)</span>
                </a>
              </p>
            )}
          </li>
        ))}
        {query.trim() && shown.length === 0 && <li className="doc-muted">Nothing matches "{query}".</li>}
      </ul>
    </div>
  );
}

function Home() {
  return (
    <article className="doc-page" data-testid="page-home">
      <header>
        <p className="doc-eyebrow">@punji/ui</p>
        <h1 tabIndex={-1} id="page-title">Punji UI documentation</h1>
        <p className="doc-lead">
          Accessible, tree-shakeable React components for financial products, themed with CSS variables, in light and dark, with Devanagari-ready type. These pages import the built package through its export map, exactly as a consumer would, so every example proves the published API.
        </p>
      </header>
      <section aria-labelledby="start" className="doc-section">
        <h2 id="start">Pages</h2>
        <p className="doc-muted">{PAGES.length} pages so far. Components that exist but are not documented yet are counted as planned in the sidebar.</p>
        <div className="doc-cards">
          {GROUPS.filter((g) => PAGES.some((p) => p.group === g.id)).map((group) => (
            <section key={group.id} className="doc-card" aria-labelledby={`home-${group.id}`}>
              <h3 id={`home-${group.id}`}>{group.title}</h3>
              <ul>
                {PAGES.filter((p) => p.group === group.id).map((p) => (
                  <li key={p.slug}>
                    <Link to={pagePath(p)}>{p.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
      <section aria-labelledby="status" className="doc-section">
        <h2 id="status">Status</h2>
        <ul>
          <li>The package is not published yet; see RELEASE.md in the repository.</li>
          <li>
            The legacy full portal still lives in punji-web; this site is the self-contained replacement and grows page by page (<a href={ROADMAP} target="_blank" rel="noopener noreferrer">ROADMAP.md</a>).
          </li>
        </ul>
      </section>
    </article>
  );
}

function NotFound() {
  return (
    <article className="doc-page" data-testid="page-not-found">
      <header>
        <p className="doc-eyebrow">404</p>
        <h1 tabIndex={-1} id="page-title">Page not found</h1>
        <p className="doc-lead">There is no page at this address. It may have moved, or the link may be mistyped.</p>
      </header>
      <section aria-labelledby="nf-go" className="doc-section">
        <h2 id="nf-go">Where to go</h2>
        <ul>
          <li>
            <Link to="/">The documentation overview</Link>, with every page listed by domain
          </li>
          <li>
            <Link to="/components/button/">Button</Link>, <Link to="/components/money-display/">MoneyDisplay</Link> and <Link to="/components/data-table/">DataTable</Link>, the most used pages
          </li>
        </ul>
      </section>
    </article>
  );
}

function ThemeSwitch() {
  const [theme, setTheme] = useTheme();
  return (
    <SegmentedControl<ThemeChoice>
      label="Theme"
      prefix="theme"
      size="sm"
      value={theme}
      onChange={setTheme}
      options={[
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'system', label: 'Auto' },
      ]}
    />
  );
}

/** `path` is the pathname the HTML was rendered for; it keeps the server render and hydration identical. */
export function App({ path }: { path: string }) {
  const route: Route = useRoute(path);
  const current = route.kind === 'page' ? pagePath(route.page) : route.kind === 'home' ? '/' : '';
  const wide = useMediaQuery('(min-width: 900px)', true);
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const page = route.kind === 'page' ? route.page : undefined;
  const first = useRef(true);

  // Route change: set the title, scroll to the top and move focus to the new page's heading.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    applyHead(headFor(route, SITE_ORIGIN, BASE));
    window.scrollTo(0, 0);
    document.getElementById('page-title')?.focus({ preventScroll: true });
  }, [route]);

  const view = useMemo(() => (route.kind === 'notfound' ? <NotFound /> : page ? <PageView page={page} /> : <Home />), [route, page]);
  const sidebar = <Sidebar current={current} query={query} onQuery={setQuery} onNavigate={() => setMenu(false)} />;

  return (
    <AppShell
      brand={
        <Link className="doc-brand" to="/">
          Punji UI <span className="doc-brand-sub">documentation</span>
        </Link>
      }
      actions={<ThemeSwitch />}
      navigationLabel="Documentation"
      navigation={
        wide ? (
          sidebar
        ) : (
          <>
            <Button variant="secondary" size="md" onClick={() => setMenu(true)} testId="menu" aria-haspopup="dialog">
              Browse pages
            </Button>
            <Drawer open={menu && !wide} label="Documentation pages" onClose={() => setMenu(false)}>
              <div className="doc-drawer">
                <div className="doc-drawer-bar">
                  <strong>Pages</strong>
                  <Button variant="ghost" size="sm" onClick={() => setMenu(false)}>
                    Close
                  </Button>
                </div>
                {sidebar}
              </div>
            </Drawer>
          </>
        )
      }
      footer={
        <span>
          Synthetic sample data, not market data. <a href={REPO} target="_blank" rel="noopener noreferrer">Source<span className="kit-sr"> (opens in a new tab)</span></a>
        </span>
      }
    >
      {view}
    </AppShell>
  );
}
