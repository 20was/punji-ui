// Routes and per-page head data. Pure data and functions with no JSX, so the browser app, the prerender
// script and the SEO check all use the same answer. The registry-free half lives in paths.ts (the browser shell
// imports that one); this file adds the routes backed by the full page registry, for the build scripts.
import { PAGES, pageBySlug, type PageDef } from './registry.ts';
import { parseRouteWith, type Route } from './paths.ts';

export * from './paths.ts';

/** Resolve a path relative to the base ('/components/button' with or without the trailing slash). */
export const parseRoute = (relative: string): Route => parseRouteWith<PageDef>(relative, pageBySlug);

/** Every page route (home first). The 404 page is not a route; it is emitted separately. */
export const ROUTES: Route[] = [{ kind: 'home' }, ...PAGES.map((page): Route => ({ kind: 'page', page }))];

/**
 * design.punji.app is replaced by this site. Where the old portal had the same component under another
 * path, the old path redirects (301, `_redirects`) to the page that documents it here. Old path to slug.
 */
export const PORTAL_RENAMES: Readonly<Record<string, string>> = {
  '/foundations/colour': 'colour-tokens',
  '/utilities/formatting': 'formatters',
  '/components/meter': 'meter-range',
  '/components/bars': 'split-bars',
  '/components/empty-state': 'empty-skeleton',
  '/components/skeleton': 'empty-skeleton',
  '/components/checklist': 'check-list',
  '/components/check-row': 'check-list',
  '/components/distribution-bar': 'share-bars',
  '/components/summary-figure': 'metric-tile',
  '/components/fact-list': 'key-stats',
  '/components/panel-tabs': 'tabs',
  // Portal pages for the shell and the old pattern notes, now covered by a component page here.
  '/shell/title-row': 'page-layout',
  '/shell/loading': 'empty-skeleton',
  '/patterns/states': 'empty-skeleton',
  // App-specific portal pages of the Punji product whose home is now a Showcase pattern (built from package
  // exports, not exported themselves). See site/README.md, "Replacing the portal".
  '/components/app-strip': 'app-band',
  '/components/store-buttons': 'app-band',
  '/components/product-shot': 'app-band',
  '/components/site-header': 'app-header',
  '/shell/top-bar': 'app-header',
  '/components/market-mark': 'app-header',
  '/components/market-mark-detail': 'app-header',
  '/components/notification-bell': 'app-header',
  '/components/menu-panel': 'app-header',
  '/components/phone-menu': 'app-header',
  '/components/market-strip': 'market-board',
  '/components/market-report': 'market-board',
  '/components/breadth-bar': 'market-board',
  '/components/quote-list': 'market-board',
  '/components/quote-hero': 'stock-detail',
  '/components/symbol-block': 'stock-detail',
  '/components/security-title': 'stock-detail',
  '/components/candle-chart': 'stock-detail',
  '/patterns/charts': 'stock-detail',
  '/components/watchlist-row': 'watchlist-alerts',
  '/components/watch-summary': 'watchlist-alerts',
  '/components/alert-row': 'watchlist-alerts',
  '/components/alert-summary': 'watchlist-alerts',
  '/components/alert-panel': 'watchlist-alerts',
  '/utilities/alert-distance': 'watchlist-alerts',
  '/components/two-line-chart': 'portfolio-tracker',
  '/patterns/figures': 'portfolio-tracker',
  '/components/app-tab-bar': 'mobile-account-home',
  '/patterns/forms': 'payment-flow',
};
/** Old portal paths that map to the overview. */
export const PORTAL_TO_HOME: readonly string[] = ['/docs'];

