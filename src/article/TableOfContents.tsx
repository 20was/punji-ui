'use client';

/**
 * TableOfContents (design.punji.app/components/article): the in-page contents
 * of a long article, one link per section, with the section being read marked
 * `aria-current="location"` as you scroll. A <nav> named "On this page" around
 * an ordered list of `#fragment` links.
 *
 * Give it `entries` (from `extractToc` in `@punji/ui/article-toc`, or your own list: it renders the same
 * on the server and the client), or leave `entries` out and it reads the
 * headings of `scope` after it mounts. The current section comes from an
 * IntersectionObserver on the headings; where there is none (the server, an old
 * browser, a test) nothing is marked until a link is chosen or the address has
 * a `#fragment`, and the links work as plain anchors either way. Controlled
 * with `current`, or uncontrolled with `defaultCurrent` and `onCurrentChange`.
 */
import { useEffect, useId, useRef, useState } from 'react';

import { useControllableState } from '../use-controllable-state/useControllableState.ts';
import type { TocEntry } from './extractToc.ts';

/** TableOfContents' words. */
export interface TableOfContentsLabels {
  /** The visible title and the nav's accessible name. Default "On this page". */
  title?: string;
}

export interface TableOfContentsProps {
  /** The sections in reading order. Omit to read the headings of `scope` once mounted. */
  entries?: readonly TocEntry[];
  /** Which headings to read when `entries` is omitted (a CSS selector for the article). Default "main". */
  scope?: string;
  /** The heading levels to read from `scope`. Default [2]. */
  levels?: readonly (2 | 3 | 4)[];
  /** The id of the section being read (controlled). */
  current?: string | null;
  /** The section marked at first (uncontrolled). */
  defaultCurrent?: string | null;
  /** Called with the id of the section that became current. */
  onCurrentChange?: (id: string | null) => void;
  /** Show the contents only from this many entries: a short page needs none. Default 1. */
  minEntries?: number;
  /** Its words. */
  labels?: TableOfContentsLabels;
  /** Becomes data-testid on the nav; links get `<testId>-<id>`. */
  testId?: string;
  /** Extra class names on the nav. */
  className?: string;
}

/** The entries for the headings of `scope`; the ones without an `id` are skipped. */
function readHeadings(scope: string, levels: readonly number[]): TocEntry[] {
  const root = document.querySelector(scope) ?? document.body;
  const selector = levels.map((l) => `h${l}[id]`).join(',');
  return [...root.querySelectorAll<HTMLElement>(selector)].map((h) => ({ id: h.id, label: h.textContent?.trim() ?? '', level: Number(h.tagName.slice(1)) })).filter((e) => e.label);
}

const hashId = (): string | null => {
  try {
    return decodeURIComponent(location.hash.slice(1)) || null;
  } catch {
    return null;
  }
};

/**
 * The in-page contents of an article, with the section being read marked.
 * @stability beta
 */
export function TableOfContents({ entries, scope = 'main', levels = [2], current, defaultCurrent = null, onCurrentChange, minEntries = 1, labels, testId, className }: TableOfContentsProps) {
  const text = { title: 'On this page', ...labels };
  const titleId = useId();
  const [scanned, setScanned] = useState<readonly TocEntry[]>([]);
  const list = entries ?? scanned;
  const [active, setActive] = useControllableState<string | null>({ value: current, defaultValue: defaultCurrent, onChange: onCurrentChange, name: 'TableOfContents current' });
  const levelsKey = levels.join(',');
  useEffect(() => {
    if (entries) return;
    // The DOM is read after mount (the server has none), so the list cannot be derived during render.
    // oxlint-disable-next-line react/set-state-in-effect
    setScanned(readHeadings(scope, levelsKey.split(',').map(Number)));
  }, [entries, scope, levelsKey]);

  const ids = list.map((e) => e.id).join('\n');
  const setLatest = useRef(setActive);
  useEffect(() => {
    setLatest.current = setActive;
  });
  useEffect(() => {
    const known = ids ? ids.split('\n') : [];
    if (!known.length) return;
    const fromHash = hashId();
    if (fromHash && known.includes(fromHash)) setLatest.current(fromHash);
    const onHash = () => {
      const id = hashId();
      if (id && known.includes(id)) setLatest.current(id);
    };
    window.addEventListener('hashchange', onHash);
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined') {
      const visible = new Set<string>();
      // A heading counts as "being read" while it is in the top 30% of the viewport; once it scrolls above, the last one stays current.
      observer = new IntersectionObserver(
        (records) => {
          for (const r of records) {
            if (r.isIntersecting) visible.add(r.target.id);
            else visible.delete(r.target.id);
          }
          const first = known.find((id) => visible.has(id));
          if (first) setLatest.current(first);
        },
        { rootMargin: '0px 0px -70% 0px' },
      );
      for (const id of known) {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      }
    }
    return () => {
      window.removeEventListener('hashchange', onHash);
      observer?.disconnect();
    };
  }, [ids]);

  if (list.length === 0 || list.length < minEntries) return null;
  const top = Math.min(...list.map((e) => e.level ?? 2));
  return (
    <nav className={`pu-toc${className ? ` ${className}` : ''}`} aria-labelledby={titleId} data-testid={testId}>
      <p className="pu-toc-title" id={titleId}>{text.title}</p>
      <ol className="pu-toc-list">
        {list.map((e) => (
          <li key={e.id} className="pu-toc-item" data-depth={Math.min(Math.max((e.level ?? 2) - top, 0), 3)}>
            <a className="pu-toc-link" href={`#${encodeURIComponent(e.id)}`} aria-current={active === e.id ? 'location' : undefined} onClick={() => setActive(e.id)} data-testid={testId ? `${testId}-${e.id}` : undefined}>
              {e.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
