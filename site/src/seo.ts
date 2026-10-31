// Routes and per-page head data. Pure data and functions with no JSX, so the browser app, the prerender
// script and the SEO check all use the same answer. Paths here are relative to the deploy base
// (BASE_PATH), always with a leading and trailing slash: '/', '/components/button/'.
import { PAGES, pageBySlug, type PageDef } from './registry.ts';

export const SITE_NAME = 'Punji UI';
export const REPO = 'https://github.com/20was/punji-ui';
export const HOME_TITLE = 'Punji UI: finance-first React components';
export const HOME_DESCRIPTION =
  'Accessible, tree-shakeable React components for financial products: money, markets and accounting, themed with CSS variables, light and dark, Devanagari-ready.';
export const NOT_FOUND_TITLE = `Page not found — ${SITE_NAME}`;
export const NOT_FOUND_DESCRIPTION = 'This page does not exist in the Punji UI documentation. Go to the overview to find a component.';
export const THEME_COLOR = { light: '#e4e7de', dark: '#0d0e10' } as const;

export type Section = 'foundations' | 'components' | 'utilities';

export function sectionOf(page: PageDef): Section {
  if (page.kind === 'foundation') return 'foundations';
  if (page.kind === 'component') return 'components';
  return 'utilities';
}

export const pagePath = (page: PageDef): string => `/${sectionOf(page)}/${page.slug}/`;

export type Route = { kind: 'home' } | { kind: 'page'; page: PageDef } | { kind: 'notfound' };

/** Resolve a path relative to the base ('/components/button' with or without the trailing slash). */
export function parseRoute(relative: string): Route {
  const parts = relative.split(/[?#]/)[0]!.split('/').filter(Boolean);
  if (parts.length === 0) return { kind: 'home' };
  if (parts.length === 2) {
    const page = pageBySlug(parts[1]!);
    if (page && sectionOf(page) === parts[0]) return { kind: 'page', page };
  }
  return { kind: 'notfound' };
}

export const routePath = (route: Route): string => (route.kind === 'page' ? pagePath(route.page) : '/');

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
};
/** Old portal paths that map to the overview. */
export const PORTAL_TO_HOME: readonly string[] = ['/docs'];

const joinBase = (base: string, path: string) => `${base.replace(/\/+$/, '')}${path}`;

/** Normalise a base like 'punji-ui', '/punji-ui' or '/punji-ui/' to '/punji-ui/'; '' and '/' stay '/'. */
export function normaliseBase(base: string | undefined): string {
  const trimmed = (base ?? '/').trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

export interface HeadData {
  title: string;
  description: string;
  /** Absolute canonical URL. */
  canonical: string;
  /** Path under the base, for the sitemap and links. */
  path: string;
  robots: string;
  ogType: 'website' | 'article';
  ogImage: string;
  jsonLd: object[];
}

export function headFor(route: Route, siteUrl: string, base: string): HeadData {
  const origin = siteUrl.replace(/\/+$/, '');
  const url = (path: string) => `${origin}${joinBase(base, path)}`;
  const ogImage = `${origin}${joinBase(base, '/og.png')}`;

  if (route.kind === 'notfound') {
    return { title: NOT_FOUND_TITLE, description: NOT_FOUND_DESCRIPTION, canonical: url('/'), path: '/', robots: 'noindex', ogType: 'website', ogImage, jsonLd: [] };
  }
  if (route.kind === 'home') {
    return {
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      canonical: url('/'),
      path: '/',
      robots: 'index,follow',
      ogType: 'website',
      ogImage,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareSourceCode',
          name: SITE_NAME,
          description: HOME_DESCRIPTION,
          url: url('/'),
          codeRepositoryURL: REPO,
          programmingLanguage: 'TypeScript',
          runtimePlatform: 'React',
          license: 'https://opensource.org/licenses/MIT',
        },
      ],
    };
  }
  const { page } = route;
  const path = pagePath(page);
  const title = `${page.title} — ${SITE_NAME}`;
  return {
    title,
    description: page.description,
    canonical: url(path),
    path,
    robots: 'index,follow',
    ogType: 'article',
    ogImage,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: title,
        name: page.title,
        description: page.description,
        url: url(path),
        inLanguage: 'en',
        image: ogImage,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: url('/') },
        about: { '@type': 'SoftwareSourceCode', name: SITE_NAME, codeRepositoryURL: REPO },
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: SITE_NAME, item: url('/') },
            { '@type': 'ListItem', position: 2, name: page.title, item: url(path) },
          ],
        },
      },
    ],
  };
}
