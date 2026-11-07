/**
 * extractToc (design.punji.app/components/article): the contents of an article derived from its headings, during
 * render, with no React hooks and no browser APIs, so a server component can call it (it is not in the
 * 'use client' module with TableOfContents). The ids are in server HTML, so a `#fragment` address works before any
 * script runs.
 */
import { Children, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';

export interface TocEntry {
  /** The heading's `id`: the link points at `#id`. */
  id: string;
  /** The link text. */
  label: string;
  /** The heading level (2 to 6). Entries deeper than the shallowest are indented. Default 2. */
  level?: number;
}

/** Flatten a heading's children to its text, so an <h2> holding a <strong> still gives a label. */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return '';
}

/**
 * A heading's text as an id: lower case, words joined with hyphens, at most 60 characters. Non-Latin letters are kept.
 * @stability beta
 */
export function slugifyHeading(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-').slice(0, 60);
}

/**
 * The contents of some content, and the same content with an `id` on every
 * heading of the element types in `levels`, so the links have something to
 * point at. Done during render, so the ids are in server HTML and a
 * `#fragment` address works before any script runs. A heading that already has
 * an `id` keeps it; a repeated heading gets `-2`, `-3`. Only direct children
 * are read.
 * @stability beta
 */
export function extractToc(children: ReactNode, levels: readonly ('h2' | 'h3' | 'h4')[] = ['h2']): { toc: TocEntry[]; content: ReactNode } {
  const toc: TocEntry[] = [];
  const used = new Set<string>();
  const content = Children.map(children, (child) => {
    if (!isValidElement(child) || typeof child.type !== 'string' || !(levels as readonly string[]).includes(child.type)) return child;
    const props = child.props as { children?: ReactNode; id?: string };
    const label = textOf(props.children);
    if (!label) return child;
    const base = props.id || slugifyHeading(label) || `section-${toc.length + 1}`;
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    toc.push({ id, label, level: Number(child.type.slice(1)) });
    return props.id === id ? child : cloneElement(child as ReactElement<{ id?: string }>, { id });
  });
  return { toc, content };
}

