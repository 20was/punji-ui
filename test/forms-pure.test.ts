import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { compareDecimals, stepDecimal } from '../src/nepal/decimal.ts';
import { dateRangePresets, dayOfWeek, daysInMonth, presetRange, shiftDate } from '../src/date-range-presets/presets.ts';
import { nepalDateRangePresets, nepalFiscalYearToDate, nepalLastFiscalYear, nepalPresetRange } from '../src/date-range-presets/nepal.ts';
import { bsToGregorian, getNepalFiscalPeriod, gregorianToBS } from '../src/nepal/calendar.ts';
import { describeAccept, formatFileSize, matchesAccept, validateStatementFile } from '../src/statement-upload/validate.ts';
import { NUM_RUNS } from './fc.ts';

void NUM_RUNS;

const decimal = fc.tuple(fc.boolean(), fc.bigInt({ min: 0n, max: 10n ** 12n }), fc.integer({ min: 0, max: 4 })).map(([neg, n, scale]) => {
  const digits = n.toString().padStart(scale + 1, '0');
  const text = scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  return neg && n !== 0n ? `-${text}` : text;
});
const scaledBy = (value: string, scale: number) => {
  const neg = value.startsWith('-');
  const [w = '0', f = ''] = value.replace('-', '').split('.');
  const n = BigInt(w + f.padEnd(scale, '0'));
  return neg ? -n : n;
};

describe('exact decimal stepping', () => {
  it('adds without float error', () => {
    expect(stepDecimal('0.1', '0.2', 1)).toBe('0.3');
    expect(stepDecimal('0.3', '0.1', -1)).toBe('0.2');
    expect(stepDecimal('', '10', 1)).toBe('10');
    expect(stepDecimal('1', '0.05', 1)).toBe('1.05');
    expect(stepDecimal('0.05', '0.1', -1)).toBe('-0.05');
    expect(stepDecimal('0.1', '0.1', -1)).toBe('0.0');
  });
  it('clamps into min and max and never prints negative zero', () => {
    expect(stepDecimal('99.5', '1', 1, { max: '100' })).toBe('100.0');
    expect(stepDecimal('0', '1', -1, { min: '0' })).toBe('0');
    expect(stepDecimal('1', '5', -1, { min: '0' })).toBe('0');
    expect(stepDecimal('-0.5', '0.5', 1)).toBe('0.0');
  });
  it('rejects a step that is not positive and text that is not a plain decimal', () => {
    expect(() => stepDecimal('1', '0', 1)).toThrow(/./);
    expect(() => stepDecimal('1', '-1', 1)).toThrow(/./);
    expect(() => stepDecimal('1e3', '1', 1)).toThrow(/./);
    expect(() => compareDecimals('1,000', '1')).toThrow(/./);
  });
  it('compares across different scales', () => {
    expect(compareDecimals('1.50', '1.5')).toBe(0);
    expect(compareDecimals('-2', '-1.9')).toBe(-1);
    expect(compareDecimals('10', '9.99')).toBe(1);
  });
  it('matches bigint arithmetic for any value and step', () => {
    fc.assert(fc.property(decimal, decimal.filter((s) => !s.startsWith('-') && /[1-9]/.test(s)), fc.boolean(), (value, step, up) => {
      const scale = Math.max(value.split('.')[1]?.length ?? 0, step.split('.')[1]?.length ?? 0);
      const result = stepDecimal(value, step, up ? 1 : -1);
      expect(scaledBy(result, scale)).toBe(scaledBy(value, scale) + (up ? 1n : -1n) * scaledBy(step, scale));
      expect(result).not.toMatch(/^-0(\.0+)?$/);
    }));
  });
  it('compareDecimals agrees with bigint ordering', () => {
    fc.assert(fc.property(decimal, decimal, (a, b) => {
      const x = scaledBy(a, 4), y = scaledBy(b, 4);
      expect(compareDecimals(a, b)).toBe(x < y ? -1 : x > y ? 1 : 0);
    }));
  });
});

describe('date arithmetic', () => {
  it('shifts across month, year and leap boundaries', () => {
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDate('2024-03-01', -1)).toBe('2024-02-29');
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDate('0001-01-01', 0)).toBe('0001-01-01');
    expect(() => shiftDate('2026-02-30', 1)).toThrow(/./);
  });
  it('knows the weekday and month lengths', () => {
    expect(dayOfWeek('2026-11-01')).toBe(0);
    expect(dayOfWeek('1970-01-01')).toBe(4);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
  it('shifting by n then -n returns the date', () => {
    fc.assert(fc.property(fc.integer({ min: 1900, max: 2200 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }), fc.integer({ min: -20000, max: 20000 }), (y, m, d, n) => {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      expect(shiftDate(shiftDate(iso, n), -n)).toBe(iso);
      expect((dayOfWeek(shiftDate(iso, 7)) - dayOfWeek(iso) + 7) % 7).toBe(0);
    }));
  });
});

