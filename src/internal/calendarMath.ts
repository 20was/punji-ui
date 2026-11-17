/**
 * What the economic and earnings calendars share, pure: which day an event falls on in a stated time zone, how an
 * actual compares with a forecast (exact decimals), and the words for an offset. No React, no module state. Not a public
 * subpath: EconomicCalendar and EarningsCalendar re-export the parts a caller needs.
 */
import { decimalText, parseDecimal, percentText, rescale } from './exactMath.ts';

/** `YYYY-MM-DD` (a day with no time) or an ISO instant with `Z` or an offset (`2025-11-14T08:30:00+05:45`). */
export type CalendarWhen = string;

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i;

/** True for a plain day. */
export const isDayOnly = (when: CalendarWhen): boolean => DAY.test(when);

/** The epoch milliseconds of an instant, or NaN for a plain day or malformed text. */
export function instantMs(when: CalendarWhen): number {
  return INSTANT.test(when) ? Date.parse(when) : Number.NaN;
}

const dayFormats = new Map<string, Intl.DateTimeFormat>();
function dayFormat(timeZone: string): Intl.DateTimeFormat {
  let f = dayFormats.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    dayFormats.set(timeZone, f);
  }
  return f;
}

/**
 * The calendar day (`YYYY-MM-DD`) an event falls on in `timeZone`: for an instant, the day it is there; for a plain day,
 * that day. Throws a RangeError for text that is neither, or a time zone the runtime does not know.
 */
export function dayInZone(when: CalendarWhen, timeZone: string): string {
  if (DAY.test(when)) return when;
  const ms = instantMs(when);
  if (Number.isNaN(ms)) throw new RangeError(`"${when}" is not a day (YYYY-MM-DD) or an ISO time with Z or an offset`);
  return dayFormat(timeZone).format(ms);
}

export interface DayGroup<T> {
  /** `YYYY-MM-DD` in the calendar's time zone. */
  day: string;
  items: T[];
}

/**
 * Groups events by the day they fall on in `timeZone`, days ascending. Inside a day, events with no time come first, then
 * by time, then by `tie` (title). The input is not changed.
 */
export function groupCalendarByDay<T>(items: readonly T[], when: (item: T) => CalendarWhen, timeZone: string, tie: (item: T) => string = () => ''): DayGroup<T>[] {
  const keyed = items.map((item) => ({ item, day: dayInZone(when(item), timeZone), ms: instantMs(when(item)) }));
  keyed.sort((a, b) => {
    if (a.day !== b.day) return a.day < b.day ? -1 : 1;
    const am = Number.isNaN(a.ms) ? -Infinity : a.ms;
    const bm = Number.isNaN(b.ms) ? -Infinity : b.ms;
    if (am !== bm) return am < bm ? -1 : 1;
    const at = tie(a.item);
    const bt = tie(b.item);
    return at < bt ? -1 : at > bt ? 1 : 0;
  });
  const groups: DayGroup<T>[] = [];
  for (const k of keyed) {
    const last = groups[groups.length - 1];
    if (last && last.day === k.day) last.items.push(k.item);
    else groups.push({ day: k.day, items: [k.item] });
  }
  return groups;
}

/** The clock time of an instant in `timeZone` ("14:30"), 24-hour; null for a plain day. */
export function clockInZone(when: CalendarWhen, timeZone: string): string | null {
  const ms = instantMs(when);
  if (Number.isNaN(ms)) return null;
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms);
}

/**
 * The zone as people say it: the IANA name and its UTC offset on `at` ("Asia/Kathmandu, UTC+05:45"). The offset can
 * change with daylight saving, so give a day inside the span you list. Falls back to the name alone when the runtime
 * cannot give an offset, or when no day is given.
 */
export function zoneLabel(timeZone: string, at?: number | Date): string {
  if (at === undefined) return timeZone;
  try {
    const part = new Intl.DateTimeFormat('en-GB', { timeZone, timeZoneName: 'longOffset' }).formatToParts(at).find((p) => p.type === 'timeZoneName')?.value;
    const offset = part === undefined || part === 'GMT' ? 'UTC' : part.replace('GMT', 'UTC');
    return `${timeZone}, ${offset}`;
  } catch {
    return timeZone;
  }
}

export type Outcome = 'beat' | 'miss' | 'inline' | 'pending' | 'reported';

export interface Comparison {
  outcome: Outcome;
  /** `actual - forecast` at `scale` decimals; null unless both were given. */
  difference: bigint | null;
  scale: number;
  /** The difference as a percent of the size of the forecast, one place ("3.3", "-12.5"); null when there is no forecast or it is zero. */
  percent: string | null;
}

/**
 * How an actual figure compares with its forecast, exact. Both are decimal strings. `better` says which direction is good
 * news: 'higher' (the default; jobs, GDP, earnings) or 'lower' (unemployment, inflation when it overshoots, a deficit).
 *   no actual yet            -> 'pending'
 *   actual but no forecast   -> 'reported'
 *   actual equals forecast   -> 'inline'
 * A malformed number throws a RangeError.
 */
export function compareToForecast(actual: string | undefined, forecast: string | undefined, better: 'higher' | 'lower' = 'higher'): Comparison {
  const a = actual === undefined || actual === '' ? null : parseDecimal(actual);
  const f = forecast === undefined || forecast === '' ? null : parseDecimal(forecast);
  if (actual !== undefined && actual !== '' && !a) throw new RangeError(`"${actual}" is not a decimal string`);
  if (forecast !== undefined && forecast !== '' && !f) throw new RangeError(`"${forecast}" is not a decimal string`);
  if (!a) return { outcome: 'pending', difference: null, scale: 0, percent: null };
  if (!f) return { outcome: 'reported', difference: null, scale: a.scale, percent: null };
  const scale = Math.max(a.scale, f.scale);
  const av = rescale(a, scale);
  const fv = rescale(f, scale);
  const difference = av - fv;
  const size = fv < 0n ? -fv : fv;
  const percent = size > 0n ? percentText(difference, size) : null;
  const good = better === 'higher' ? difference > 0n : difference < 0n;
  return { outcome: difference === 0n ? 'inline' : good ? 'beat' : 'miss', difference, scale, percent };
}

/** "+0.2", "−1.25" (a true minus) or "0.0": the exact difference at its scale. */
export function signedDecimal(units: bigint, scale: number): string {
  if (units === 0n) return decimalText(0n, scale, scale);
  return `${units > 0n ? '+' : '−'}${decimalText(units < 0n ? -units : units, scale, scale)}`;
}

/** "+3.3%" or "−12.5%" from a percent text such as "3.3" or "-12.5". */
export function signedPercentText(percent: string): string {
  return percent.startsWith('-') ? `−${percent.slice(1)}%` : `+${percent}%`;
}

/**
 * A decimal string grouped for a locale without touching its digits: "1234567.80" -> "12,34,567.80" in en-IN. Returns the
 * input unchanged if it is not a plain decimal. Uses `Intl.NumberFormat`, which formats a string exactly.
 */
export function formatDecimalText(text: string, locale: string, options: { currency?: string } = {}): string {
  const d = parseDecimal(text);
  if (!d) return text;
  const digits = d.scale;
  const format = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits, ...(options.currency ? { style: 'currency', currency: options.currency, currencyDisplay: 'code' } : {}) });
  return format.format(decimalText(d.units, d.scale, digits) as `${number}`);
}
