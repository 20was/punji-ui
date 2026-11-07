/**
 * Date-range presets for Nepal: the fiscal year runs from 1 Shrawan (BS month 4) to the end of Asar, and in the
 * Bikram Sambat calendar "this month" is the BS month. Results are Gregorian `YYYY-MM-DD` strings like every other
 * date in the kit, converted through the table-backed `nepal/calendar`. Dates outside BS 1975 to 2099 throw a RangeError.
 */
import { bsToGregorian, getNepalFiscalPeriod, gregorianToBS, toBS } from '../nepal/calendar.ts';
import { parseCalendarDate } from '../nepal/date-only.ts';
import {
  DATE_RANGE_PRESET_LABELS, isoFromParts, presetRange, shiftDate,
  type DateRangePreset, type DateRangePresetId, type DateRangePresetListOptions, type PresetRange,
} from './presets.ts';

/** A preset range plus whether its start or end falls in a projected BS month. */
export interface NepalPresetRange extends PresetRange { projected: boolean }
/** A labelled Nepal preset; `projected` mirrors `range.projected`. */
export interface NepalDateRangePreset extends DateRangePreset { range: NepalPresetRange; projected: boolean }

export interface NepalDateRangePresetOptions extends Omit<DateRangePresetListOptions, 'fiscalYearStartMonth'> {
  /** Which calendar the month and year presets follow. 'bikram-sambat' (default): this month is the BS month and year to date starts on 1 Baisakh. 'gregory': Gregorian months. The fiscal year is Shrawan to Asar either way. */
  calendar?: 'bikram-sambat' | 'gregory';
}

function requireToday(today: string) {
  const date = parseCalendarDate(today);
  if (!date) throw new RangeError(`Not a valid YYYY-MM-DD date: ${today}`);
  return date;
}
/** A day outside the BS table is not projected, it is simply not covered; preset math that needs BS throws before that matters. */
function projectedDay(iso: string): boolean {
  const date = parseCalendarDate(iso);
  if (!date) return false;
  try { return toBS(date, { policy: 'allow' })!.projected; } catch { return false; }
}
function withProjected(range: PresetRange): NepalPresetRange {
  return { ...range, projected: projectedDay(range.start) || projectedDay(range.end) };
}
const gregorianIso = (date: { year: number; month: number; day: number }) => isoFromParts(date.year, date.month, date.day);

/** From 1 Shrawan of the current Nepal fiscal year to `today`, inclusive. */
export function nepalFiscalYearToDate(today: string): NepalPresetRange {
  const period = getNepalFiscalPeriod(gregorianToBS(requireToday(today)));
  return withProjected({ start: gregorianIso(period.start.gregorian), end: today });
}
/** The whole of the previous Nepal fiscal year, 1 Shrawan to the last day of Asar. */
export function nepalLastFiscalYear(today: string): NepalPresetRange {
  const current = getNepalFiscalPeriod(gregorianToBS(requireToday(today)));
  const before = getNepalFiscalPeriod(gregorianToBS(requireToday(shiftDate(gregorianIso(current.start.gregorian), -1))));
  return withProjected({ start: gregorianIso(before.start.gregorian), end: gregorianIso(before.end.gregorian) });
}

const monthStart = (year: number, month: number) => gregorianIso(bsToGregorian({ year, month, day: 1 }));
function bsRange(id: DateRangePresetId, options: NepalDateRangePresetOptions): PresetRange {
  const today = options.today;
  const bs = gregorianToBS(requireToday(today));
  switch (id) {
    case 'this-month': return { start: monthStart(bs.year, bs.month), end: today };
    case 'last-month': {
      const year = bs.month === 1 ? bs.year - 1 : bs.year;
      const month = bs.month === 1 ? 12 : bs.month - 1;
      return { start: monthStart(year, month), end: shiftDate(monthStart(bs.year, bs.month), -1) };
    }
    case 'this-quarter': return { start: monthStart(bs.year, Math.floor((bs.month - 1) / 3) * 3 + 1), end: today };
    case 'year-to-date': return { start: monthStart(bs.year, 1), end: today };
    default: return presetRange(id, options);
  }
}

/** The range for one preset under Nepal rules. */
export function nepalPresetRange(id: DateRangePresetId, options: NepalDateRangePresetOptions): NepalPresetRange {
  if (id === 'fiscal-year-to-date') return nepalFiscalYearToDate(options.today);
  if (id === 'last-fiscal-year') return nepalLastFiscalYear(options.today);
  return withProjected((options.calendar ?? 'bikram-sambat') === 'bikram-sambat' ? bsRange(id, options) : presetRange(id, options));
}

/** Labelled presets for Nepal: today, this week (Sunday start), this month, last 30 days and fiscal year to date by default. */
export function nepalDateRangePresets(options: NepalDateRangePresetOptions): NepalDateRangePreset[] {
  const ids = options.ids ?? ['today', 'this-week', 'this-month', 'last-30-days', 'fiscal-year-to-date'];
  const words = DATE_RANGE_PRESET_LABELS[options.language ?? 'en'];
  return ids.map((id) => {
    const range = nepalPresetRange(id, options);
    return { id, label: options.labels?.[id] ?? words[id], range, projected: range.projected };
  });
}
