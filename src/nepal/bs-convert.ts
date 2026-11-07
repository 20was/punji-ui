// Pure Bikram Sambat <-> Gregorian day-count conversion over the owned table in bs-data.ts.
// No dependency, no Date parsing, no time zones: integer day numbers (days since 1970-01-01)
// and a cumulative month index. Nothing is extrapolated; outside the table every call throws.
import { BS_ANCHOR, BS_YEARS } from './bs-data.ts';
import type { CalendarDate } from './date-only.ts';

const OUT_OF_RANGE = 'The input date is out of supported range.';
const FIRST_YEAR = BS_YEARS[0]!.year;
const LAST_YEAR = BS_YEARS[BS_YEARS.length - 1]!.year;

/** Days since 1970-01-01 for a proleptic Gregorian date (Hinnant's civil-days algorithm). */
function daysFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function civilFromDays(days: number): CalendarDate {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: yoe + era * 400 + (month <= 2 ? 1 : 0), month, day };
}

function validGregorian({ year, month, day }: CalendarDate): boolean {
  if (![year, month, day].every(Number.isInteger) || year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
}

// MONTH_START[i] = days from the first table day (FIRST_YEAR-01-01) to the start of flat month i.
const MONTH_START: number[] = [0];
for (const record of BS_YEARS) for (const days of record.months) MONTH_START.push(MONTH_START[MONTH_START.length - 1]! + days);
const TABLE_DAYS = MONTH_START[MONTH_START.length - 1]!;

const flatMonth = (year: number, month: number) => (year - FIRST_YEAR) * 12 + month - 1;
// Day index of the official anchor within the table fixes the table's first Gregorian day.
const TABLE_START_EPOCH = daysFromCivil(BS_ANCHOR.gregorian.year, BS_ANCHOR.gregorian.month, BS_ANCHOR.gregorian.day)
  - (MONTH_START[flatMonth(BS_ANCHOR.bs.year, BS_ANCHOR.bs.month)]! + BS_ANCHOR.bs.day - 1);

/** Days in a BS month from the table. Throws for months outside it. */
export function bsMonthLength(year: number, month: number): number {
  if (!Number.isInteger(year) || !Number.isInteger(month) || year < FIRST_YEAR || year > LAST_YEAR || month < 1 || month > 12) throw new RangeError(OUT_OF_RANGE);
  const index = flatMonth(year, month);
  return MONTH_START[index + 1]! - MONTH_START[index]!;
}

/** Day number (days since 1970-01-01) of a BS date. Strict: no rollover. */
export function bsToEpochDay(date: CalendarDate): number {
  const { year, month, day } = date;
  if (!Number.isInteger(day) || day < 1 || day > bsMonthLength(year, month)) throw new RangeError(OUT_OF_RANGE);
  return TABLE_START_EPOCH + MONTH_START[flatMonth(year, month)]! + day - 1;
}

/** BS date for a day number (days since 1970-01-01). Throws outside the table. */
export function epochDayToBs(epochDay: number): CalendarDate {
  const offset = epochDay - TABLE_START_EPOCH;
  if (!Number.isInteger(offset) || offset < 0 || offset >= TABLE_DAYS) throw new RangeError(OUT_OF_RANGE);
  let low = 0, high = MONTH_START.length - 2; // greatest flat month whose start <= offset
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (MONTH_START[mid]! <= offset) low = mid; else high = mid - 1;
  }
  return { year: FIRST_YEAR + Math.floor(low / 12), month: (low % 12) + 1, day: offset - MONTH_START[low]! + 1 };
}

export function gregorianToEpochDay(date: CalendarDate): number {
  if (!validGregorian(date)) throw new RangeError(OUT_OF_RANGE);
  return daysFromCivil(date.year, date.month, date.day);
}

export function epochDayToGregorian(epochDay: number): CalendarDate {
  return civilFromDays(epochDay);
}
