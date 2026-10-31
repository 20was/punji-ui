/**
 * Date-range presets as pure functions over civil dates. Every date is a Gregorian `YYYY-MM-DD` string, the same
 * contract as DatePicker and Calendar: no `Date`, no host timezone. The caller supplies `today` (in the business
 * timezone, for example from instantToNepalDate), so the same input always gives the same ranges on server and client.
 * Ranges are inclusive and "to date": This week, This month and Year to date end today, because a statement for the
 * future has nothing in it. Nepal's Bikram Sambat fiscal year lives in `@punji/ui/date-range-presets/nepal`.
 */
import { parseCalendarDate } from '../nepal/date-only.ts';

export type DateRangePresetId =
  | 'today' | 'yesterday' | 'this-week' | 'last-7-days' | 'last-30-days'
  | 'this-month' | 'last-month' | 'this-quarter' | 'year-to-date'
  | 'fiscal-year-to-date' | 'last-fiscal-year';

/** An inclusive range of civil dates. */
export interface PresetRange { start: string; end: string }

export interface DateRangePreset {
  /** Which preset this is. */
  id: DateRangePresetId;
  /** The words on the button. */
  label: string;
  /** The inclusive range, as Gregorian civil dates. */
  range: PresetRange;
}

export interface DateRangePresetOptions {
  /** Today's civil date, `YYYY-MM-DD`. Required: presets never read the clock. */
  today: string;
  /** First day of the week, Sunday 0 through Saturday 6. Default 0 (Sunday, Nepal's week). */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Gregorian month (1 to 12) in which the fiscal year starts: 4 for April, 7 for July. Needed for the fiscal ids. */
  fiscalYearStartMonth?: number;
}

export interface DateRangePresetListOptions extends DateRangePresetOptions {
  /** Which presets, in this order. Default: today, this-week, this-month, last-30-days, plus fiscal-year-to-date when `fiscalYearStartMonth` is set. */
  ids?: readonly DateRangePresetId[];
  /** Label language. Default 'en'. */
  language?: 'en' | 'ne';
  /** Replace any label. */
  labels?: Partial<Record<DateRangePresetId, string>>;
}

export const DATE_RANGE_PRESET_LABELS: Record<'en' | 'ne', Record<DateRangePresetId, string>> = {
  en: {
    today: 'Today', yesterday: 'Yesterday', 'this-week': 'This week', 'last-7-days': 'Last 7 days', 'last-30-days': 'Last 30 days',
    'this-month': 'This month', 'last-month': 'Last month', 'this-quarter': 'This quarter', 'year-to-date': 'Year to date',
    'fiscal-year-to-date': 'Fiscal year to date', 'last-fiscal-year': 'Last fiscal year',
  },
  ne: {
    today: 'आज', yesterday: 'हिजो', 'this-week': 'यो हप्ता', 'last-7-days': 'पछिल्लो ७ दिन', 'last-30-days': 'पछिल्लो ३० दिन',
    'this-month': 'यो महिना', 'last-month': 'गत महिना', 'this-quarter': 'यो त्रैमासिक', 'year-to-date': 'यो वर्ष अहिलेसम्म',
    'fiscal-year-to-date': 'आर्थिक वर्ष अहिलेसम्म', 'last-fiscal-year': 'गत आर्थिक वर्ष',
  },
};

const pad = (n: number, width: number) => String(n).padStart(width, '0');
/** `YYYY-MM-DD` from parts. */
export function isoFromParts(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}
// Days since 1970-01-01 and back (proleptic Gregorian), integer arithmetic only.
function toDays(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy - 719468;
}
function fromDays(days: number): string {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return isoFromParts(yoe + era * 400 + (month <= 2 ? 1 : 0), month, day);
}
function requireDay(value: string): { year: number; month: number; day: number } {
  const date = parseCalendarDate(value);
  if (!date) throw new RangeError(`Not a valid YYYY-MM-DD date: ${value}`);
  return date;
}
/** Moves a civil date by whole days (negative goes back). Throws on an invalid date. */
export function shiftDate(value: string, days: number): string {
  const { year, month, day } = requireDay(value);
  return fromDays(toDays(year, month, day) + days);
}
/** Day of the week for a civil date: Sunday 0 through Saturday 6. */
export function dayOfWeek(value: string): number {
  const { year, month, day } = requireDay(value);
  return (((toDays(year, month, day) + 4) % 7) + 7) % 7;
}
/** Days in a Gregorian month. */
export function daysInMonth(year: number, month: number): number {
  return toDays(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1) - toDays(year, month, 1);
}

function fiscalStart(today: { year: number; month: number }, startMonth: number | undefined): { year: number; month: number } {
  if (startMonth === undefined || !Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12) {
    throw new RangeError('fiscalYearStartMonth (1 to 12) is required for the fiscal presets');
  }
  return { year: today.month >= startMonth ? today.year : today.year - 1, month: startMonth };
}

/** The range for one preset, inclusive, relative to `today`. */
export function presetRange(id: DateRangePresetId, options: DateRangePresetOptions): PresetRange {
  const today = options.today;
  const parts = requireDay(today);
  switch (id) {
    case 'today': return { start: today, end: today };
    case 'yesterday': { const day = shiftDate(today, -1); return { start: day, end: day }; }
    case 'this-week': {
      const back = (dayOfWeek(today) - (options.weekStartsOn ?? 0) + 7) % 7;
      return { start: shiftDate(today, -back), end: today };
    }
    case 'last-7-days': return { start: shiftDate(today, -6), end: today };
    case 'last-30-days': return { start: shiftDate(today, -29), end: today };
    case 'this-month': return { start: isoFromParts(parts.year, parts.month, 1), end: today };
    case 'last-month': {
      const year = parts.month === 1 ? parts.year - 1 : parts.year;
      const month = parts.month === 1 ? 12 : parts.month - 1;
      return { start: isoFromParts(year, month, 1), end: isoFromParts(year, month, daysInMonth(year, month)) };
    }
    case 'this-quarter': return { start: isoFromParts(parts.year, Math.floor((parts.month - 1) / 3) * 3 + 1, 1), end: today };
    case 'year-to-date': return { start: isoFromParts(parts.year, 1, 1), end: today };
    case 'fiscal-year-to-date': {
      const start = fiscalStart(parts, options.fiscalYearStartMonth);
      return { start: isoFromParts(start.year, start.month, 1), end: today };
    }
    case 'last-fiscal-year': {
      const start = fiscalStart(parts, options.fiscalYearStartMonth);
      return { start: isoFromParts(start.year - 1, start.month, 1), end: shiftDate(isoFromParts(start.year, start.month, 1), -1) };
    }
  }
}

/** Labelled presets ready for `DateRangePicker`'s `presets` prop. */
export function dateRangePresets(options: DateRangePresetListOptions): DateRangePreset[] {
  const ids = options.ids ?? ['today', 'this-week', 'this-month', 'last-30-days', ...(options.fiscalYearStartMonth === undefined ? [] : (['fiscal-year-to-date'] as const))];
  const words = DATE_RANGE_PRESET_LABELS[options.language ?? 'en'];
  return ids.map((id) => ({ id, label: options.labels?.[id] ?? words[id], range: presetRange(id, options) }));
}
