'use client';

/**
 * Accordion (design.punji.app/components/accordion): a stack of headings that
 * each show or hide a panel (an FAQ, a loan's terms, a statement's sections).
 * The WAI-ARIA Accordion pattern: every header is a button inside a heading,
 * with aria-expanded and aria-controls; each panel is a region labelled by its
 * header (regions are dropped past six panels, as the pattern advises).
 *
 * `type="single"` keeps one panel open (`collapsible` lets the open one be
 * closed too); `type="multiple"` opens any number. Controlled with `value`, or
 * uncontrolled with `defaultValue`. Up and Down move between headers, Home and
 * End jump; Tab goes on as usual. Opening fades the panel in, and not at all
 * under reduced motion. For one section that stays visible, use a Card; for
 * switching views, Tabs.
 */
import { useId, type KeyboardEvent, type ReactNode } from 'react';

import { useControllableState } from '../use-controllable-state/useControllableState.ts';

export interface AccordionItem {
  /** Unique within the accordion; the value in `value`. */
  id: string;
  /** The header's content: a short plain line. */
  header: ReactNode;
  /** The panel's content. */
  children: ReactNode;
  /** The header cannot be toggled. */
  disabled?: boolean;
}

export interface AccordionProps {
  /** The sections in order. */
  items: readonly AccordionItem[];
  /** single: one open at a time (default). multiple: any number. */
  type?: 'single' | 'multiple';
  /** With `type="single"`, may the open panel be closed? Default true. */
  collapsible?: boolean;
  /** The ids that are open (controlled). */
  value?: readonly string[];
  /** The ids open at first (uncontrolled). */
  defaultValue?: readonly string[];
  /** Called with the ids that are open after a change. */
  onValueChange?: (value: string[]) => void;
  /** The heading level of the headers (2 to 6), so the page outline stays right. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Becomes data-testid on the root; headers get `<testId>-<id>` and panels `<testId>-<id>-panel`. */
  testId?: string;
  /** Extra class names on the root. */
  className?: string;
}

function Chevron() {
  return (
    <svg className="pu-accordion-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

/** Up, Down, Home and End move between the enabled headers (wrapping). */
const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
  const heads = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button.pu-accordion-trigger:not(:disabled)')];
  const at = heads.indexOf(document.activeElement as HTMLButtonElement);
  if (at < 0) return;
  e.preventDefault();
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? heads.length - 1 : (at + (e.key === 'ArrowDown' ? 1 : -1) + heads.length) % heads.length;
  heads[next]?.focus();
};

/**
 * Stacked sections that expand and collapse (WAI-ARIA Accordion).
 * @stability beta
 */
export function Accordion({ items, type = 'single', collapsible = true, value, defaultValue, onValueChange, headingLevel = 3, testId, className }: AccordionProps) {
  const base = useId();
  const [open, setOpen] = useControllableState<readonly string[]>({ value, defaultValue: defaultValue ?? [], onChange: onValueChange as (v: readonly string[]) => void, name: 'Accordion value' });
  const Heading = `h${headingLevel}` as 'h3';
  const regions = items.length <= 6;
  const toggle = (id: string) => {
    const on = open.includes(id);
    if (type === 'multiple') setOpen(on ? open.filter((x) => x !== id) : [...open, id]);
    else if (on) {
      if (collapsible) setOpen([]);
    } else setOpen([id]);
  };
  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- Keys bubble up from the header buttons.
    <div className={`pu-accordion${className ? ` ${className}` : ''}`} onKeyDown={onKey} data-testid={testId}>
      {items.map((item) => {
        const on = open.includes(item.id);
        const head = `${base}-${item.id}-h`, panel = `${base}-${item.id}-p`;
        // A single non-collapsible accordion keeps its open panel open: say so instead of doing nothing.
        const pinned = type === 'single' && !collapsible && on;
        return (
          <div key={item.id} className="pu-accordion-item" data-open={on || undefined}>
            <Heading className="pu-accordion-heading">
              <button
                type="button"
                id={head}
                className="pu-accordion-trigger"
                aria-expanded={on}
                aria-controls={panel}
                aria-disabled={pinned || undefined}
                disabled={item.disabled}
                onClick={() => toggle(item.id)}
                data-testid={testId ? `${testId}-${item.id}` : undefined}
              >
                <span className="pu-accordion-title">{item.header}</span>
                <Chevron />
              </button>
            </Heading>
            <div
              id={panel}
              className="pu-accordion-panel"
              role={regions ? 'region' : undefined}
              aria-labelledby={regions ? head : undefined}
              hidden={!on}
              data-testid={testId ? `${testId}-${item.id}-panel` : undefined}
            >
              {item.children}
            </div>
          </div>
        );
      })}
    </div>
  );
}
