/**
 * Receivables and payables aging: outstanding amounts grouped by party and by how many days past their date they are
 * on an as-of date (0–30, 31–60, 61–90, over 90 by default). Exact bigint sums; dates are date-only values, so the
 * host's time zone never shifts a day.
 */
import type { CalendarDate } from '../nepal/date-only.ts';

export interface AgingItem {
  /** Stable id (an invoice or bill number). */
  id: string;
  /** Who owes or is owed. Items with the same party are summed on one row. */
  party: string;
  /** The date aging counts from: the due date, or the invoice date if that is your policy (Gregorian, date-only). */
  date: CalendarDate;
  /** Outstanding amount in minor units. A credit note can be negative. */
  amount: bigint;
}

export interface AgingBucket {
  /** 'not-due', then '0-30', '31-60', ..., and the last '90+'. */
  key: string;
  /** First and last day past the date in this bucket; `to` is null for the open last bucket, `from` is -Infinity for not-due. */
  from: number;
  /** Last day in the bucket, or null for the open last bucket. */
  to: number | null;
}

export interface AgingRow {
  party: string;
  /** One amount per bucket, in the order of `buckets`. */
  amounts: bigint[];
  total: bigint;
  /** Ids of the items on this row. */
  items: string[];
  /** Most days past due of any item on the row. */
  oldestDays: number;
}

export interface AgingResult {
  buckets: AgingBucket[];
  rows: AgingRow[];
  /** Column totals in the order of `buckets`. */
  totals: bigint[];
  total: bigint;
}

const dayNumber = (d: CalendarDate) => Math.floor(Date.UTC(d.year, d.month - 1, d.day) / 86_400_000);

/** Whole days from `date` to `asOf` (positive when `date` is earlier). */
export function calendarDaysBetween(date: CalendarDate, asOf: CalendarDate): number {
  return dayNumber(asOf) - dayNumber(date);
}

export interface AgingOptions {
  /** Last day of each bucket before the open one. Default [30, 60, 90]: 0–30, 31–60, 61–90, 90+. */
  limits?: readonly number[];
  /** Give items not yet due (date after asOf) their own first bucket. Default true; false counts them in the first bucket. */
  notDue?: boolean;
}

/** Group outstanding items into aging buckets. Rows keep the order in which each party first appears. */
export function ageItems(items: readonly AgingItem[], asOf: CalendarDate, options: AgingOptions = {}): AgingResult {
  const limits = options.limits ?? [30, 60, 90];
  if (limits.length === 0 || limits.some((limit, i) => !Number.isInteger(limit) || limit < 0 || (i > 0 && limit <= limits[i - 1]!))) {
    throw new RangeError('limits must be increasing non-negative whole days');
  }
  const separateNotDue = options.notDue !== false;
  const buckets: AgingBucket[] = [];
  if (separateNotDue) buckets.push({ key: 'not-due', from: Number.NEGATIVE_INFINITY, to: -1 });
  let start = 0;
  for (const limit of limits) {
    buckets.push({ key: `${start}-${limit}`, from: start, to: limit });
    start = limit + 1;
  }
  buckets.push({ key: `${limits[limits.length - 1]}+`, from: start, to: null });
  // Not yet due goes in the first bucket: its own not-due bucket, or 0–30 when notDue is false.
  const indexOf = (days: number) => (days < 0 ? 0 : buckets.findIndex((b) => b.from <= days && (b.to === null || days <= b.to)));
  const rows = new Map<string, AgingRow>();
  const totals = buckets.map(() => 0n);
  for (const item of items) {
    if (typeof item.amount !== 'bigint') throw new TypeError(`Item ${item.id}: amount must be bigint minor units`);
    const days = calendarDaysBetween(item.date, asOf);
    const index = indexOf(days);
    let row = rows.get(item.party);
    if (!row) {
      row = { party: item.party, amounts: buckets.map(() => 0n), total: 0n, items: [], oldestDays: days };
      rows.set(item.party, row);
    }
    row.amounts[index]! += item.amount;
    row.total += item.amount;
    row.items.push(item.id);
    if (days > row.oldestDays) row.oldestDays = days;
    totals[index]! += item.amount;
  }
  return { buckets, rows: [...rows.values()], totals, total: totals.reduce((a, b) => a + b, 0n) };
}
