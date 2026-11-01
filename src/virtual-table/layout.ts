// Pure layout arithmetic for VirtualFinancialTable: row offsets, the rendered
// window, multi-sort transitions and column widths. No React, no DOM.
import type { SortDir } from '../table/Table.tsx';

/** One level of a multi-column sort. The first rule is the primary sort. */
export interface SortRule {
  /** The column key. */
  key: string;
  /** The direction. */
  dir: SortDir;
}

/** The next sort after a column head is pressed. A plain press makes the column the only
 * sort (ascending, or flipped when it already was the only sort). An additive press
 * (Shift) appends the column ascending, flips it to descending, then removes it.
 */
export function nextSortRules(rules: readonly SortRule[], key: string, additive = false): SortRule[] {
  const at = rules.findIndex((rule) => rule.key === key);
  if (!additive) {
    const only = rules.length === 1 && at === 0;
    return [{ key, dir: only && rules[0]!.dir === 'asc' ? 'desc' : 'asc' }];
  }
  if (at < 0) return [...rules, { key, dir: 'asc' }];
  if (rules[at]!.dir === 'asc') return rules.map((rule, i) => (i === at ? { key, dir: 'desc' } : rule));
  return rules.filter((_, i) => i !== at);
}

/** Compare two rows by sort rules, using one accessor per column key. Missing values
 * (null, undefined, NaN) sort last in either direction. Stable when used with Array#sort.
 */
export function compareByRules<T>(rules: readonly SortRule[], accessors: Readonly<Record<string, (row: T) => string | number | bigint | null | undefined>>): (a: T, b: T) => number {
  return (a, b) => {
    for (const rule of rules) {
      const read = accessors[rule.key];
      if (!read) continue;
      const x = read(a);
      const y = read(b);
      const xMissing = x === null || x === undefined || (typeof x === 'number' && Number.isNaN(x));
      const yMissing = y === null || y === undefined || (typeof y === 'number' && Number.isNaN(y));
      if (xMissing || yMissing) {
        if (xMissing && yMissing) continue;
        return xMissing ? 1 : -1;
      }
      const order = typeof x === 'string' && typeof y === 'string' ? (x < y ? -1 : x > y ? 1 : 0) : x! < y! ? -1 : x! > y! ? 1 : 0;
      if (order !== 0) return rule.dir === 'asc' ? order : -order;
    }
    return 0;
  };
}

/** Where rows sit vertically. `offset(i)` is the top of row i; `offset(count)` the total height. */
export interface RowLayout {
  count: number;
  total: number;
  offset: (index: number) => number;
  /** The row whose box holds `y` (clamped to the rows). */
  indexAt: (y: number) => number;
}

/** Every row the same height: arithmetic, no allocation. */
export function fixedLayout(count: number, rowHeight: number): RowLayout {
  const h = Math.max(1, rowHeight);
  return {
    count,
    total: count * h,
    offset: (index) => Math.max(0, Math.min(count, index)) * h,
    indexAt: (y) => (count === 0 ? 0 : Math.max(0, Math.min(count - 1, Math.floor(y / h)))),
  };
}

/** Measured rows: `heightOf(i)` returns a measured height or undefined for the estimate.
 * One prefix-sum pass (O(n)); lookups are a binary search.
 */
export function measuredLayout(count: number, estimate: number, heightOf: (index: number) => number | undefined): RowLayout {
  const prefix = new Float64Array(count + 1);
  for (let i = 0; i < count; i++) prefix[i + 1] = prefix[i]! + (heightOf(i) ?? estimate);
  return {
    count,
    total: prefix[count]!,
    offset: (index) => prefix[Math.max(0, Math.min(count, index))]!,
    indexAt: (y) => {
      if (count === 0) return 0;
      let lo = 0;
      let hi = count - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (prefix[mid]! <= y) lo = mid;
        else hi = mid - 1;
      }
      return lo;
    },
  };
}

/** The rows to render for a viewport: [start, end), widened by `overscan` rows each side. */
export function visibleRange(layout: RowLayout, scrollTop: number, viewport: number, overscan: number): { start: number; end: number } {
  if (layout.count === 0) return { start: 0, end: 0 };
  const first = layout.indexAt(Math.max(0, scrollTop));
  const last = layout.indexAt(Math.max(0, scrollTop + Math.max(0, viewport) - 1));
  return { start: Math.max(0, first - overscan), end: Math.min(layout.count, last + 1 + overscan) };
}

/** Rendered row indices in order: the window plus any extra rows that must stay mounted
 * (the focused row), so focus is never lost when it scrolls out of the window.
 */
export function renderedIndices(start: number, end: number, extra: readonly number[], count: number): number[] {
  const out: number[] = [];
  for (let i = start; i < end; i++) out.push(i);
  for (const i of extra) if (i >= 0 && i < count && (i < start || i >= end)) out.push(i);
  return out.toSorted((a, b) => a - b);
}

/** Clamp a column width to its bounds and round to a whole pixel. */
export function clampWidth(width: number, min: number, max: number): number {
  const lo = Math.max(1, min);
  return Math.round(Math.min(Math.max(lo, max), Math.max(lo, Number.isFinite(width) ? width : lo)));
}

export interface PlacedColumn {
  key: string;
  width: number;
  pin?: 'left' | 'right' | undefined;
  /** CSS left (left pins) or right (right pins) offset in px. */
  inset?: number | undefined;
  /** The last left pin or the first right pin: draws the pin edge. */
  edge?: boolean | undefined;
}

/** Order columns as left pins, unpinned, right pins (each keeping its given order) and
 * work out the sticky offsets. `leading` is the width of a column drawn before all
 * (the selection checkbox), which is always pinned left.
 */
export function placeColumns(columns: readonly { key: string; width: number; pin?: 'left' | 'right' | undefined }[], leading = 0): PlacedColumn[] {
  const left = columns.filter((c) => c.pin === 'left');
  const middle = columns.filter((c) => c.pin !== 'left' && c.pin !== 'right');
  const right = columns.filter((c) => c.pin === 'right');
  let x = leading;
  const placedLeft = left.map((c, i) => {
    const placed: PlacedColumn = { key: c.key, width: c.width, pin: 'left', inset: x, edge: i === left.length - 1 };
    x += c.width;
    return placed;
  });
  let r = 0;
  const placedRight = right.toReversed().map((c, i) => {
    const placed: PlacedColumn = { key: c.key, width: c.width, pin: 'right', inset: r, edge: i === right.length - 1 };
    r += c.width;
    return placed;
  }).toReversed();
  return [...placedLeft, ...middle.map((c) => ({ key: c.key, width: c.width })), ...placedRight];
}
