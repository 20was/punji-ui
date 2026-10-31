'use client';

import { segmentTarget } from '../format/format.ts';
import type { Option } from '../controls/Controls.tsx';

export interface TabsProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  /** ids and testIDs are `${prefix}-${value}`. */
  prefix: string;
  /** The tab list's accessible name. */
  label: string;
  /** The id of the panel the tabs show (role="tabpanel", aria-labelledby the chosen tab). */
  panelId: string;
  /** Tabs share the full width (a phone's two or three views). */
  fill?: boolean;
  /**
   * line: labels with an underline on the chosen one (the default).
   * panel: a side panel's views, an icon over a short label on a track, the chosen one filled (PanelTabs).
   */
  variant?: 'line' | 'panel';
  testId?: string;
}

/**
 * Section tabs (design.punji.app/components/tabs): a row of labels with an
 * underline on the chosen one, for switching the views of one section. ARIA
 * tabs with a roving tab stop; arrows, Home and End move the choice. A small
 * option set inside a toolbar is a SegmentedControl; tabs that change the
 * URL are links in the page's nav, not these.
 */
export function Tabs<T extends string>({ options, value, onChange, prefix, label, panelId, fill, variant = 'line', testId }: TabsProps<T>) {
  const key = (k: string) => {
    const next = segmentTarget(options.map((o) => o.value), value, k);
    if (next === null || next === value) return;
    onChange(next);
    requestAnimationFrame(() => document.getElementById(`${prefix}-${next}`)?.focus());
  };
  const panel = variant === 'panel';
  return (
    <div className={`kit-tabs${fill || panel ? ' fill' : ''}${panel ? ' panel' : ''}`} role="tablist" aria-label={label} data-testid={testId}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            id={`${prefix}-${o.value}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={panelId}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                key(e.key);
              }
            }}
            data-testid={`${prefix}-${o.value}`}
          >
            {panel && o.icon ? (
              <span className="ico" aria-hidden="true">
                {o.icon}
              </span>
            ) : null}
            {panel ? <span className="tx">{o.label}</span> : o.label}
            {o.count !== undefined && o.count !== null && <span className="count">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * PanelTabs (design.punji.app/components/panel-tabs): the views of a side
 * panel beside a tool (a chart's Watchlist, Lists, Stock, Alerts, Brokers),
 * each an icon over a short label, sharing the panel's width on one track.
 * The same ARIA tabs as Tabs (roving tab stop, arrows, Home, End). Keep the
 * labels to one short word: five fit a 432px panel and a phone sheet.
 */
export function PanelTabs<T extends string>(props: Omit<TabsProps<T>, 'variant' | 'fill'>) {
  return <Tabs {...props} variant="panel" />;
}
