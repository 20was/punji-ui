import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { amortise, calculateEmi, parsePercentRate, simulateDeposit, type RoundingMode } from '../src/index.ts';
import { formatPan, idNumberToDevanagari, validateCitizenshipNumber, validateIdNumber, validatePan } from '../src/kyc/kyc.ts';
import { nepalAddressData } from '../src/nepal-address-data/data.ts';
import { NUM_RUNS } from './fc.ts';

const MODES: RoundingMode[] = ['half-even', 'half-up', 'floor', 'ceil', 'trunc'];
const lakh = (n: number) => BigInt(n) * 100_000n * 100n; // n lakh rupees in paisa

describe('parsePercentRate', () => {
  it('runs properties with the shared settings', () => expect(NUM_RUNS).toBeGreaterThan(0));
  it('parses exact percent strings and refuses anything else', () => {
    expect(parsePercentRate('11.5')).toEqual({ numerator: 115n, denominator: 10n });
    expect(parsePercentRate('0')).toEqual({ numerator: 0n, denominator: 1n });
    for (const bad of ['-1', '1e2', '11.', '.5', '1,0', '1234', '1.1234567', ' 5']) expect(() => parsePercentRate(bad)).toThrow(TypeError);
  });
});

describe('calculateEmi', () => {
  it('matches the textbook figure: 10 lakh at 10% for 10 years is NPR 13,215.07', () => {
    expect(calculateEmi({ principal: lakh(10), ratePercent: '10', months: 120, rounding: 'half-up' })).toBe(1_321_507n);
  });
  it('rounds with the mode and to whole rupees on request', () => {
    const exact = calculateEmi({ principal: lakh(25), ratePercent: '11.5', months: 240, rounding: 'floor' });
    const up = calculateEmi({ principal: lakh(25), ratePercent: '11.5', months: 240, rounding: 'ceil' });
    expect(up - exact).toBeLessThanOrEqual(1n);
    const rupee = calculateEmi({ principal: lakh(25), ratePercent: '11.5', months: 240, rounding: 'ceil', roundTo: 100n });
    expect(rupee % 100n).toBe(0n);
    expect(rupee >= up).toBe(true);
  });
  it('splits a zero-rate loan evenly', () => {
    expect(calculateEmi({ principal: 120_000n, ratePercent: '0', months: 12, rounding: 'half-even' })).toBe(10_000n);
  });
  it('rejects bad input', () => {
    expect(() => calculateEmi({ principal: 0n, ratePercent: '10', months: 12, rounding: 'floor' })).toThrow(RangeError);
    expect(() => calculateEmi({ principal: 10n, ratePercent: '10', months: 0, rounding: 'floor' })).toThrow(RangeError);
    expect(() => calculateEmi({ principal: 10n, ratePercent: '10', months: 601, rounding: 'floor' })).toThrow(RangeError);
    expect(() => calculateEmi({ principal: 10n, ratePercent: '10', months: 12, rounding: 'floor', roundTo: 0n })).toThrow(RangeError);
  });
});

