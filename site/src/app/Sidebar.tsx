import { useEffect, useRef, useState } from 'react';
import { useLocalStorage } from '@punji/ui/hooks';
import type { GroupId } from '../registry.ts';
import { pagePath } from '../paths.ts';
import { GROUPS, NAV as PAGES, navTitleOf } from './nav.ts';
import { Link } from './router.tsx';
import { ChevronIcon } from './icons.tsx';

const KEY = 'punji-docs-nav-collapsed';
const isList = (value: unknown): value is GroupId[] => Array.isArray(value) && value.every((v) => typeof v === 'string');
const options = { defaultValue: [] as GroupId[], validate: isList };

/**
 * The page tree: one collapsible group per domain, in registry order. Collapsed groups persist (localStorage);
 * the server render has every group open, so every link is in the HTML. The group holding the current page is
 * always open on arrival, so the active link is visible. Planned exports stay in ROADMAP.md (linked from the footer),
 * not in the navigation.
 */
export function Sidebar({ current, onNavigate, idPrefix = 'nav' }: { current: string; onNavigate?: () => void; idPrefix?: string }) {
  const { value: collapsed, set } = useLocalStorage<GroupId[]>(KEY, options);
  const currentGroup = current === '/' ? 'get-started' : PAGES.find((p) => pagePath(p) === current)?.group;
  // The group holding the current page is always open on arrival, whatever was saved; closing it by hand lasts
  // for this page view only (the saved list is never rewritten behind the reader's back).
  const [closedHere, setClosedHere] = useState<string | null>(null);
  const isOpen = (id: GroupId) => (id === currentGroup ? closedHere !== current : !collapsed.includes(id));
  const toggle = (id: GroupId) => {
    if (id === currentGroup) setClosedHere((c) => (c === current ? null : current));
    else set((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };
  // Keep the current page's link in view inside the sidebar's own scroll (never scrolls the page).
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = current ? navRef.current : null;
    const box = nav?.closest<HTMLElement>('.doc-aside');
    const link = nav?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!box || !link) return;
    const top = link.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 48) box.scrollTop = Math.max(0, top - box.clientHeight / 3);
  }, [current]);
  return (
    <nav className="doc-nav" aria-label="Documentation" ref={navRef}>
      <ul className="doc-nav-groups" aria-label="Pages by domain">
        {GROUPS.map((group) => {
          const pages = PAGES.filter((p) => p.group === group.id);
          const open = isOpen(group.id);
          const listId = `${idPrefix}-${group.id}`;
          return (
            <li key={group.id} className="doc-nav-group">
              <button type="button" className="doc-nav-title" aria-expanded={open} aria-controls={listId} onClick={() => toggle(group.id)}>
                <span>{group.title}</span>
                <ChevronIcon className="doc-nav-chev" />
              </button>
              <ul id={listId} hidden={!open}>
                {group.id === 'get-started' && (
                  <li>
                    <Link to="/" aria-current={current === '/' ? 'page' : undefined} onClick={onNavigate}>
                      Overview
                    </Link>
                  </li>
                )}
                {pages.map((page) => (
                  <li key={page.slug}>
                    <Link to={pagePath(page)} aria-current={pagePath(page) === current ? 'page' : undefined} onClick={onNavigate} title={navTitleOf(page) !== page.title ? page.title : undefined}>
                      {navTitleOf(page)}
                    </Link>
                  </li>
                ))}
                {pages.length === 0 && <li className="doc-nav-empty">No pages yet</li>}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
