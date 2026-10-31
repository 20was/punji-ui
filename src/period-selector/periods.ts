/**
 * Period lists for FinancialPeriodSelector. A period is just an id, a label and
 * optional Gregorian bounds; the selector accepts ANY list, so other
 * jurisdictions pass their own. The Nepal builders below use only the existing
 * calendar helpers: the fiscal year comes from `getNepalFiscalPeriod` (which
 * owns the Shrawan 1 rule), and months and quarters are read off that year's
 * own Bikram Sambat month starts (three consecutive months make a quarter).
 * Nothing here is a tax or filing calendar.
 */
import { bsToGregorian, getNepalFiscalPeriod, gregorianToBS } from '../nepal/calendar.ts';
import { formatCalendarDate, type CalendarDate } from '../nepal/date-only.ts';
import { formatBSDate } from '../nepal/calendar.ts';
import type { NepalLanguage } from '../nepal/locale.ts';

export interface FinancialPeriod {
  /** Unique and stable, for example 'fy-2081' or 'm-2081-04'. */
  id: string;
  /** The group it belongs to ('year', 'quarter', 'month', or your own). Two or more kinds show a kind switch. */
  kind: string;
  label: string;
  /** A second line under the picker: the range in BS and AD, for example. */
  detail?: string;
  /** Inclusive Gregorian bounds. Used to keep the same time span when the kind changes. */
  start?: CalendarDate;
  end?: CalendarDate;
}

export interface NepalPeriodOptions {
  language?: NepalLanguage;
  digits?: 'latn' | 'deva';
  /** Printed before the fiscal-year label. Default 'FY'. */
  fiscalYearPrefix?: string;
  /** Word after a BS range. Default 'BS'. */
  bsLabel?: string;
}

const dayBefore = (date: CalendarDate): CalendarDate => {
  const previous = new Date(Date.UTC(date.year, date.month - 1, date.day) - 86400000);
  return { year: previous.getUTCFullYear(), month: previous.getUTCMonth() + 1, day: previous.getUTCDate() };
};

function describe(start: CalendarDate, end: CalendarDate, options: NepalPeriodOptions): string {
  const format = { language: options.language, digits: options.digits } as const;
  return `${formatBSDate(gregorianToBS(start), format)} – ${formatBSDate(gregorianToBS(end), format)} ${options.bsLabel ?? 'BS'} · ${formatCalendarDate(start)} – ${formatCalendarDate(end)}`;
}

/** Fiscal years starting in BS years `from` to `to` inclusive (2080 is FY 2080/81). Throws outside the converter's range. */
export function nepalFiscalYearPeriods(from: number, to: number, options: NepalPeriodOptions = {}): FinancialPeriod[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || to < from) throw new RangeError('Fiscal year range must be whole years, from <= to');
  const out: FinancialPeriod[] = [];
  for (let year = from; year <= to; year++) {
    const period = getNepalFiscalPeriod({ year, month: 4, day: 1 });
    out.push({
      id: `fy-${period.startYear}`, kind: 'year', label: `${options.fiscalYearPrefix ?? 'FY'} ${period.label}`,
      detail: describe(period.start.gregorian, period.end.gregorian, options), start: period.start.gregorian, end: period.end.gregorian,
    });
  }
  return out;
}

/** The 13 month starts of a fiscal year (the 13th is the next year's first day), as BS and Gregorian dates. */
function monthStarts(startYear: number) {
  const first = getNepalFiscalPeriod({ year: startYear, month: 4, day: 1 }).start.bs;
  return Array.from({ length: 13 }, (_, index) => {
    const month = ((first.month - 1 + index) % 12) + 1;
    const year = first.year + Math.floor((first.month - 1 + index) / 12);
    const bs = { year, month, day: 1 };
    return { bs, gregorian: bsToGregorian(bs) };
  });
}

/** The 12 months of the fiscal year that starts in BS year `startYear`, labelled with the BS month name. */
export function nepalFiscalMonthPeriods(startYear: number, options: NepalPeriodOptions = {}): FinancialPeriod[] {
  const starts = monthStarts(startYear);
  return starts.slice(0, 12).map((month, index) => {
    const end = dayBefore(starts[index + 1]!.gregorian);
    const name = formatBSDate(month.bs, { language: options.language, digits: options.digits }).split(' ');
    return {
      id: `m-${startYear}-${String(index + 1).padStart(2, '0')}`, kind: 'month', label: `${name[1]} ${name[2]}`,
      detail: describe(month.gregorian, end, options), start: month.gregorian, end,
    };
  });
}

/** The four quarters (three months each) of the fiscal year that starts in BS year `startYear`. */
export function nepalFiscalQuarterPeriods(startYear: number, options: NepalPeriodOptions = {}): FinancialPeriod[] {
  const starts = monthStarts(startYear);
  const label = getNepalFiscalPeriod({ year: startYear, month: 4, day: 1 }).label;
  return [0, 1, 2, 3].map(quarter => {
    const start = starts[quarter * 3]!.gregorian;
    const end = dayBefore(starts[quarter * 3 + 3]!.gregorian);
    return { id: `q-${startYear}-${quarter + 1}`, kind: 'quarter', label: `Q${quarter + 1} ${label}`, detail: describe(start, end, options), start, end };
  });
}
