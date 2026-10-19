'use client';

/**
 * PLACEHOLDER (pipeline proof). Copied from the in-repo kit so the build, test,
 * size and package gates run on real code. The real kit arrives in the
 * extraction PR.
 *
 * SegmentedControl (https://design.punji.app/components/segmented-control): a
 * tinted track with a raised pill on the chosen segment, for small option sets.
 * Arrow keys, Home and End move the choice. Same heights as Select and Button.
 * Styles: `@punji/ui/styles.css` or `@punji/ui/css/segmented-control.css`.
 */
import type { ReactNode } from 'react';

import { segmentTarget } from '../internal/segment-target.ts';
import type { ControlSize } from '../internal/types.ts';

export interface Option<T extends string> {
  value: T;
  label: ReactNode;
  /** A count after the label. */
  count?: ReactNode;
  /** A keyboard shortcut the page binds for this option (aria-keyshortcuts). */
  keys?: string;
}

export interface SegmentedProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  /** testIDs and ids are `${prefix}-${value}`. */
  prefix: string;
  /** The group's accessible name. */
  label: string;
  /** Names the tabpanel the segments control: then they are ARIA tabs. Omit for a toggle group. */
  panelId?: string;
  /** Same heights as Select: sm 32px, md 36px, lg 44px. */
  size?: ControlSize;
  /** Segments share the full width. */
  fill?: boolean;
  /** Nothing to choose yet: every segment off. */
  disabled?: boolean;
  /** neutral (default): a tinted track with a raised pill. accent: the chosen option in the accent fill. At most one accent control per page. */
  tone?: 'neutral' | 'accent';
  testId?: string;
  className?: string;
}

const MOVE_KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

/** The one segmented control. */
export function SegmentedControl<T extends string>({ options, value, onChange, prefix, label, panelId, size = 'md', fill, disabled, tone = 'neutral', testId, className }: SegmentedProps<T>) {
  const key = (k: string) => {
    const next = segmentTarget(
      options.map((o) => o.value),
      value,
      k,
    );
    if (next === null || next === value) return;
    onChange(next);
    requestAnimationFrame(() => document.getElementById(`${prefix}-${next}`)?.focus());
  };
  return (
    <div className={`kit-seg ${size}${tone === 'accent' ? ' accent' : ''}${fill ? ' fill' : ''}${className ? ` ${className}` : ''}`} role={panelId ? 'tablist' : 'group'} aria-label={label} data-testid={testId}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            id={`${prefix}-${o.value}`}
            type="button"
            role={panelId ? 'tab' : undefined}
            aria-selected={panelId ? on : undefined}
            aria-pressed={panelId ? undefined : on}
            aria-controls={panelId}
            aria-keyshortcuts={o.keys}
            tabIndex={panelId && !on ? -1 : 0}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (MOVE_KEYS.includes(e.key)) {
                e.preventDefault();
                // The control owns its arrows: a page's own list keys must not move too.
                e.stopPropagation();
                key(e.key);
              }
            }}
            data-testid={`${prefix}-${o.value}`}
          >
            {o.label}
            {o.count !== undefined && o.count !== null && <span className="count">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
