import type { GroupId, PageDef } from '../registry.ts';
import { parseRouteWith, type Route } from '../paths.ts';
import nav from '../generated/nav.json';

// The slim page index every page loads: enough for the sidebar, the router and prev/next links. Written by
// scripts/site-pages.mjs from registry.ts; a page's full text, API and examples load with its route (load.ts).

export interface NavPage {
  slug: string;
  title: string;
  /** Present only when it differs from `title`. */
  navTitle?: string;
  group: GroupId;
  kind: PageDef['kind'];
}

/** A page as a card: the nav entry plus its one-line lead (related pages, the overview's showcase list). */
export interface PageCard extends NavPage {
  lead: string;
}

export const GROUPS = nav.groups as { id: GroupId; title: string }[];
export const NAV = nav.pages as NavPage[];

export const navBySlug = (slug: string): NavPage | undefined => NAV.find((p) => p.slug === slug);
export const navTitleOf = (page: NavPage): string => page.navTitle ?? page.title;
export const groupTitleOf = (id: GroupId): string => GROUPS.find((g) => g.id === id)?.title ?? '';

export type ClientRoute = Route<NavPage>;

/** Resolve a path relative to the base against the nav index. */
export const parseClientRoute = (relative: string): ClientRoute => parseRouteWith(relative, navBySlug);
