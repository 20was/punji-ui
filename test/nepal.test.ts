import { describe, it, expect } from 'vitest';
import { formatNPR, formatNepalNumber, formatPercent, formatNepalDate, gregorianToBS, bsToGregorian, formatBSDate, nepalFiscalYear, instantToNepalDate, parseMinorUnits, minorUnitsToDecimal, sumMinorUnits } from '../src/nepal/nepal.ts';

describe('Nepal display and exact money', () => {
  it('groups lakh/crore and keeps language separate from digits', () => {
    expect(formatNPR(12345678.9)).toBe('NPR 1,23,45,678.90');
    expect(formatNPR(12345678.9, { language: 'ne', digits: 'deva' })).toBe('रु १,२३,४५,६७८.९०');
    expect(formatNPR(123, { language: 'ne' })).toBe('रु 123.00');
    expect(formatPercent(5)).toBe('5.00%');
    expect(formatNepalNumber(-0)).toBe('0.00');
    for (const value of [null, undefined, NaN, Infinity]) expect(formatNPR(value)).toBe('—');
    expect(() => formatNepalNumber(1, { fractionDigits: 21 })).toThrow(/./);
  });
  it('never loses minor units above Number.MAX_SAFE_INTEGER', () => {
    const amount = '9007199254740993.99';
    expect(minorUnitsToDecimal(parseMinorUnits(amount))).toBe(amount);
    expect(sumMinorUnits([parseMinorUnits('0.10'), parseMinorUnits('0.20')])).toBe(30n);
    expect(minorUnitsToDecimal(-1n)).toBe('-0.01');
    for (const bad of ['1.001', '1e3', '1,000', '', 'NaN', '0x10']) expect(() => parseMinorUnits(bad)).toThrow(/./);
  });
});
describe('table-backed BS calendar', () => {
  it('matches published calendar anchors and fiscal boundaries', () => {
    expect(gregorianToBS({year:2021,month:7,day:16})).toEqual({year:2078,month:4,day:1});
    expect(gregorianToBS({year:2024,month:2,day:29})).toEqual({year:2080,month:11,day:17});
    expect(nepalFiscalYear({year:2081,month:3,day:31}).label).toBe('2080/81');
    expect(nepalFiscalYear({year:2081,month:4,day:1}).label).toBe('2081/82');
    expect(formatBSDate({year:2081,month:4,day:1},{language:'ne',digits:'deva'})).toBe('१ साउन २०८१');
  });
  it('rejects invalid dates rather than rolling over', () => {
    expect(() => gregorianToBS({year:2023,month:2,day:29})).toThrow(/./);
    expect(() => bsToGregorian({year:2100,month:1,day:1})).toThrow(/./);
    expect(() => bsToGregorian({year:2080,month:1,day:32})).toThrow(/./);
    expect(() => bsToGregorian({year:2080.5,month:1,day:1})).toThrow(/./);
  });
  it('round trips every Gregorian day in the supported range', () => {
    for (let time = Date.UTC(1918,3,13); time <= Date.UTC(2043,3,13); time += 86400000) {
      const date = new Date(time), ad = { year:date.getUTCFullYear(),month:date.getUTCMonth()+1,day:date.getUTCDate() };
      expect(bsToGregorian(gregorianToBS(ad))).toEqual(ad);
    }
  });
  it('uses Kathmandu midnight, independently of host timezone', () => {
    expect(instantToNepalDate(new Date('2024-04-12T18:14:59Z'))).toEqual({year:2024,month:4,day:12});
    expect(instantToNepalDate(new Date('2024-04-12T18:15:00Z'))).toEqual({year:2024,month:4,day:13});
    expect(formatNepalDate(new Date('2024-04-12T18:15:00Z'))).toContain('13');
    expect(() => formatNepalDate(new Date(NaN))).toThrow(/./);
  });
});
