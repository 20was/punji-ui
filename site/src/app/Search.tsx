import { useEffect, useMemo, useState } from 'react';
import { CommandPalette, type CommandItem, type CommandPaletteLabels } from '@punji/ui/command-palette';
import { GROUPS, PAGES, leadOf, navTitleOf, type PageDef } from '../registry.ts';
import { pagePath } from '../seo.ts';
import { navigate } from './router.tsx';
import { SearchIcon } from './icons.tsx';

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
function score(page: PageDef, words: string[]): number {
  const title = `${page.title} ${navTitleOf(page)}`.toLowerCase();
  const names = page.api.map((a) => a.name.toLowerCase());
  const text = [title, page.slug, ...names, page.description, leadOf(page)].join(' ').toLowerCase();
  if (!words.every((w) => text.includes(w))) return -1;
  const q = words.join(' ');
  if (title.startsWith(q)) return 0;
  if (title.split(/\W+/).some((part) => part.startsWith(words[0]!))) return 1;
  if (names.some((n) => n.startsWith(words[0]!))) return 2;
  return 3;
}

/** The pages for a query, grouped in sidebar order when empty, by relevance otherwise. */
export function searchPages(query: string): CommandItem[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hits = PAGES.map((page, index) => ({ page, index, rank: words.length ? score(page, words) : 0 }))
    .filter((h) => h.rank >= 0)
    .toSorted((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, words.length ? 24 : PAGES.length);
  return hits.map(({ page }) => {
    const matchedApi = words.length ? page.api.find((a) => a.name.toLowerCase().startsWith(words[0]!) && a.name !== page.title) : undefined;
    return {
      id: page.slug,
      group: words.length ? 'results' : page.group,
      groupLabel: words.length ? 'Pages' : (groupTitle.get(page.group) ?? null),
      title: page.title,
      sub: matchedApi ? `Exports ${matchedApi.name}` : leadOf(page),
      hint: words.length ? groupTitle.get(page.group) : undefined,
      actions: [{ id: 'open', label: 'Open' }],
    };
  });
}

/**
 * The header search: a button that looks like a field, opening the package's own CommandPalette over every page's
 * title, lead, description and export names. Command-K or Ctrl-K opens it from anywhere; so does the slash key
 * when focus is not in a field.
 */
export function Search() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const items = useMemo(() => (open ? searchPages(query) : []), [open, query]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest('input, textarea, select, [contenteditable="true"]');
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((o) => !o);
      } else if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  return (
    <>
      <button type="button" className="doc-search" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K /" data-testid="search">
        <SearchIcon />
        <span className="doc-search-text">Search the docs</span>
        <kbd aria-hidden="true">⌘K</kbd>
      </button>
      {open && (
        <CommandPalette
          labels={labels}
          placeholder="Search pages, components and exports"
          query={query}
          onQuery={setQuery}
          items={items}
          testIdPrefix="docsearch"
          empty={<span>Nothing matches “{query.trim()}”. Try a component name such as MoneyDisplay, or a word like ledger.</span>}
          onRun={(item) => {
            const page = PAGES.find((p) => p.slug === item.id);
            close();
            if (page) navigate(pagePath(page));
          }}
          onClose={close}
        />
      )}
    </>
  );
}
