'use client';

/**
 * Faq (design.punji.app/components/faq): a page's questions, built on the
 * Accordion. A heading block (an eyebrow, the title, one way on) beside the
 * questions when the space is wide enough, above them when it is not; the
 * container decides, not the viewport. Every question is an Accordion header (a
 * button in a heading, with aria-expanded and aria-controls). Closed answers
 * stay in the page, hidden, so a crawler reads the same questions as the reader.
 *
 * `faqJsonLd(items)` (in `@punji/ui/faq-json-ld`, a plain function a server
 * component can call) returns the page's FAQPage structured data for the same
 * items; the app renders it in a `<script type="application/ld+json">`, the
 * component does not. `onValueChange` is the hook for analytics: it is called
 * with the open ids and what just changed.
 */
import { useId } from 'react';
import type { ReactNode } from 'react';

import { Accordion } from '../accordion/Accordion.tsx';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';

export interface FaqItem {
  /** Unique within the list; the value in `value`. Default: the position, from 1. */
  id?: string;
  /** The question. */
  q: ReactNode;
  /** The answer. */
  a: ReactNode;
  /** The question as plain text for the structured data, when `q` is not a string. */
  qText?: string;
  /** The answer as plain text (a few sentences) for the structured data, when `a` is not a string. */
  aText?: string;
}

/** What changed in the last `onValueChange`. */
export interface FaqChange {
  /** The question's id. */
  id: string;
  /** Its position in `items`, from 0. */
  index: number;
  /** True when it opened, false when it closed. */
  open: boolean;
}

export interface FaqProps {
  /** The questions in order. */
  items: readonly FaqItem[];
  /** A small line over the title. */
  eyebrow?: ReactNode;
  /** The section's title (an h2 unless `headingLevel` says otherwise). */
  title: ReactNode;
  /** One way on under the title (a link or button to the help pages). */
  action?: ReactNode;
  /** single (default): one answer open at a time. multiple: any number. */
  type?: 'single' | 'multiple';
  /** The ids that are open (controlled). */
  value?: readonly string[];
  /** The ids open at first (uncontrolled). Default: the first question. Pass [] for none. */
  defaultValue?: readonly string[];
  /** Called with the ids that are open after a change, and what changed. The place for analytics. */
  onValueChange?: (value: string[], change: FaqChange) => void;
  /** The title's level (2 to 5); the questions sit one level below. Default 2. */
  headingLevel?: 2 | 3 | 4 | 5;
  /** Becomes data-testid on the root; questions get `<testId>-<id>` and answers `<testId>-<id>-panel`. */
  testId?: string;
  /** Extra class names on the root. */
  className?: string;
}

const idOf = (item: FaqItem, index: number) => item.id ?? String(index + 1);

/**
 * A page's questions and answers on the Accordion.
 * @stability beta
 */
export function Faq({ items, eyebrow, title, action, type = 'single', value, defaultValue, onValueChange, headingLevel = 2, testId, className }: FaqProps) {
  const titleId = useId();
  const Heading = `h${headingLevel}` as 'h2';
  const first = items[0] ? idOf(items[0], 0) : undefined;
  const [open, setOpen] = useControllableState<readonly string[]>({ value, defaultValue: defaultValue ?? (first ? [first] : []), name: 'Faq value' });
  const change = (next: string[]) => {
    const ids = items.map(idOf);
    const was = new Set(open);
    const id = next.find((x) => !was.has(x)) ?? open.find((x) => !next.includes(x));
    setOpen(next);
    if (id !== undefined) onValueChange?.(next, { id, index: ids.indexOf(id), open: next.includes(id) });
  };
  return (
    <section className={`pu-faq${className ? ` ${className}` : ''}`} aria-labelledby={titleId} data-testid={testId}>
      <div className="pu-faq-head">
        {eyebrow && <p className="pu-faq-eyebrow">{eyebrow}</p>}
        <Heading className="pu-faq-title" id={titleId}>{title}</Heading>
        {action && <div className="pu-faq-action">{action}</div>}
      </div>
      <Accordion
        className="pu-faq-list"
        type={type}
        value={open}
        onValueChange={change}
        headingLevel={Math.min(headingLevel + 1, 6) as 3}
        items={items.map((item, i) => ({ id: idOf(item, i), header: item.q, children: item.a }))}
        testId={testId ? `${testId}-list` : undefined}
      />
    </section>
  );
}
