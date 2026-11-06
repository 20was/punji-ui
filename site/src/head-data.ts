// The per-page head: titles, descriptions, canonical URLs and JSON-LD. The browser loads this file only when a link
// changes the page (the first load's head is in the prerendered HTML), so the shell stays free of it; the build scripts
// reach it through seo.ts, which re-exports it.
import type { PageDef } from './registry.ts';
import {
  groupAnchor,
  HOME_DESCRIPTION,
  HOME_TITLE,
  NOT_FOUND_DESCRIPTION,
  NOT_FOUND_TITLE,
  NPM_URL,
  ORGANIZATION,
  PACKAGE_NAME,
  pagePath,
  REPO,
  SITE_NAME,
  type PageRef,
  type Route,
} from './paths.ts';
import { SEO_TITLES } from './seo-titles.ts';

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
              : page.kind === 'app'
                ? 'React app demo'
                : 'guide';
  const domain = page.kind === 'foundation' ? 'React apps' : (DOMAIN_WORDS[page.group] ?? 'finance apps');
  const [language, ...rest] = noun.split(' ');
  const short = page.kind === 'guide' || page.kind === 'foundation' ? undefined : `${language} ${DOMAIN_ADJECTIVES[page.group] ?? 'finance'} ${rest.join(' ')}`;
  const candidates = [`${page.title}: ${noun} for ${domain}${suffix}`, ...(short ? [`${page.title}: ${short}${suffix}`] : []), `${page.title}: ${noun}${suffix}`, `${page.title}${suffix}`];
  return candidates.find((c) => c.length <= TITLE_MAX) ?? candidates[candidates.length - 1]!;
}


const joinBase = (base: string, path: string) => `${base.replace(/\/+$/, '')}${path}`;

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