describe('amortise', () => {
  it('builds a schedule whose principal sums to the loan and ends at zero', () => {
    const s = amortise({ principal: lakh(10), ratePercent: '10', months: 120, rounding: 'half-up' });
    expect(s.rows).toHaveLength(120);
    expect(s.rows[0]).toMatchObject({ period: 1, opening: lakh(10), interest: 833_333n, payment: 1_321_507n, principal: 488_174n });
    expect(s.rows.at(-1)!.closing).toBe(0n);
    expect(s.rows.reduce((a, r) => a + r.principal, 0n)).toBe(lakh(10));
    expect(s.totalPaid).toBe(lakh(10) + s.totalInterest);
  });
  it('holds the invariants for any loan and rounding mode', () => {
    fc.assert(fc.property(
      fc.bigInt({ min: 10_000n, max: 10n ** 11n }), fc.integer({ min: 0, max: 2500 }), fc.integer({ min: 1, max: 360 }), fc.constantFrom(...MODES),
      (principal, bp, months, rounding) => {
        const ratePercent = (bp / 100).toFixed(2);
        const s = amortise({ principal, ratePercent, months, rounding });
        expect(s.rows.length).toBeLessThanOrEqual(months);
        expect(s.rows.at(-1)!.closing).toBe(0n);
        expect(s.rows.reduce((a, r) => a + r.principal, 0n)).toBe(principal);
        for (const r of s.rows) {
          expect(r.payment).toBe(r.interest + r.principal);
          expect(r.closing).toBe(r.opening - r.principal - r.prepayment);
          expect(r.principal >= 0n).toBe(true);
        }
      },
    ));
  });
  it('a prepayment that shortens the tenure saves interest and instalments', () => {
    const base = amortise({ principal: lakh(20), ratePercent: '12', months: 120, rounding: 'half-up' });
    const pre = amortise({ principal: lakh(20), ratePercent: '12', months: 120, rounding: 'half-up', prepayments: [{ period: 12, amount: lakh(5) }] });
    expect(pre.totalPrepaid).toBe(lakh(5));
    expect(pre.rows[11]!.prepayment).toBe(lakh(5));
    expect(pre.periods).toBeLessThan(base.periods);
    expect(pre.totalInterest < base.totalInterest).toBe(true);
    expect(pre.rows[12]!.payment).toBe(base.emi);
    expect(pre.rows.reduce((a, r) => a + r.principal + r.prepayment, 0n)).toBe(lakh(20));
  });
  it('a prepayment that lowers the instalment keeps the end date', () => {
    const pre = amortise({ principal: lakh(20), ratePercent: '12', months: 120, rounding: 'half-up', prepayments: [{ period: 12, amount: lakh(5) }], strategy: 'reduce-emi' });
    expect(pre.periods).toBe(120);
    expect(pre.rows[12]!.payment < pre.emi).toBe(true);
    expect(pre.rows.at(-1)!.closing).toBe(0n);
  });
  it('caps a prepayment at the balance and closes the loan', () => {
    const s = amortise({ principal: 100_000n, ratePercent: '10', months: 12, rounding: 'half-up', prepayments: [{ period: 3, amount: 10n ** 9n }] });
    expect(s.periods).toBe(3);
    expect(s.rows[2]!.closing).toBe(0n);
    expect(s.totalPrepaid).toBe(s.rows[2]!.prepayment);
  });
});

describe('simulateDeposit', () => {
  it('compounds a fixed deposit quarterly: 1 lakh at 10% for a year is NPR 1,10,381.29', () => {
    const r = simulateDeposit({ principal: lakh(1), months: 12, ratePercent: '10', compounding: 'quarterly', rounding: 'half-up' });
    expect(r.credits.map((c) => c.interest)).toEqual([250_000n, 256_250n, 262_656n, 269_223n]);
    expect(r.maturity).toBe(11_038_129n);
    expect(r.totalTds).toBe(0n);
  });
  it('deducts TDS from each credit and compounds the net', () => {
    const r = simulateDeposit({ principal: lakh(1), months: 12, ratePercent: '10', tdsPercent: '6', rounding: 'half-up' });
    expect(r.credits[0]).toMatchObject({ interest: 250_000n, tds: 15_000n, net: 235_000n, closing: lakh(1) + 235_000n });
    expect(r.netInterest).toBe(r.grossInterest - r.totalTds);
    expect(r.maturity).toBe(r.totalDeposited + r.netInterest);
  });
  it('pays out interest on a non-cumulative deposit', () => {
    const r = simulateDeposit({ principal: lakh(1), months: 12, ratePercent: '10', tdsPercent: '6', payout: 'pay-out', rounding: 'half-up' });
    expect(r.maturity).toBe(lakh(1));
    expect(r.paidOut).toBe(4n * 235_000n);
  });
  it('pays simple interest at maturity', () => {
    expect(simulateDeposit({ principal: lakh(1), months: 12, ratePercent: '10', compounding: 'at-maturity', rounding: 'half-up' }).grossInterest).toBe(1_000_000n);
  });
  it('accrues a recurring deposit month by month', () => {
    const r = simulateDeposit({ monthlyDeposit: 100_000n, months: 12, ratePercent: '12', compounding: 'quarterly', rounding: 'half-up' });
    expect(r.totalDeposited).toBe(1_200_000n);
    expect(r.credits[0]).toMatchObject({ month: 3, deposited: 300_000n, interest: 6_000n });
    expect(r.credits).toHaveLength(4);
  });
  it('credits a final partial period', () => {
    const r = simulateDeposit({ principal: lakh(1), months: 7, ratePercent: '12', compounding: 'quarterly', rounding: 'floor' });
    expect(r.credits.map((c) => c.month)).toEqual([3, 6, 7]);
  });
  it('conserves money for any deposit', () => {
    fc.assert(fc.property(
      fc.bigInt({ min: 0n, max: 10n ** 10n }), fc.bigInt({ min: 0n, max: 10n ** 8n }), fc.integer({ min: 1, max: 120 }), fc.integer({ min: 0, max: 1500 }),
      fc.constantFrom('monthly', 'quarterly', 'half-yearly', 'yearly', 'at-maturity' as const), fc.constantFrom(...MODES), fc.integer({ min: 0, max: 100 }),
      (principal, monthlyDeposit, months, bp, compounding, rounding, tds) => {
        fc.pre(principal > 0n || monthlyDeposit > 0n);
        const r = simulateDeposit({ principal, monthlyDeposit, months, ratePercent: (bp / 100).toFixed(2), compounding, rounding, tdsPercent: String(tds) });
        expect(r.totalDeposited).toBe(principal + monthlyDeposit * BigInt(months));
        expect(r.maturity).toBe(r.totalDeposited + r.netInterest);
        for (const c of r.credits) { expect(c.net).toBe(c.interest - c.tds); expect(c.tds <= c.interest).toBe(true); }
      },
    ));
  });
  it('rejects bad input', () => {
    expect(() => simulateDeposit({ months: 12, ratePercent: '10', rounding: 'floor' })).toThrow(RangeError);
    expect(() => simulateDeposit({ principal: 1n, months: 12, ratePercent: '10', tdsPercent: '101', rounding: 'floor' })).toThrow(RangeError);
    expect(() => simulateDeposit({ principal: -1n, months: 12, ratePercent: '10', rounding: 'floor' })).toThrow(RangeError);
  });
});

