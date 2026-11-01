// Paths, routes and per-page head data that need no page registry: the browser shell imports this file, so it must
// stay free of registry.ts (which holds every page's text). seo.ts adds the registry-backed routes for the build
// scripts. Paths are relative to the deploy base (BASE_PATH), with a leading and trailing slash: '/', '/components/button/'.
import type { PageDef } from './registry.ts';
import { SEO_TITLES } from './seo-titles.ts';

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

export type Section = 'get-started' | 'foundations' | 'components' | 'utilities' | 'showcase';

export function sectionOf(page: PageRef): Section {
  if (page.kind === 'guide') return 'get-started';
  if (page.kind === 'showcase') return 'showcase';
  if (page.kind === 'foundation') return 'foundations';
  if (page.kind === 'component') return 'components';
  return 'utilities';
}

export const pagePath = (page: PageRef): string => `/${sectionOf(page)}/${page.slug}/`;

/** Groups with a domain card on the overview (`#domain-<id>`), so a breadcrumb can point at them. */
export const HOME_DOMAINS: readonly string[] = ['financial-primitives', 'stock-market', 'portfolio', 'accounting', 'banking', 'data', 'forms', 'layout', 'feedback', 'developer'];
/** The overview anchor for a page's group, or undefined when the group has no section there. */
export const groupAnchor = (page: Pick<PageDef, 'group' | 'kind'>): string | undefined =>
  page.kind === 'showcase' ? 'showcase' : HOME_DOMAINS.includes(page.group) ? `domain-${page.group}` : undefined;

const DOMAIN_WORDS: Partial<Record<PageDef['group'], string>> = {
  'stock-market': 'stock market apps',
  portfolio: 'portfolio apps',
  accounting: 'accounting apps',
  banking: 'banking apps',
  data: 'financial data',
  forms: 'finance forms',
};
/** The shorter adjective form, for "<title>: React stock market component". */
const DOMAIN_ADJECTIVES: Partial<Record<PageDef['group'], string>> = {
  'stock-market': 'stock market',
  portfolio: 'portfolio',
  accounting: 'accounting',
  banking: 'banking',
  data: 'data',
  forms: 'form',
};
/** Search results cut titles at roughly 60 characters. */
export const TITLE_MAX = 62;

/**
 * The search-result title. A hand-written one from seo-titles.ts when the page answers a common search, else
 * "<title>: <what it is> for <domain> | Punji UI", dropping words until it fits in TITLE_MAX characters.
 */
export function headTitleOf(page: PageRef & Pick<PageDef, 'title' | 'group'>): string {
  const own = SEO_TITLES[page.slug];
  if (own) return own;
  const suffix = ` | ${SITE_NAME}`;
  const noun =
    page.kind === 'component'
      ? 'React component'
      : page.kind === 'hooks'
        ? 'React hooks'
        : page.kind === 'utility'
          ? 'TypeScript utility'
          : page.kind === 'foundation'
            ? 'design tokens'
            : page.kind === 'showcase'
              ? 'React screen pattern'
              : 'guide';
  const domain = page.kind === 'foundation' ? 'React apps' : (DOMAIN_WORDS[page.group] ?? 'finance apps');
  const [language, ...rest] = noun.split(' ');
  const short = page.kind === 'guide' || page.kind === 'foundation' ? undefined : `${language} ${DOMAIN_ADJECTIVES[page.group] ?? 'finance'} ${rest.join(' ')}`;
  const candidates = [`${page.title}: ${noun} for ${domain}${suffix}`, ...(short ? [`${page.title}: ${short}${suffix}`] : []), `${page.title}: ${noun}${suffix}`, `${page.title}${suffix}`];
  return candidates.find((c) => c.length <= TITLE_MAX) ?? candidates[candidates.length - 1]!;
}


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
  /** Absolute canonical URL; empty on the 404 page, which must not name one. */
  canonical: string;
  /** Path under the base, for the sitemap and links. */
  path: string;
  robots: string;
  ogType: 'website' | 'article';
  ogImage: string;
  jsonLd: object[];
}

