import type { NepalLanguage } from './locale.ts';
/** One-based calendar parts. Functions specify whether Gregorian or BS. */
export interface CalendarDate { year: number; month: number; day: number }
export interface CalendarDateFormatOptions {
  language?: NepalLanguage;
  digits?: 'latn' | 'deva';
  month?: 'numeric' | '2-digit' | 'short' | 'long';
}
function valid(date: CalendarDate): boolean {
  const { year, month, day } = date;
  if (![year, month, day].every(Number.isInteger) || year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
}
/** Strict Gregorian YYYY-MM-DD, ASCII digits, no timestamps or surrounding whitespace. */
export function parseCalendarDate(value: string): CalendarDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = { year: year!, month: month!, day: day! };
  return valid(date) ? date : null;
}
function requireDate(value: CalendarDate | string): CalendarDate {
  const date = typeof value === 'string' ? parseCalendarDate(value) : value;
  if (!date || !valid(date)) throw new RangeError('Invalid Gregorian calendar date');
  return date;
}
/** Formats a Gregorian date without interpreting it in the host timezone. */
export function formatCalendarDate(value: CalendarDate | string, options: CalendarDateFormatOptions = {}): string {
  const date = requireDate(value);
  const instant = new Date(0);
  // setUTCFullYear avoids Date.UTC's special handling of years 0–99.
  instant.setUTCFullYear(date.year, date.month - 1, date.day);
  return new Intl.DateTimeFormat(options.language === 'ne' ? 'ne-NP' : 'en-GB', {
    calendar: 'gregory', timeZone: 'UTC', numberingSystem: options.digits ?? 'latn',
    year: 'numeric', month: options.month ?? 'short', day: 'numeric',
  }).format(instant);
}
/** Inclusive Gregorian range. Equal endpoints print once; reversed ranges throw. */
export function formatDateRange(start: CalendarDate | string, end: CalendarDate | string, options: CalendarDateFormatOptions = {}): string {
  const a = requireDate(start), b = requireDate(end);
  const order = (date: CalendarDate) => date.year * 10000 + date.month * 100 + date.day;
  if (order(a) > order(b)) throw new RangeError('Date range start must not follow end');
  const first = formatCalendarDate(a, options);
  return order(a) === order(b) ? first : `${first} – ${formatCalendarDate(b, options)}`;
}
