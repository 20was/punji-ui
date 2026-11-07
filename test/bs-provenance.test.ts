import { describe, expect, it } from 'vitest';
import {
  BS_OFFICIAL_THROUGH, BS_TABLE_RANGE, BS_VERIFIED_RANGE, BsProvenanceError, bsDateStatus, bsToGregorian, getNepalFiscalPeriod, gregorianToBS, toAD, toBS,
} from '../src/nepal/calendar.ts';
import { nepalDateRangePresets, nepalFiscalYearToDate, nepalLastFiscalYear, nepalPresetRange } from '../src/date-range-presets/nepal.ts';
import { nepalFiscalMonthPeriods, nepalFiscalQuarterPeriods, nepalFiscalYearPeriods } from '../src/period-selector/periods.ts';

const d = (year: number, month: number, day: number) => ({ year, month, day });
const iso = (bs: { year: number; month: number; day: number }) => {
  const g = bsToGregorian(bs);
  return `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`;
};
const OFFICIAL = d(2082, 5, 10);
const CROSS = d(2070, 5, 10);
const UNVERIFIED = d(2062, 1, 15);
const PROJECTED = d(2090, 5, 10);

describe('bsDateStatus', () => {
  it('reports the status of each band', () => {
    expect(bsDateStatus(OFFICIAL)).toBe('official');
    expect(bsDateStatus(CROSS)).toBe('cross-checked');
    expect(bsDateStatus(UNVERIFIED)).toBe('unverified');
    expect(bsDateStatus(PROJECTED)).toBe('projected');
    expect(bsDateStatus(d(1975, 1, 1))).toBe('unverified');
  });
  it('changes exactly at the official boundary and the table edges', () => {
    expect(bsDateStatus(BS_OFFICIAL_THROUGH)).toBe('official');
    expect(bsDateStatus(d(2083, 12, 1))).toBe('cross-checked');
    expect(bsDateStatus(BS_VERIFIED_RANGE.to)).toBe('cross-checked');
    expect(bsDateStatus(d(2084, 1, 1))).toBe('projected');
    expect(bsDateStatus(BS_VERIFIED_RANGE.from)).toBe('cross-checked');
    expect(bsDateStatus(d(2062, 2, 32))).toBe('unverified');
    expect(bsDateStatus(BS_TABLE_RANGE.from)).toBe('unverified');
    expect(bsDateStatus(BS_TABLE_RANGE.to)).toBe('projected');
  });
  it('throws outside the table and for invalid days', () => {
    expect(() => bsDateStatus(d(1974, 12, 30))).toThrow(RangeError);
    expect(() => bsDateStatus(d(2100, 1, 1))).toThrow(RangeError);
    expect(() => bsDateStatus(d(2080, 1, 40))).toThrow(RangeError);
  });
});

