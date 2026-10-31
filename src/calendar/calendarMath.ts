import { bsToGregorian, gregorianToBS, BS_SUPPORTED_RANGE } from '../nepal/calendar.ts';
import { parseCalendarDate, type CalendarDate } from '../nepal/date-only.ts';
export type CalendarSystem = 'gregory' | 'bikram-sambat';
export interface DateRange { start: string; end: string | null }
export const isoDate = (date: CalendarDate): string => `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
export function requireISO(value: string): CalendarDate {
  const date = parseCalendarDate(value);
  if (!date) throw new RangeError('Expected a valid Gregorian YYYY-MM-DD date');
  return date;
}
export function dayNumber(value: string): number {
  const date = requireISO(value), utc = new Date(0);
  utc.setUTCFullYear(date.year, date.month - 1, date.day);
  return Math.floor(utc.getTime() / 86400000);
}
export function fromDayNumber(day: number): string {
  const utc = new Date(day * 86400000);
  const date = {year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate()};
  if (date.year < 1 || date.year > 9999) throw new RangeError('Date outside Gregorian year 1–9999');
  return isoDate(date);
}
export function displayParts(iso: string, system: CalendarSystem): CalendarDate {
  const date = requireISO(iso);
  return system === 'gregory' ? date : gregorianToBS(date);
}
export function storageDate(date: CalendarDate, system: CalendarSystem): string {
  const iso = isoDate(system === 'gregory' ? date : bsToGregorian(date));
  requireISO(iso);
  return iso;
}
export function calendarLimits(system: CalendarSystem): { min: string; max: string } {
  return system === 'gregory' ? {min:'0001-01-01',max:'9999-12-31'} : {
    min: storageDate({year:1975,month:1,day:1}, system),
    max: storageDate({year:2099,month:12,day:30}, system),
  };
}
/** BS month lengths are validated against the converter table, never inferred. */
export function monthLength(year: number, month: number, system: CalendarSystem): number {
  for (let day = system === 'gregory' ? 31 : 32; day >= 28; day--) {
    try { storageDate({year,month,day},system); return day; } catch { /* Try the next candidate against the calendar validator. */ }
  }
  throw new RangeError('Month outside supported calendar range');
}
export function shiftMonth(iso: string, delta: number, system: CalendarSystem): string | null {
  const current = displayParts(iso, system);
  const index = current.year * 12 + current.month - 1 + delta;
  const year = Math.floor(index / 12), month = (index % 12) + 1;
  try { return storageDate({year,month,day:Math.min(current.day,monthLength(year,month,system))},system); } catch { return null; }
}
export function rangeAvailable(start: string, end: string, unavailable?: (iso: string) => boolean): boolean {
  if (!unavailable) return true;
  for (let day = dayNumber(start), last = dayNumber(end); day <= last; day++) if (unavailable(fromDayNumber(day))) return false;
  return true;
}
export function nextRange(value: DateRange | null, day: string): DateRange {
  if (!value || value.end) return {start:day,end:null};
  return day < value.start ? {start:day,end:value.start} : {start:value.start,end:day};
}
/** Strict YYYY-MM-DD in the displayed calendar; Devanagari digits accepted. */
export function parseDateInput(text: string, system: CalendarSystem): string | null {
  const normal = text.replace(/[०-९]/g, digit => String('०१२३४५६७८९'.indexOf(digit)));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normal)) return null;
  const [year,month,day] = normal.split('-').map(Number);
  try { return storageDate({year:year!,month:month!,day:day!},system); } catch { return null; }
}
// Keep the converter's published range discoverable beside the adapter.
export { BS_SUPPORTED_RANGE };
