import DateConverter from '@remotemerge/nepali-date-converter';
import { BS_MONTHS, NEPAL_TIME_ZONE, type NepalLanguage } from './locale.ts';
import type { CalendarDate } from './date-only.ts';
export type { CalendarDate } from './date-only.ts';
export const BS_SUPPORTED_RANGE = { from: '1975-01-01', to: '2099-12-30' } as const;
const iso = ({ year, month, day }: CalendarDate) => {
  if (![year, month, day].every(Number.isInteger)) throw new RangeError('Calendar fields must be integers');
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
/** Strict table-backed conversion. No rollover and no fixed year/day offsets. */
export function gregorianToBS(date: CalendarDate): CalendarDate {
  const result = new DateConverter(iso(date)).toBs();
  return { year: result.year, month: result.month, day: result.date };
}
export function bsToGregorian(date: CalendarDate): CalendarDate {
  const result = new DateConverter(iso(date)).toAd();
  return { year: result.year, month: result.month, day: result.date };
}
export function instantToNepalDate(instant: Date | number): CalendarDate {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid instant');
  const parts = new Intl.DateTimeFormat('en-US', { calendar: 'gregory', numberingSystem: 'latn', timeZone: NEPAL_TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date);
  const get = (type: string) => Number(parts.find(p => p.type === type)!.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}
export function formatBSDate(date: CalendarDate, options: { language?: NepalLanguage; digits?: 'latn' | 'deva' } = {}): string {
  bsToGregorian(date); // Reject invalid/out-of-range dates before displaying them.
  const number = new Intl.NumberFormat('en', { useGrouping: false, numberingSystem: options.digits ?? 'latn' });
  return `${number.format(date.day)} ${BS_MONTHS[options.language ?? 'en'][date.month - 1]} ${number.format(date.year)}`;
}
/** Nepal fiscal year begins 1 Shrawan (BS month 4); input is a BS calendar date. */
export function nepalFiscalYear(date: CalendarDate): { startYear: number; endYear: number; label: string } {
  bsToGregorian(date);
  const startYear = date.month >= 4 ? date.year : date.year - 1;
  return { startYear, endYear: startYear + 1, label: `${startYear}/${String(startYear + 1).slice(-2)}` };
}

export interface NepalFiscalPeriod {
  startYear: number;
  endYear: number;
  label: string;
  start: { bs: CalendarDate; gregorian: CalendarDate };
  end: { bs: CalendarDate; gregorian: CalendarDate };
}
/** Inclusive fiscal boundaries for a BS date; requires the entire year within converter coverage. */
export function getNepalFiscalPeriod(bsDate: CalendarDate): NepalFiscalPeriod {
  const year = nepalFiscalYear(bsDate);
  const startBS = { year: year.startYear, month: 4, day: 1 };
  const nextBS = { year: year.endYear, month: 4, day: 1 };
  const start = bsToGregorian(startBS);
  const next = bsToGregorian(nextBS);
  // Subtract one Gregorian UTC day from the converted next-year boundary.
  // BS month lengths and conversion remain exclusively table-backed.
  const previous = new Date(Date.UTC(next.year, next.month - 1, next.day) - 86400000);
  const end = { year: previous.getUTCFullYear(), month: previous.getUTCMonth() + 1, day: previous.getUTCDate() };
  return { ...year, start: { bs: startBS, gregorian: start }, end: { bs: gregorianToBS(end), gregorian: end } };
}
