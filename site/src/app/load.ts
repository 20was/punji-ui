import type { ComponentType } from 'react';
import type { PageDef } from '../registry.ts';
import type { ApiEntry } from './api.ts';
import type { ClientRoute, PageCard } from './nav.ts';

// Per-route loading. The shell (header, sidebar, router) is the only code every page downloads; a route's view
// (Home or PageView) and its route module (generated/routes/<slug>.ts: page data, examples, their source text) are
// separate chunks, fetched before the route renders:
//  - first load: the prerendered HTML preloads the route's chunks (<link rel="modulepreload">) and main.tsx awaits
//    loadRoute() before hydrateRoot, so the first client render matches the HTML exactly;
//  - navigation: navigate() awaits loadRoute() before changing the URL, so a page never renders half-loaded;
//  - prerender: entry-server's preload() awaits the same function, then renders synchronously from the cache.
// After loading, every getter below is synchronous.

export interface PageData {
  page: PageDef & { lead: string };
  /** The page's API entries by export name (from generated/api.json). */
  api: Record<string, ApiEntry>;
  /** The related pages as cards, in registry order. */
  related: PageCard[];
  /** Showcase screens whose "Built from" lists this page. */
  usedIn: PageCard[];
  /** When the page's own sources last changed (YYYY-MM-DD), for the JSON-LD dateModified. */
  modified?: string;
}

export interface LoadedExample {
  Component: ComponentType;
  /** The file's text: one source for the preview and the code shown and copied, so they cannot drift. */
  source: string;
  /** A showcase screen's layout CSS (site/src/examples/<slug>/<id>.css), shown beside the TSX. */
  css?: string;
}

/** What scripts/site-pages.mjs writes to generated/routes/<slug>.ts. */
export interface RouteModule {
  data: PageData;
  examples: Record<string, LoadedExample>;
  /** Guide code files' text by file name (site/src/guides/<slug>/<file>.tsx). Shown, never executed. */
  guides: Record<string, string>;
}

const routeModules = import.meta.glob<RouteModule>('../generated/routes/*.ts', { import: 'default' });
const views = {
  './Home.tsx': () => import('./Home.tsx').then((m) => m.Home),
  './PageView.tsx': () => import('./PageView.tsx').then((m) => m.PageView),
};

const values = new Map<string, unknown>();
const pending = new Map<string, Promise<unknown>>();

/** Load one module into the cache (once). */
function fetchInto(key: string, loader: () => Promise<unknown>): Promise<unknown> {
  if (values.has(key)) return Promise.resolve(values.get(key));
  let promise = pending.get(key);
  if (!promise) {
    promise = loader().then(
      (value) => {
        values.set(key, value);
        pending.delete(key);
        return value;
      },
      (error: unknown) => {
        pending.delete(key);
        throw error;
      },
    );
    pending.set(key, promise);
  }
  return promise;
}

const routeKey = (slug: string) => `../generated/routes/${slug}.ts`;

/**
 * Load everything a route renders. Resolves with the modules it needed as paths under site/ ('src/app/PageView.tsx',
 * 'src/generated/routes/button.ts'), which the prerender maps to chunk files through Vite's manifest.
 */
export async function loadRoute(route: ClientRoute): Promise<string[]> {
  const jobs: [string, () => Promise<unknown>][] = [];
  if (route.kind === 'home') jobs.push(['./Home.tsx', views['./Home.tsx']]);
  if (route.kind === 'page') {
    const loader = routeModules[routeKey(route.page.slug)];
    if (!loader) throw new Error(`No route module for ${route.page.slug}. Run npm run site:gen.`);
    jobs.push([routeKey(route.page.slug), loader], ['./PageView.tsx', views['./PageView.tsx']]);
  }
  await Promise.all(jobs.map(([key, loader]) => fetchInto(key, loader)));
  return jobs.map(([key]) => (key.startsWith('../') ? `src/${key.slice(3)}` : `src/app/${key.slice(2)}`));
}

/** Whether a route can render now, without waiting. */
export function routeReady(route: ClientRoute): boolean {
  if (route.kind === 'home') return values.has('./Home.tsx');
  if (route.kind === 'page') return values.has(routeKey(route.page.slug)) && values.has('./PageView.tsx');
  return true;
}

const routeOf = (slug: string) => values.get(routeKey(slug)) as RouteModule | undefined;

export const homeView = () => values.get('./Home.tsx') as ComponentType;
export const pageView = () => values.get('./PageView.tsx') as ComponentType<{ data: PageData }>;
export const pageData = (slug: string): PageData | undefined => routeOf(slug)?.data;
export const loadedExample = (slug: string, id: string): LoadedExample | undefined => routeOf(slug)?.examples[id];
/** The text of an example's CSS file (site/src/examples/<slug>/<id>.css), if it has one. */
export const exampleCss = (slug: string, id: string): string | undefined => routeOf(slug)?.examples[id]?.css;
/** The text of a guide's code file (site/src/guides/<slug>/<file>.tsx). */
export const guideSource = (slug: string, file: string): string | undefined => routeOf(slug)?.guides[file];
