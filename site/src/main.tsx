import { createRoot, hydrateRoot } from 'react-dom/client';
// oxlint-disable-next-line import/no-unassigned-import -- the library's CSS distribution is a public API
import '@punji/ui/styles.css';
// oxlint-disable-next-line import/no-unassigned-import -- site styles
import './styles.css';
import { App } from './app/App.tsx';
import { applyHead } from './app/head.ts';
import { loadRoute, pageData } from './app/load.ts';
import { groupTitleOf, navBySlug, parseClientRoute } from './app/nav.ts';
import { BASE, hrefFor, legacyHashSlug, relativePath } from './app/router.tsx';
import { headFor, pagePath } from './paths.ts';

// Old `#/slug` links: move to the real path before anything renders.
let redirected = false;
const legacy = legacyHashSlug(window.location.hash);
if (legacy !== null) {
  const page = navBySlug(legacy.split('/').pop() ?? '');
  const path = page ? pagePath(page) : '/';
  window.history.replaceState(null, '', hrefFor(path));
  await loadRoute(parseClientRoute(path));
  const data = page && pageData(page.slug);
  applyHead(data ? headFor({ kind: 'page', page: data.page }, SITE_ORIGIN, BASE, { groupTitle: groupTitleOf(data.page.group), modified: data.modified }) : headFor({ kind: 'home' }, SITE_ORIGIN, BASE));
  redirected = true;
}

// The route's chunks (view, page data, examples) must be in before the first render, so hydration renders exactly
// the prerendered HTML. The HTML preloads them (modulepreload), so this normally waits for nothing new.
await loadRoute(parseClientRoute(relativePath(window.location.pathname)));

const root = document.getElementById('root')!;
const app = <App path={window.location.pathname} />;
// The HTML was prerendered for this exact path unless we just redirected away from a hash URL; then render fresh.
if (root.firstElementChild && !redirected) hydrateRoot(root, app);
else createRoot(root).render(app);