describe('Gregorian presets', () => {
  const today = '2026-11-04'; // a Wednesday
  it('computes inclusive to-date ranges', () => {
    expect(presetRange('today', { today })).toEqual({ start: today, end: today });
    expect(presetRange('yesterday', { today })).toEqual({ start: '2026-11-03', end: '2026-11-03' });
    expect(presetRange('this-week', { today })).toEqual({ start: '2026-11-01', end: today });
    expect(presetRange('this-week', { today, weekStartsOn: 1 })).toEqual({ start: '2026-11-02', end: today });
    expect(presetRange('last-7-days', { today })).toEqual({ start: '2026-10-29', end: today });
    expect(presetRange('last-30-days', { today })).toEqual({ start: '2026-10-06', end: today });
    expect(presetRange('this-month', { today })).toEqual({ start: '2026-11-01', end: today });
    expect(presetRange('last-month', { today })).toEqual({ start: '2026-10-01', end: '2026-10-31' });
    expect(presetRange('last-month', { today: '2026-01-15' })).toEqual({ start: '2025-12-01', end: '2025-12-31' });
    expect(presetRange('this-quarter', { today })).toEqual({ start: '2026-10-01', end: today });
    expect(presetRange('year-to-date', { today })).toEqual({ start: '2026-01-01', end: today });
  });
  it('week start on the same day gives a one-day week', () => {
    expect(presetRange('this-week', { today: '2026-11-01' })).toEqual({ start: '2026-11-01', end: '2026-11-01' });
  });
  it('fiscal year with a configurable start month', () => {
    expect(presetRange('fiscal-year-to-date', { today, fiscalYearStartMonth: 7 })).toEqual({ start: '2026-07-01', end: today });
    expect(presetRange('fiscal-year-to-date', { today: '2026-02-10', fiscalYearStartMonth: 7 })).toEqual({ start: '2025-07-01', end: '2026-02-10' });
    expect(presetRange('last-fiscal-year', { today, fiscalYearStartMonth: 4 })).toEqual({ start: '2025-04-01', end: '2026-03-31' });
    expect(() => presetRange('fiscal-year-to-date', { today })).toThrow(/./);
    expect(() => presetRange('today', { today: '2026-13-01' })).toThrow(/./);
  });
  it('builds labelled lists, in English and Nepali', () => {
    const list = dateRangePresets({ today, fiscalYearStartMonth: 7 });
    expect(list.map((p) => p.label)).toEqual(['Today', 'This week', 'This month', 'Last 30 days', 'Fiscal year to date']);
    expect(dateRangePresets({ today, ids: ['today', 'yesterday'], language: 'ne' }).map((p) => p.label)).toEqual(['आज', 'हिजो']);
    expect(dateRangePresets({ today, ids: ['today'], labels: { today: 'Aaja' } })[0]!.label).toBe('Aaja');
  });
  it('every range starts on or before its end', () => {
    fc.assert(fc.property(fc.integer({ min: 1990, max: 2090 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }), fc.integer({ min: 0, max: 6 }), (y, m, d, w) => {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      for (const p of dateRangePresets({ today: iso, weekStartsOn: w as 0, fiscalYearStartMonth: 7, ids: ['today', 'yesterday', 'this-week', 'last-7-days', 'last-30-days', 'this-month', 'last-month', 'this-quarter', 'year-to-date', 'fiscal-year-to-date', 'last-fiscal-year'] })) {
        expect(p.range.start <= p.range.end).toBe(true);
      }
    }));
  });
});

