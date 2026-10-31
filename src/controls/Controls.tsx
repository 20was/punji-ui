'use client';

/**
 * Chip and ChipRow (filters and toggles), SegmentedControl (small option
 * sets, the same heights as Select), SegmentedSwitch (its 44px size) and
 * StatusPill. The app's ChipRow, SegmentedSwitch and StatusPill. testIDs
 * follow the app: `${prefix}-${value}`. Every control here reads the one
 * height scale (--control-sm 32 / md 36 / lg 44) and draws one focus ring.
 * Button and Tabs have their own files, so a page loads only what it draws.
 */
import type { ReactNode } from 'react';

import { segmentTarget } from '../format/format.ts';
import type { ControlSize } from '../select/Select.tsx';

export interface Option<T extends string> {
  value: T;
  label: ReactNode;
  /** A count after the label (a number, or a placeholder while it loads). */
  count?: ReactNode;
  /** A keyboard shortcut the page binds for this option (aria-keyshortcuts). */
  keys?: string;
  /** An icon over the label (PanelTabs only; decorative, the label names the option). */
  icon?: ReactNode;
}

export interface ChipProps {
  children: ReactNode;
  /** A toggle or a filter: aria-pressed. Omit for a suggestion chip that acts (fills a field). */
  selected?: boolean;
  /** A jump link in an in-page section nav: aria-current instead of aria-pressed, drawn like selected. */
  current?: boolean;
  onClick: () => void;
  /** sm 32, md 36 (default); a phone still gets a 44px tap area. */
  size?: 'sm' | 'md';
  /** A count after the label (tabular, quieter). */
  count?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  /** An accessible name when the visible label is a symbol (¼, ½). */
  label?: string;
  testId?: string;
  id?: string;
  /** Layout only (push to the row's end), never a restyle. */
  className?: string;
}

/**
 * The one chip (design.punji.app/components/chip): a pill you press to
 * filter or toggle. Selected is the inverse surface; hover never hides the
 * text. A label that is not pressable is a StatusPill, never a chip.
 */
export function Chip({ children, selected, current, onClick, size = 'md', count, icon, disabled, label, testId, id, className }: ChipProps) {
  return (
    <button id={id} type="button" className={`kit-chip${size === 'sm' ? ' sm' : ''}${className ? ` ${className}` : ''}`} aria-label={label} aria-pressed={current === undefined ? selected : undefined} aria-current={current ? 'true' : undefined} onClick={onClick} disabled={disabled} data-testid={testId}>
      {icon ? <span className="kit-chip-ico" aria-hidden="true">{icon}</span> : null}
      {children}
      {count !== undefined && <span className="count">{count}</span>}
    </button>
  );
}

/** A single-select row of chips (the app's ChipRow). Wraps on wide screens with `wrap`, scrolls sideways otherwise. */
export function ChipRow<T extends string>({ options, value, onChange, prefix, label, size, wrap }: { options: Option<T>[]; value: T; onChange: (v: T) => void; prefix: string; label: string; size?: 'sm' | 'md'; wrap?: boolean }) {
  return (
    <div className={`kit-chips${wrap ? ' wrap' : ''}`} role="group" aria-label={label}>
      {options.map((o) => (
        <Chip key={o.value} selected={o.value === value} onClick={() => onChange(o.value)} size={size} count={o.count} testId={`${prefix}-${o.value}`}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

export interface SegmentedProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  /** testIDs and ids are `${prefix}-${value}`. */
  prefix: string;
  /** The group's accessible name ("Sessions", "Horizon"). */
  label: string;
  /** Names the tabpanel the segments control: then they are ARIA tabs. Omit for a toggle group. */
  panelId?: string;
  /** Same heights as Select: sm 32px, md 36px, lg 44px. */
  size?: ControlSize;
  /** Segments share the full width. */
  fill?: boolean;
  /** The track spans its row and the segments wrap onto a second line when they do not fit (a set of five rules), instead of scrolling. */
  wrap?: boolean;
  /** Nothing to choose yet (no data): every segment off. */
  disabled?: boolean;
  /**
   * neutral (default): a tinted track with a raised pill. accent: a pill track on the card surface with
   * the chosen option in the accent fill, for the one choice that frames a whole page (whose portfolio).
   * At most one accent control per page.
   */
  tone?: 'neutral' | 'accent';
  testId?: string;
  className?: string;
}

/**
 * The one segmented control: a tinted track with a raised pill on the chosen
 * segment, for small option sets (windows, periods, horizons, scopes).
 * Arrow keys, Home and End move the choice.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, prefix, label, panelId, size = 'md', fill, wrap, disabled, tone = 'neutral', testId, className }: SegmentedProps<T>) {
  const key = (k: string) => {
    const next = segmentTarget(options.map((o) => o.value), value, k);
    if (next === null || next === value) return;
    onChange(next);
    requestAnimationFrame(() => document.getElementById(`${prefix}-${next}`)?.focus());
  };
  return (
    <div className={`kit-seg ${size}${tone === 'accent' ? ' accent' : ''}${fill ? ' fill' : ''}${wrap ? ' wrap' : ''}${className ? ` ${className}` : ''}`} role={panelId ? 'tablist' : 'group'} aria-label={label} data-testid={testId}>
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
              if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
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

/** A page's view tabs: the segmented control at the 44px size. */
export function SegmentedSwitch<T extends string>(props: Omit<SegmentedProps<T>, 'size'>) {
  return <SegmentedControl size="lg" {...props} />;
}
