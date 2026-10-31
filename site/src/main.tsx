import { createRoot, hydrateRoot } from 'react-dom/client';
// oxlint-disable-next-line import/no-unassigned-import -- the library's CSS distribution is a public API
import '@punji/ui/styles.css';
// oxlint-disable-next-line import/no-unassigned-import -- site styles
import './styles.css';
import { App } from './app/App.tsx';
import { applyHead } from './app/head.ts';
import { BASE, hrefFor, legacyHashSlug } from './app/router.tsx';
import { pageBySlug } from './registry.ts';
import { headFor, pagePath, parseRoute } from './seo.ts';

// Old `#/slug` links: move to the real path before anything renders.
let redirected = false;
const legacy = legacyHashSlug(window.location.hash);
if (legacy !== null) {
  const page = pageBySlug(legacy.split('/').pop() ?? '');
  const path = page ? pagePath(page) : '/';
  window.history.replaceState(null, '', hrefFor(path));
  applyHead(headFor(parseRoute(path), SITE_ORIGIN, BASE));
  redirected = true;
}

const root = document.getElementById('root')!;
const app = <App path={window.location.pathname} />;
// The HTML was prerendered for this exact path unless we just redirected away from a hash URL; then render fresh.
if (root.firstElementChild && !redirected) hydrateRoot(root, app);
else createRoot(root).render(app);
