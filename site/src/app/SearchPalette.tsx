import { useMemo } from 'react';
import { CommandPalette, type CommandItem, type CommandPaletteLabels } from '@punji/ui/command-palette';
import { pagePath } from '../paths.ts';
import searchIndex from '../generated/search.json';
import { GROUPS, navTitleOf, type PageCard } from './nav.ts';
import { navigate } from './router.tsx';

// The search palette and its index: a separate chunk, loaded when the search first opens (Search.tsx), so no page
// downloads every page's description and export names up front.

/** A page as the search sees it (scripts/site-pages.mjs writes generated/search.json). */
interface SearchPage extends PageCard {
  description: string;
  /** The export names the page documents. */
  api: string[];
}

const PAGES = searchIndex as SearchPage[];

const labels: CommandPaletteLabels = {
  dialog: 'Search the documentation',
  close: 'Close search',
  move: 'Move',
  choose: 'Choose',
  open: 'Open',
  closeKey: 'Close',
  chosen: (label) => `${label} chosen`,
  chosenMark: 'chosen',
  actionsHint: 'Left and right arrows choose an action',
};

const groupTitle = new Map(GROUPS.map((g) => [g.id, g.title]));

/** Rank: title starts with the query, then a word of the title, then an export name, then anywhere in the text. */
function score(page: SearchPage, words: string[]): number {
  const title = `${page.title} ${navTitleOf(page)}`.toLowerCase();
  const names = page.api.map((a) => a.toLowerCase());
  const text = [title, page.slug, ...names, page.description, page.lead].join(' ').toLowerCase();
  if (!words.every((w) => text.includes(w))) return -1;
  const q = words.join(' ');
  if (title.startsWith(q)) return 0;
  if (title.split(/\W+/).some((part) => part.startsWith(words[0]!))) return 1;
  if (names.some((n) => n.startsWith(words[0]!))) return 2;
  // Text-only matches: reference pages before guides, so "money" lists components before the Next.js guide.
  return page.kind === 'guide' ? 4 : 3;
}

/** The pages for a query, grouped in sidebar order when empty, by relevance otherwise. */
export function searchPages(query: string): CommandItem[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hits = PAGES.map((page, index) => ({ page, index, rank: words.length ? score(page, words) : 0 }))
    .filter((h) => h.rank >= 0)
    .toSorted((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, words.length ? 24 : PAGES.length);
  return hits.map(({ page }) => {
    // Say which export matched only when the title did not: "MoneyDisplay" keeps its lead for the query "money".
    const titleHit = page.title.toLowerCase().includes(words[0] ?? '\u0000');
    const matchedApi = words.length && !titleHit ? page.api.find((a) => a.toLowerCase().startsWith(words[0]!) && a !== page.title) : undefined;
    return {
      id: page.slug,
      group: words.length ? 'results' : page.group,
      groupLabel: words.length ? 'Pages' : (groupTitle.get(page.group) ?? null),
      title: page.title,
      sub: matchedApi ? `Exports ${matchedApi}` : page.lead,
      hint: words.length ? groupTitle.get(page.group) : undefined,
      actions: [{ id: 'open', label: 'Open' }],
    };
  });
}

/** The open palette over every page's title, lead, description and export names. */
export default function SearchPalette({ query, onQuery, onClose }: { query: string; onQuery: (query: string) => void; onClose: () => void }) {
  const items = useMemo(() => searchPages(query), [query]);
  return (
    <CommandPalette
      labels={labels}
      placeholder="Search pages, components and exports"
      query={query}
      onQuery={onQuery}
      items={items}
      testIdPrefix="docsearch"
      // The palette shows `empty` whenever it is given, so pass it only when nothing matched.
      empty={items.length > 0 ? undefined : <span>Nothing matches “{query.trim()}”. Try a component name such as MoneyDisplay, or a word like ledger.</span>}
      onRun={(item) => {
        const page = PAGES.find((p) => p.slug === item.id);
        onClose();
        if (page) void navigate(pagePath(page));
      }}
      onClose={onClose}
    />
  );
}