/** Facts about a page that are not in its registry entry: its group's title and when its sources last changed. */
export interface HeadExtra {
  groupTitle?: string;
  /** YYYY-MM-DD, from git (generated/dates.json, written by scripts/site-dates.mjs). */
  modified?: string;
}

export const ROBOTS_INDEX = 'index,follow,max-image-preview:large';

export function headFor(
  route: Route<PageRef & Pick<PageDef, 'title' | 'description' | 'group'>>,
  siteUrl: string,
  base: string,
  extra: HeadExtra = {},
): HeadData {
  const origin = siteUrl.replace(/\/+$/, '');
  const url = (path: string) => `${origin}${joinBase(base, path)}`;
  const ogImage = `${origin}${joinBase(base, '/og.png')}`;
  const home = url('/');
  const ids = { website: `${home}#website`, organization: `${home}#organization`, software: `${home}#software` };
  const organization = { '@type': 'Organization', '@id': ids.organization, name: ORGANIZATION.name, url: ORGANIZATION.url };

  if (route.kind === 'notfound') {
    return { title: NOT_FOUND_TITLE, description: NOT_FOUND_DESCRIPTION, canonical: '', path: '/', robots: 'noindex', ogType: 'website', ogImage, jsonLd: [] };
  }
  if (route.kind === 'home') {
    return {
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      canonical: home,
      path: '/',
      robots: ROBOTS_INDEX,
      ogType: 'website',
      ogImage,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@graph': [
            { '@type': 'WebSite', '@id': ids.website, name: SITE_NAME, url: home, description: HOME_DESCRIPTION, inLanguage: 'en', publisher: { '@id': ids.organization } },
            organization,
            {
              '@type': 'SoftwareSourceCode',
              '@id': ids.software,
              name: SITE_NAME,
              alternateName: PACKAGE_NAME,
              description: HOME_DESCRIPTION,
              url: home,
              codeRepository: REPO,
              sameAs: [NPM_URL, REPO],
              programmingLanguage: ['TypeScript', 'CSS'],
              runtimePlatform: 'React 19',
              license: 'https://opensource.org/licenses/MIT',
              isAccessibleForFree: true,
              keywords: 'React components, finance, money, NPR, lakh, crore, Bikram Sambat, Nepali calendar, NEPSE, accounting, banking',
              author: { '@id': ids.organization },
              publisher: { '@id': ids.organization },
            },
          ],
        },
      ],
    };
  }
  const { page } = route;
  const path = pagePath(page);
  const title = headTitleOf(page);
  const anchor = groupAnchor(page);
  const crumbs = [
    { name: SITE_NAME, item: home },
    ...(anchor && extra.groupTitle ? [{ name: extra.groupTitle, item: `${home}#${anchor}` }] : []),
    { name: page.title, item: url(path) },
  ];
  return {
    title,
    description: page.description,
    canonical: url(path),
    path,
    robots: ROBOTS_INDEX,
    ogType: 'article',
    ogImage,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        '@id': `${url(path)}#article`,
        headline: title.replace(` | ${SITE_NAME}`, ''),
        name: page.title,
        description: page.description,
        url: url(path),
        mainEntityOfPage: url(path),
        inLanguage: 'en',
        image: ogImage,
        ...(extra.modified ? { dateModified: extra.modified } : {}),
        ...(extra.groupTitle ? { articleSection: extra.groupTitle } : {}),
        isPartOf: { '@type': 'WebSite', '@id': ids.website, name: SITE_NAME, url: home },
        publisher: organization,
        about: { '@type': 'SoftwareSourceCode', '@id': ids.software, name: SITE_NAME, alternateName: PACKAGE_NAME, codeRepository: REPO, sameAs: [NPM_URL, REPO] },
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: crumbs.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, name: crumb.name, item: crumb.item })),
        },
      },
    ],
  };
}
