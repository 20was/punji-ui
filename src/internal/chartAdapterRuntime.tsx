'use client';

/**
 * Browser half of the optional canvas chart adapters: reads the Punji tokens off an element, watches for a theme
 * change, and builds the accessible twin (spoken text, hidden table) from the original bigint data. Internal.
 */
import { useEffect, useState, type ReactNode, type RefObject } from 'react';

import { ChartDataTable } from '../chart-a11y/ChartA11yShell.tsx';
import { chartTokensFrom, FALLBACK_CHART_TOKENS, sameChartTokens, type PunjiChartTokens } from '../chart-adapters/adapterTokens.ts';
import { createMoneySpokenFormatter, createMoneyChartFormatter, type ChartMoneyConfig } from '../chart-adapters/adapterMoney.ts';

/**
 * Reads the Punji tokens as the browser resolves them at `el` (so a `data-theme` or brand scope above it applies).
 * Returns the light fallback when there is no element or no style engine.
 */
export function readChartTokens(el: Element | null | undefined): PunjiChartTokens {
  if (!el || typeof getComputedStyle !== 'function') return FALLBACK_CHART_TOKENS;
  const style = getComputedStyle(el);
  return chartTokensFrom((variable) => style.getPropertyValue(variable));
}

/**
 * Calls `onChange` when the theme under `el` may have changed: a `data-theme`, `class` or `style` change on `el` or any
 * ancestor, or a change of the system colour scheme or contrast preference. Returns the stop function.
 */
export function watchChartTheme(el: Element, onChange: () => void): () => void {
  const stops: Array<() => void> = [];
  if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver(onChange);
    for (let node: Element | null = el; node; node = node.parentElement) observer.observe(node, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    stops.push(() => observer.disconnect());
  }
  if (typeof matchMedia === 'function') {
    for (const query of ['(prefers-color-scheme: dark)', '(prefers-contrast: more)']) {
      const media = matchMedia(query);
      media.addEventListener?.('change', onChange);
      stops.push(() => media.removeEventListener?.('change', onChange));
    }
  }
  return () => stops.forEach((stop) => stop());
}

/**
 * The live tokens under `ref`: the light fallback on the server and first render, then the resolved theme, re-read
 * whenever the theme changes. Pass the element that sits inside the chart's theme scope.
 */
export function useChartTokens(ref: RefObject<Element | null>): PunjiChartTokens {
  const [tokens, setTokens] = useState<PunjiChartTokens>(FALLBACK_CHART_TOKENS);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const sync = () => setTokens((prev) => {
      const next = readChartTokens(el);
      return sameChartTokens(prev, next) ? prev : next;
    });
    sync();
    return watchChartTheme(el, sync);
  }, [ref]);
  return tokens;
}

/** One position on a chart as the hidden table and the live region see it: exact bigint values, `null` for none. */
export interface AdapterA11yPoint {
  key: string;
  /** The row head and the spoken lead: the date, the period. */
  label: string;
  /** One bigint per column. */
  values: readonly (bigint | null)[];
}

export interface AdapterA11yLabels {
  /** Head of the first table column. Default "Date". */
  position?: string;
  /** Spoken or printed in place of a missing value. Default "none". */
  none?: string;
  /** The note under a table cut to the latest rows. Default "Showing the latest N of M rows". */
  truncated?: (shown: number, total: number) => string;
  /** The spoken summary. Default "Name: N points from A to B." */
  summary?: (info: { name: string; count: number; first: string; last: string }) => string;
}

export interface AdapterA11yInput {
  name: string;
  columns: readonly string[];
  points: readonly AdapterA11yPoint[];
  money: ChartMoneyConfig;
  /** Table rows kept; the cursor still walks every point. Default 500. */
  maxRows?: number;
  labels?: AdapterA11yLabels;
}

export interface AdapterA11y {
  count: number;
  speak: (index: number) => string;
  summary: string;
  table: ReactNode;
}

/** Builds the shell's `count`, `speak`, `summary` and `table` from exact bigint points. The plotted numbers are never read. */
export function buildAdapterA11y({ name, columns, points, money, maxRows = 500, labels }: AdapterA11yInput): AdapterA11y {
  const spoken = createMoneySpokenFormatter(money);
  const shown = createMoneyChartFormatter(money);
  const none = labels?.none ?? 'none';
  const cell = (v: bigint | null | undefined, speak: boolean) => (v === null || v === undefined ? none : speak ? spoken(v) : shown(v));
  const speak = (index: number) => {
    const p = points[index];
    if (!p) return '';
    return `${p.label}: ${columns.map((c, i) => `${c} ${cell(p.values[i], true)}`).join(', ')}`;
  };
  const first = points[0];
  const last = points[points.length - 1];
  const summary = first && last ? (labels?.summary ?? ((i) => `${i.name}: ${i.count} points from ${i.first} to ${i.last}.`))({ name, count: points.length, first: first.label, last: last.label }) : '';
  const rows = points.length > maxRows ? points.slice(points.length - maxRows) : points;
  const table = (
    <ChartDataTable
      caption={name}
      head={[labels?.position ?? 'Date', ...columns]}
      rows={rows.map((p) => ({ key: p.key, head: p.label, cells: columns.map((_, i) => cell(p.values[i], false)) }))}
      note={rows.length < points.length ? <p>{(labels?.truncated ?? ((s, t) => `Showing the latest ${s} of ${t} rows`))(rows.length, points.length)}</p> : undefined}
    />
  );
  return { count: points.length, speak, summary, table };
}
