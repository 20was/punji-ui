/**
 * RangeSelector (design.punji.app/components/range-selector): 1D, 1W, 1M, YTD, 1Y and All as a segmented control that
 * drives the window of a chart. It owns no data: you keep the range in state, and `filterByRange` cuts your points to
 * it (pure, UTC dates, no time zone surprises). Each option has a visible short name and a visually hidden full name.
 * Built on SegmentedControl: Tab to the group, then arrows, Home and End move the choice.
 */
import type { ReactNode } from 'react';

import { SegmentedControl } from '../controls/Controls.tsx';
import type { ControlSize } from '../select/Select.tsx';

export type ChartRange = '1D' | '1W' | '1M' | 'YTD' | '1Y' | 'All';

export const CHART_RANGES: readonly ChartRange[] = ['1D', '1W', '1M', 'YTD', '1Y', 'All'];

export interface RangeSelectorProps {
  /** The chosen range. The control is controlled. */
  value: ChartRange;
  /** Called with the chosen range. */
  onChange: (range: ChartRange) => void;
  /** The group's accessible name. Default "Chart range". */
  label?: string;
  /** Which ranges to offer, in order. Default all six. */
  ranges?: readonly ChartRange[];
  /** Words per range: the visible `short` form and the spoken `long` form ("1 month"). */
  words?: Partial<Record<ChartRange, { short?: string; long?: string }>>;
  /** Control height: sm (default), md or lg. */
  size?: ControlSize;
  /** Segments share the full width. */
  fill?: boolean;
  /** Becomes data-testid on the group; option ids are `${testId}-${range}`. */
  testId?: string;
}

const LONG: Record<ChartRange, string> = { '1D': '1 day', '1W': '1 week', '1M': '1 month', YTD: 'Year to date', '1Y': '1 year', All: 'All time' };

/**
 * @stability beta
 */
export function RangeSelector({ value, onChange, label = 'Chart range', ranges = CHART_RANGES, words, size = 'sm', fill, testId }: RangeSelectorProps) {
  const options = ranges.map((r) => {
    const w = words?.[r];
    const visible: ReactNode = w?.short ?? r;
    return {
      value: r,
      label: (
        <>
          <span aria-hidden="true">{visible}</span>
          <span className="kit-sr">{w?.long ?? LONG[r]}</span>
        </>
      ),
    };
  });
  return <SegmentedControl options={options} value={value} onChange={onChange} prefix={testId ?? 'range'} label={label} size={size} fill={fill} testId={testId} />;
}

const DAY = 86_400_000;
const utc = (date: string): number => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : Number.NaN;
};
const iso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * The first day (inclusive, "YYYY-MM-DD") of a range that ends on `end`, or null for All. 1M steps back one calendar month
 * (clamped to that month's last day); 1Y steps back one calendar year; YTD is 1 January of the end's year.
 */
export function rangeStart(range: ChartRange, end: string): string | null {
  const e = utc(end);
  if (!Number.isFinite(e) || range === 'All') return null;
  const d = new Date(e);
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  const day = d.getUTCDate();
  const back = (months: number): number => {
    const target = new Date(Date.UTC(y, mo - months, 1));
    const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    return Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, last));
  };
  switch (range) {
    case '1D': return iso(e - DAY);
    case '1W': return iso(e - 7 * DAY);
    case '1M': return iso(back(1));
    case 'YTD': return iso(Date.UTC(y, 0, 1));
    case '1Y': return iso(back(12));
  }
}

/**
 * Cut `items` to a range. `end` defaults to the latest date among the items; items with no readable date are kept for All
 * and dropped otherwise. Order is kept.
 */
export function filterByRange<T>(items: readonly T[], dateOf: (item: T) => string, range: ChartRange, end?: string): T[] {
  if (range === 'All') return [...items];
  const last = end ?? items.reduce<string>((a, it) => (utc(dateOf(it)) > utc(a) || !Number.isFinite(utc(a)) ? dateOf(it) : a), '');
  const start = rangeStart(range, last);
  if (start === null) return [...items];
  const from = utc(start);
  const to = utc(last);
  return items.filter((it) => {
    const t = utc(dateOf(it));
    return t >= from && t <= to;
  });
}