describe('Nepal presets', () => {
  // 2026-11-01 is 15 Kartik 2083 BS; the fiscal year 2083/84 began on 1 Shrawan 2083.
  const today = '2026-11-01';
  it('starts the fiscal year on 1 Shrawan', () => {
    const start = bsToGregorian({ year: 2083, month: 4, day: 1 });
    const iso = `${start.year}-${String(start.month).padStart(2, '0')}-${String(start.day).padStart(2, '0')}`;
    expect(gregorianToBS({ year: 2026, month: 11, day: 1 }).month).toBe(7);
    expect(nepalFiscalYearToDate(today)).toEqual({ start: iso, end: today });
    expect(nepalFiscalYearToDate(iso)).toEqual({ start: iso, end: iso });
  });
  it('in Asar the fiscal year is still the one that began the previous Shrawan', () => {
    const asar = bsToGregorian({ year: 2083, month: 3, day: 10 });
    const todayIso = `${asar.year}-${String(asar.month).padStart(2, '0')}-${String(asar.day).padStart(2, '0')}`;
    const range = nepalFiscalYearToDate(todayIso);
    const shrawan = bsToGregorian({ year: 2082, month: 4, day: 1 });
    expect(range.start).toBe(`${shrawan.year}-${String(shrawan.month).padStart(2, '0')}-${String(shrawan.day).padStart(2, '0')}`);
  });
  it('the last fiscal year ends the day before this one starts', () => {
    const current = nepalFiscalYearToDate(today);
    const last = nepalLastFiscalYear(today);
    expect(shiftDate(current.start, -1)).toBe(last.end);
    const period = getNepalFiscalPeriod(gregorianToBS({ year: 2025, month: 11, day: 1 }));
    expect(last.start).toBe(`${period.start.gregorian.year}-${String(period.start.gregorian.month).padStart(2, '0')}-${String(period.start.gregorian.day).padStart(2, '0')}`);
  });
  it('follows BS months by default and Gregorian months on request', () => {
    const bs = nepalPresetRange('this-month', { today });
    const monthOne = bsToGregorian({ year: 2083, month: 7, day: 1 });
    expect(bs.start).toBe(`${monthOne.year}-${String(monthOne.month).padStart(2, '0')}-${String(monthOne.day).padStart(2, '0')}`);
    expect(nepalPresetRange('this-month', { today, calendar: 'gregory' })).toEqual({ start: '2026-11-01', end: today });
    const last = nepalPresetRange('last-month', { today });
    expect(shiftDate(bs.start, -1)).toBe(last.end);
    expect(nepalPresetRange('year-to-date', { today }).start).toBe(`${bsToGregorian({ year: 2083, month: 1, day: 1 }).year}-04-14`);
  });
  it('builds the default Nepal list and rejects dates outside the converter table', () => {
    expect(nepalDateRangePresets({ today }).map((p) => p.id)).toEqual(['today', 'this-week', 'this-month', 'last-30-days', 'fiscal-year-to-date']);
    expect(nepalDateRangePresets({ today, language: 'ne', ids: ['fiscal-year-to-date'] })[0]!.label).toBe('आर्थिक वर्ष अहिलेसम्म');
    expect(() => nepalFiscalYearToDate('1800-01-01')).toThrow(/./);
  });
});

describe('statement file rules', () => {
  const rules = { accept: ['.csv', '.pdf'], maxSize: 1000 };
  it('matches extensions case-insensitively and MIME types with wildcards', () => {
    expect(matchesAccept({ name: 'Stmt.CSV', size: 1 }, ['.csv'])).toBe(true);
    expect(matchesAccept({ name: 'a.exe', size: 1 }, ['.csv'])).toBe(false);
    expect(matchesAccept({ name: 'a', size: 1, type: 'application/pdf' }, ['application/pdf'])).toBe(true);
    expect(matchesAccept({ name: 'a', size: 1, type: 'text/plain' }, ['text/*'])).toBe(true);
    expect(matchesAccept({ name: 'a', size: 1 }, ['application/pdf'])).toBe(false);
  });
  it('reports the first problem', () => {
    expect(validateStatementFile({ name: 'a.csv', size: 10 }, rules)).toBeNull();
    expect(validateStatementFile({ name: 'a.csv', size: 0 }, rules)).toBe('empty');
    expect(validateStatementFile({ name: 'a.csv', size: 1001 }, rules)).toBe('size');
    expect(validateStatementFile({ name: 'a.png', size: 10 }, rules)).toBe('type');
    expect(validateStatementFile({ name: 'a.csv', size: 1000 }, rules)).toBeNull();
  });
  it('formats sizes and accept lists', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1023)).toBe('1023 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(14540)).toBe('14.2 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
    expect(() => formatFileSize(-1)).toThrow(/./);
    expect(describeAccept(['.csv', '.pdf'])).toBe('CSV or PDF');
    expect(describeAccept(['.csv', '.pdf', '.xlsx'])).toBe('CSV, PDF or XLSX');
    expect(describeAccept(['.csv'])).toBe('CSV');
  });
});