describe('KYC number checks', () => {
  it('validates a PAN: nine digits, Devanagari accepted', () => {
    expect(validatePan('301234567')).toEqual({ state: 'valid', value: '301234567' });
    expect(validatePan('३०१ २३४ ५६७')).toEqual({ state: 'valid', value: '301234567' });
    expect(validatePan('')).toEqual({ state: 'empty', value: '' });
    expect(validatePan('30123456')).toMatchObject({ state: 'invalid', reason: 'length' });
    expect(validatePan('30123456A')).toMatchObject({ state: 'invalid', reason: 'characters' });
    expect(formatPan('301234567')).toBe('301 234 567');
  });
  it('validates a citizenship number as printed', () => {
    expect(validateCitizenshipNumber('27-01-71-02345')).toEqual({ state: 'valid', value: '27-01-71-02345' });
    expect(validateCitizenshipNumber('१२३४/५६७८')).toEqual({ state: 'valid', value: '1234/5678' });
    expect(validateCitizenshipNumber('27 01 71')).toEqual({ state: 'valid', value: '27-01-71' });
    expect(validateCitizenshipNumber('27--01')).toMatchObject({ state: 'invalid', reason: 'format' });
    expect(validateCitizenshipNumber('12')).toMatchObject({ state: 'invalid', reason: 'length' });
    expect(validateCitizenshipNumber('AB-12')).toMatchObject({ state: 'invalid', reason: 'characters' });
    expect(validateIdNumber('pan', '123')).toMatchObject({ state: 'invalid' });
    expect(idNumberToDevanagari('27-01')).toBe('२७-०१');
  });
});

describe('Nepal address data', () => {
  it('has 7 provinces, 77 districts and 753 local levels with the official counts by type and province', () => {
    const { provinces, districts, localLevels } = nepalAddressData;
    expect([provinces.length, districts.length, localLevels.length]).toEqual([7, 77, 753]);
    const byType: Record<string, number> = {};
    for (const l of localLevels) byType[l.type] = (byType[l.type] ?? 0) + 1;
    expect(byType).toEqual({ metropolitan: 6, 'sub-metropolitan': 11, municipality: 276, 'rural-municipality': 460 });
    const byProvince = provinces.map((p) => localLevels.filter((l) => districts[l.districtId - 1]!.provinceId === p.id).length);
    expect(byProvince).toEqual([137, 136, 119, 85, 109, 79, 88]);
    expect(new Set(localLevels.map((l) => l.id)).size).toBe(753);
    expect(localLevels.filter((l) => l.type === 'metropolitan').map((l) => l.name).toSorted()).toEqual(['Bharatpur', 'Biratnagar', 'Birgunj', 'Kathmandu', 'Lalitpur', 'Pokhara']);
  });
});