describe('toBS and toAD', () => {
  it('flag is the default and marks the result', () => {
    const projected = toAD(PROJECTED)!;
    expect(projected).toMatchObject({ status: 'projected', projected: true, verified: false });
    expect(projected.date).toEqual(bsToGregorian(PROJECTED));
    const back = toBS(projected.date)!;
    expect(back.date).toEqual(PROJECTED);
    expect(back.status).toBe('projected');
    expect(toAD(UNVERIFIED)).toMatchObject({ status: 'unverified', projected: false, verified: false });
    expect(toAD(OFFICIAL)).toMatchObject({ status: 'official', projected: false, verified: true });
    expect(toAD(CROSS)).toMatchObject({ status: 'cross-checked', projected: false, verified: true });
  });
  it('agrees with the plain converters', () => {
    expect(toBS(d(2023, 4, 14))!.date).toEqual(d(2080, 1, 1));
    expect(toBS(d(2025, 1, 1))!.date).toEqual(gregorianToBS(d(2025, 1, 1)));
  });
  it('carries the sources of the year, strongest first', () => {
    expect(toAD(OFFICIAL)!.sources[0]).toMatch(/^rajpatra:/);
    expect(toAD(CROSS)!.sources).toEqual(['hamropatro', 'rat32', 'libraries']);
    expect(toAD(PROJECTED)!.sources.length).toBeGreaterThan(0);
    expect(toAD(UNVERIFIED)!.sources.length).toBeGreaterThan(0);
  });
  it('policy throw raises a BsProvenanceError for projected and unverified, not for verified', () => {
    expect(() => toAD(PROJECTED, { policy: 'throw' })).toThrow(BsProvenanceError);
    expect(() => toAD(UNVERIFIED, { policy: 'throw' })).toThrow(/unverified/);
    expect(() => toBS(bsToGregorian(PROJECTED), { policy: 'throw' })).toThrow(BsProvenanceError);
    expect(() => toAD(PROJECTED, { policy: 'throw' })).toThrow(RangeError);
    expect(toAD(OFFICIAL, { policy: 'throw' })!.verified).toBe(true);
    expect(toAD(CROSS, { policy: 'throw' })!.verified).toBe(true);
  });
  it('policy null returns null for projected, unverified and out of range', () => {
    expect(toAD(PROJECTED, { policy: 'null' })).toBeNull();
    expect(toAD(UNVERIFIED, { policy: 'null' })).toBeNull();
    expect(toBS(bsToGregorian(PROJECTED), { policy: 'null' })).toBeNull();
    expect(toAD(OFFICIAL, { policy: 'null' })).not.toBeNull();
    expect(toAD(d(2100, 1, 1), { policy: 'null' })).toBeNull();
    expect(toBS(d(1900, 1, 1), { policy: 'null' })).toBeNull();
  });
  it('policy allow returns every month inside the table', () => {
    expect(toAD(PROJECTED, { policy: 'allow' })!.date).toEqual(bsToGregorian(PROJECTED));
    expect(toAD(UNVERIFIED, { policy: 'allow' })!.verified).toBe(false);
  });
  it('outside the table throws under flag, throw and allow and never extrapolates', () => {
    for (const policy of ['flag', 'throw', 'allow'] as const) {
      expect(() => toAD(d(2100, 1, 1), { policy })).toThrow(RangeError);
      expect(() => toAD(d(1974, 12, 30), { policy })).toThrow(RangeError);
      expect(() => toBS(d(1900, 1, 1), { policy })).toThrow(RangeError);
      expect(() => toBS(d(2200, 1, 1), { policy })).toThrow(RangeError);
    }
  });
  it('the range boundaries convert and the day after throws', () => {
    expect(toAD(BS_TABLE_RANGE.from)!.status).toBe('unverified');
    const last = toAD(BS_TABLE_RANGE.to)!;
    expect(last.status).toBe('projected');
    expect(toBS(last.date)!.date).toEqual(BS_TABLE_RANGE.to);
    expect(() => toBS(d(last.date.year, last.date.month, last.date.day + 1))).toThrow(RangeError);
  });
});

describe('fiscal year projected flags', () => {
  it('FY 2083/84 ends in a projected month today', () => {
    const period = getNepalFiscalPeriod(d(2083, 6, 1));
    expect(period.label).toBe('2083/84');
    expect(period.projected).toBe(true);
    expect(period.start.bs).toEqual(d(2083, 4, 1));
    expect(period.end.bs).toEqual(d(2084, 3, 32));
  });
  it('earlier years are not projected, later ones are', () => {
    expect(getNepalFiscalPeriod(d(2082, 4, 1)).projected).toBe(false);
    expect(getNepalFiscalPeriod(d(2080, 4, 1)).projected).toBe(false);
    expect(getNepalFiscalPeriod(d(2090, 4, 1)).projected).toBe(true);
  });
  it('period selector builders carry projected', () => {
    expect(nepalFiscalYearPeriods(2081, 2083).map(p => p.projected)).toEqual([false, false, true]);
    const months = nepalFiscalMonthPeriods(2083);
    expect(months[0]!.projected).toBe(false);
    expect(months[11]!.projected).toBe(true);
    expect(nepalFiscalQuarterPeriods(2083).map(p => p.projected)).toEqual([false, false, false, true]);
    expect(nepalFiscalQuarterPeriods(2082).every(p => p.projected === false)).toBe(true);
  });
  it('date-range presets carry projected', () => {
    const today = iso(d(2083, 8, 10));
    expect(nepalFiscalYearToDate(today).projected).toBe(false);
    expect(nepalLastFiscalYear(today).projected).toBe(false);
    const presets = nepalDateRangePresets({ today });
    expect(presets.every(p => p.projected === false && p.range.projected === false)).toBe(true);
    const future = iso(d(2084, 2, 10));
    expect(nepalFiscalYearToDate(future).projected).toBe(true);
    expect(nepalLastFiscalYear(future).projected).toBe(false);
    expect(nepalPresetRange('this-month', { today: future }).projected).toBe(true);
    expect(nepalPresetRange('this-month', { today: future, calendar: 'gregory' }).projected).toBe(true);
  });
});
