// Paths and routes that need no page registry: the browser shell imports this file, so it must stay free of
// registry.ts (which holds every page's text) and of head-data.ts (loaded when a link changes the page). seo.ts adds
// the registry-backed routes for the build scripts. Paths are relative to the deploy base (BASE_PATH), with a leading and trailing slash: '/', '/components/button/'.
import type { PageDef } from './registry.ts';

/** The fields a route needs: enough to build a path. The registry's PageDef and the browser's slim nav entry both fit. */
export type PageRef = Pick<PageDef, 'slug' | 'kind'>;

export const SITE_NAME = 'Punji UI';
export const REPO = 'https://github.com/20was/punji-ui';
export const PACKAGE_NAME = '@punji/ui';
export const NPM_URL = 'https://www.npmjs.com/package/@punji/ui';
export const ORGANIZATION = { name: 'Punji', url: 'https://punji.app' } as const;
export const HOME_TITLE = 'Punji UI: finance React component library, Nepal-first';
export const HOME_DESCRIPTION =
  'Accessible React components for money, markets and accounting: exact bigint amounts, NPR lakh and crore, Bikram Sambat dates and NEPSE tables. MIT, on npm.';
export const NOT_FOUND_TITLE = `Page not found | ${SITE_NAME}`;
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

/** Groups with a domain card on the overview (`#domain-<id>`), so a breadcrumb can point at them. */
export const HOME_DOMAINS: readonly string[] = ['financial-primitives', 'stock-market', 'portfolio', 'accounting', 'banking', 'data', 'forms', 'layout', 'feedback', 'developer'];
/** The overview anchor for a page's group, or undefined when the group has no section there. */
export const groupAnchor = (page: Pick<PageDef, 'group' | 'kind'>): string | undefined =>
  page.kind === 'showcase' ? 'showcase' : page.kind === 'app' ? 'apps' : HOME_DOMAINS.includes(page.group) ? `domain-${page.group}` : undefined;

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

/** Normalise a base like 'punji-ui', '/punji-ui' or '/punji-ui/' to '/punji-ui/'; '' and '/' stay '/'. */
export function normaliseBase(base: string | undefined): string {
  const trimmed = (base ?? '/').trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}
