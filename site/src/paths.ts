// Paths, routes and per-page head data that need no page registry: the browser shell imports this file, so it must
// stay free of registry.ts (which holds every page's text). seo.ts adds the registry-backed routes for the build
// scripts. Paths are relative to the deploy base (BASE_PATH), with a leading and trailing slash: '/', '/components/button/'.
import type { PageDef } from './registry.ts';

/** The fields a route needs: enough to build a path. The registry's PageDef and the browser's slim nav entry both fit. */
export type PageRef = Pick<PageDef, 'slug' | 'kind'>;

export const SITE_NAME = 'Punji UI';
export const REPO = 'https://github.com/20was/punji-ui';
export const HOME_TITLE = 'Punji UI: finance-first React components';
export const HOME_DESCRIPTION =
  'Accessible, tree-shakeable React components for financial products: money, markets and accounting, themed with CSS variables, light and dark, Devanagari-ready.';
export const NOT_FOUND_TITLE = `Page not found — ${SITE_NAME}`;
export const NOT_FOUND_DESCRIPTION = 'This page does not exist in the Punji UI documentation. Go to the overview to find a component.';
export const THEME_COLOR = { light: '#e4e7de', dark: '#0d0e10' } as const;

export type Section = 'get-started' | 'apps' | 'foundations' | 'components' | 'utilities' | 'showcase';

export function sectionOf(page: PageRef): Section {
  if (page.kind === 'guide') return 'get-started';
  if (page.kind === 'showcase') return 'showcase';
  if (page.kind === 'app') return 'apps';
  if (page.kind === 'foundation') return 'foundations';
  if (page.kind === 'component') return 'components';
  return 'utilities';
}

export const pagePath = (page: PageRef): string => `/${sectionOf(page)}/${page.slug}/`;

export type Route<P extends PageRef = PageDef> = { kind: 'home' } | { kind: 'page'; page: P } | { kind: 'notfound' };

/** Resolve a path relative to the base ('/components/button' with or without the trailing slash) against a slug lookup. */
export function parseRouteWith<P extends PageRef>(relative: string, bySlug: (slug: string) => P | undefined): Route<P> {
  const parts = relative.split(/[?#]/)[0]!.split('/').filter(Boolean);
  if (parts.length === 0) return { kind: 'home' };
  if (parts.length === 2) {
    const page = bySlug(parts[1]!);
    if (page && sectionOf(page) === parts[0]) return { kind: 'page', page };
  }
  return { kind: 'notfound' };
}

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

export function headFor(route: Route<PageRef & Pick<PageDef, 'title' | 'description'>>, siteUrl: string, base: string): HeadData {
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
