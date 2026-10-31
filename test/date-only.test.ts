import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { NUM_RUNS } from './fc.ts';
import { parseCalendarDate, formatCalendarDate, formatDateRange } from '../src/nepal/date-only.ts';
import { getNepalFiscalPeriod, bsToGregorian } from '../src/nepal/calendar.ts';
describe('Gregorian date-only utilities', () => {
  it('validates leap days, centuries and exact syntax', () => {
    expect(parseCalendarDate('2000-02-29')).toEqual({year:2000,month:2,day:29});
    expect(parseCalendarDate('0001-01-01')).toEqual({year:1,month:1,day:1});
    for (const bad of ['1900-02-29','2023-02-29','2024-04-31','2024-00-01','2024-13-01','2024-01-00','0000-01-01','2024-1-01',' 2024-01-01','2024-01-01T00:00:00Z','२०२४-०१-०१','']) expect(parseCalendarDate(bad)).toBeNull();
  });
  it('formats explicit Gregorian parts independently of timezone', () => {
    expect(formatCalendarDate('2024-02-29')).toBe('29 Feb 2024');
    expect(formatCalendarDate({year:1,month:1,day:1})).toBe('1 Jan 1');
    const nepali = formatCalendarDate('2024-02-29',{language:'ne',digits:'deva'});
    expect(nepali).toContain('२९');
    expect(nepali).toContain('२०२४');
    expect(()=>formatCalendarDate({year:2024,month:2,day:30})).toThrow('Invalid Gregorian calendar date');
    expect(()=>formatCalendarDate({year:2024.1,month:1,day:1})).toThrow('Invalid Gregorian calendar date');
  });
  it('formats inclusive ranges and rejects reversed or invalid endpoints', () => {
    expect(formatDateRange('2024-01-01','2024-02-29')).toBe('1 Jan 2024 – 29 Feb 2024');
    expect(formatDateRange('2024-01-01','2024-01-01')).toBe('1 Jan 2024');
    expect(()=>formatDateRange('2025-01-01','2024-01-01')).toThrow('Date range start must not follow end');
    expect(()=>formatDateRange('bad','2024-01-01')).toThrow('Invalid Gregorian calendar date');
  });
  it('round trips valid generated Gregorian dates without rollover', () => {
    fc.assert(fc.property(fc.integer({min:1,max:9999}),fc.integer({min:1,max:12}),fc.integer({min:1,max:28}),(year,month,day)=>{
      const text=`${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      expect(parseCalendarDate(text)).toEqual({year,month,day});
    }),{numRuns:NUM_RUNS});
  });
});
describe('Nepal fiscal boundaries', () => {
  it('matches the independently documented FY 2078/79 anchor', () => {
    const period=getNepalFiscalPeriod({year:2078,month:4,day:1});
    expect(period.label).toBe('2078/79');
    expect(period.start.gregorian).toEqual({year:2021,month:7,day:16});
    expect(period.end.bs).toEqual({year:2079,month:3,day:32});
    expect(period.end.gregorian).toEqual({year:2022,month:7,day:16});
  });
  it('keeps both sides of the fiscal transition distinct', () => {
    expect(getNepalFiscalPeriod({year:2081,month:3,day:31}).label).toBe('2080/81');
    expect(getNepalFiscalPeriod({year:2081,month:4,day:1}).label).toBe('2081/82');
    for(let year=1975;year<2099;year++) {
      const period=getNepalFiscalPeriod({year,month:4,day:1});
      expect(bsToGregorian(period.end.bs)).toEqual(period.end.gregorian);
      const end=period.end.gregorian,next=bsToGregorian({year:year+1,month:4,day:1});
      expect(Date.UTC(next.year,next.month-1,next.day)-Date.UTC(end.year,end.month-1,end.day)).toBe(86400000);
    }
  });
  it('rejects partial years at converter coverage boundaries', () => {
    expect(()=>getNepalFiscalPeriod({year:1975,month:1,day:1})).toThrow(/range/);
    expect(()=>getNepalFiscalPeriod({year:2099,month:4,day:1})).toThrow(/range/);
  });
});
