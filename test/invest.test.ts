import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import * as root from '../src/index.ts';
import { allotUnits, formatUnits, parseNav, projectLumpSum, projectSip, sipForGoal, termCoverNeeded, unitsValue, xirr, xnpv, type CashFlow } from '../src/invest/invest.ts';

const RS = 100n;

describe('xirr', () => {
  it('matches the Excel documentation example to eight places', () => {
    const flows: CashFlow[] = [
      { date: '2008-01-01', amount: -10_000n * RS },
      { date: '2008-03-01', amount: 2_750n * RS },
      { date: '2008-10-30', amount: 4_250n * RS },
      { date: '2009-02-15', amount: 3_250n * RS },
      { date: '2009-04-01', amount: 2_750n * RS },
    ];
    const r = xirr(flows)!;
    // Reference root 0.373362533518831 (bisection on doubles to 1e-15).
    expect(r.rate).toBe('0.37336253');
    expect(r.percent).toBe('37.336253');
    expect(r.numerator).toBe(37_336_253n);
    expect(r.denominator).toBe(100_000_000n);
    expect(xnpv(flows, r.rate)).toBe(0n);
  });

  it('is exactly 10% for a 10% gain over a 365-day year, and flows may come in any order', () => {
    expect(xirr([{ date: '2022-01-01', amount: 110_000n }, { date: '2021-01-01', amount: -100_000n }])!.rate).toBe('0.10000000');
    expect(xirr([{ date: { year: 2021, month: 1, day: 1 }, amount: -100_000n }, { date: '2022-01-01', amount: 100_000n }])!.rate).toBe('0.00000000');
  });

  it('finds negative rates and very high ones', () => {
    expect(xirr([{ date: '2021-01-01', amount: -100_000n }, { date: '2022-01-01', amount: 50_000n }])!.rate).toBe('-0.50000000');
    const short = xirr([{ date: '2026-01-01', amount: -100_000n }, { date: '2026-01-31', amount: 120_000n }])!;
    expect(Number(short.rate)).toBeGreaterThan(8);
    expect(xnpv([{ date: '2026-01-01', amount: -100_000n }, { date: '2026-01-31', amount: 120_000n }], short.rate)).toBe(0n);
  });

  it('honours digits and returns null without a change of sign', () => {
    expect(xirr([{ date: '2021-01-01', amount: -100_000n }, { date: '2022-01-01', amount: 110_000n }], { digits: 4 })!.percent).toBe('10.00');
    expect(xirr([{ date: '2021-01-01', amount: 100n }, { date: '2022-01-01', amount: 100n }])).toBeNull();
    expect(() => xirr([{ date: '2021-01-01', amount: -1n }])).toThrow(RangeError);
    expect(() => xirr([{ date: 'soon', amount: -1n }, { date: '2021-01-01', amount: 1n }])).toThrow(TypeError);
    expect(() => xirr([{ date: '2021-01-01', amount: -1n }, { date: '2022-01-01', amount: 2n }], { digits: 1 })).toThrow(RangeError);
  });

  it('puts the net present value at zero for monthly SIPs (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 36 }), fc.bigInt({ min: 1_000n, max: 5_000_000n }), fc.integer({ min: -40, max: 80 }), (months, monthly, pct) => {
        const flows: CashFlow[] = Array.from({ length: months }, (_, i) => ({ date: `${2020 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}-05`, amount: -monthly }));
        const invested = monthly * BigInt(months);
        const final = (invested * BigInt(100 + pct)) / 100n;
        if (final <= 0n) return;
        flows.push({ date: '2023-06-30', amount: final });
        const r = xirr(flows, { digits: 10 });
        expect(r).not.toBeNull();
        // One unit in the 10th place moves the NPV by far less than the flows' size; it rounds to zero paisa or a few.
        const npv = xnpv(flows, r!.rate);
        expect(npv < 0n ? -npv : npv).toBeLessThanOrEqual(BigInt(months));
      }),
      { numRuns: 40 },
    );
  });
});

describe('projectSip', () => {
  it('matches the closed form for a level SIP: Rs 5,000 a month, 12% for 10 years', () => {
    const p = projectSip({ monthly: 5_000n * RS, months: 120, annualReturnPercent: '12', rounding: 'half-even' });
    // P × ((1+i)^n − 1) / i × (1+i) with i = 1% gives Rs 11,61,695.38.
    expect(p.value).toBe(116_169_538n);
    expect(p.invested).toBe(60_000_000n);
    expect(p.gain).toBe(p.value - p.invested);
    expect(p.years).toHaveLength(10);
    expect(p.years.at(-1)!.value).toBe(p.value);
    expect(p.years.reduce((s, y) => s + y.invested, 0n)).toBe(p.invested);
  });

  it('steps up the instalment each year and rounds it to whole rupees', () => {
    const p = projectSip({ monthly: 3_333n * RS, months: 36, annualReturnPercent: '10', stepUpPercent: '10', roundTo: RS, rounding: 'half-up' });
    expect(p.years.map((y) => y.instalment)).toEqual([333_300n, 366_600n, 403_300n]);
    expect(p.invested).toBe((333_300n + 366_600n + 403_300n) * 12n);
    expect(p.instalments).toHaveLength(36);
  });

  it('keeps a part year as the last row and grows nothing at 0%', () => {
    const p = projectSip({ monthly: 1_000n, months: 15, annualReturnPercent: '0', rounding: 'floor' });
    expect(p.years.map((y) => y.month)).toEqual([12, 15]);
    expect(p.value).toBe(15_000n);
  });

  it('refuses bad input', () => {
    expect(() => projectSip({ monthly: -1n, months: 12, annualReturnPercent: '12', rounding: 'floor' })).toThrow(RangeError);
    expect(() => projectSip({ monthly: 1n, months: 0, annualReturnPercent: '12', rounding: 'floor' })).toThrow(RangeError);
    expect(() => projectSip({ monthly: 1n, months: 12, annualReturnPercent: 'twelve', rounding: 'floor' })).toThrow(TypeError);
  });
});

describe('projectLumpSum and sipForGoal', () => {
  it('grows a lump sum monthly at the same rate', () => {
    // Rs 6,00,000 at 1% a month for 120 months: 600000 × 1.01^120 = Rs 19,80,232.14 (half-even).
    expect(projectLumpSum({ amount: 60_000_000n, months: 120, annualReturnPercent: '12', rounding: 'half-even' }).value).toBe(198_023_214n);
  });

  it('finds the smallest instalment that reaches the goal, with and without a step-up', () => {
    const goal = 1_00_00_000n * RS; // Rs 1 crore
    for (const stepUpPercent of ['0', '10']) {
      const monthly = sipForGoal({ goal, months: 180, annualReturnPercent: '12', stepUpPercent, roundTo: RS });
      expect(monthly % RS).toBe(0n);
      expect(projectSip({ monthly, months: 180, annualReturnPercent: '12', stepUpPercent, roundTo: RS, rounding: 'half-even' }).value).toBeGreaterThanOrEqual(goal);
      expect(projectSip({ monthly: monthly - RS, months: 180, annualReturnPercent: '12', stepUpPercent, roundTo: RS, rounding: 'half-even' }).value).toBeLessThan(goal);
    }
    expect(sipForGoal({ goal: 0n, months: 12, annualReturnPercent: '8' })).toBe(0n);
  });
});

describe('units at a NAV', () => {
  it('allots units down to three places and reports the remainder', () => {
    const a = allotUnits(5_000n * RS, '12.3456');
    // 5,000 / 12.3456 = 405.00259… units, floored to 405.002; they cost 4,999.9927… rounded up to Rs 5,000.00.
    expect(a.unitsText).toBe('405.002');
    expect(a.units).toBe(405_002n);
    expect(a.cost).toBe(500_000n);
    expect(a.remainder).toBe(0n);
    expect(allotUnits(1_000n * RS, '11.1111').remainder).toBeGreaterThanOrEqual(0n);
    expect(a.cost).toBeLessThanOrEqual(5_000n * RS);
  });

  it('values units and parses NAVs strictly', () => {
    expect(unitsValue(405_002n, '13.0000')).toBe(526_503n); // 5,265.026 rounds half-even to 5,265.03
    expect(formatUnits(5n)).toBe('0.005');
    expect(formatUnits(-1_500n, 2)).toBe('-15.00');
    expect(() => parseNav('0')).toThrow(RangeError);
    expect(() => parseNav('1e3')).toThrow(TypeError);
  });

  it('never costs more than the amount (property)', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: 10_000_000_00n }), fc.integer({ min: 1_000, max: 99_999_999 }), (amount, navTenThousandths) => {
        const nav = `${Math.floor(navTenThousandths / 10_000)}.${String(navTenThousandths % 10_000).padStart(4, '0')}`;
        const a = allotUnits(amount, nav);
        expect(a.cost).toBeLessThanOrEqual(amount);
        expect(a.remainder).toBeGreaterThanOrEqual(0n);
      }),
    );
  });
});

describe('termCoverNeeded', () => {
  it('adds income, loans and goals and takes off savings and cover, rounded up to a lakh', () => {
    const LAKH = 1_00_000n * RS;
    const r = termCoverNeeded({ annualIncome: 12n * LAKH, years: 20, incomeSharePercent: '70', liabilities: 35n * LAKH, goals: 25n * LAKH, savings: 18n * LAKH, existingCover: 50n * LAKH, roundTo: LAKH });
    expect(r.incomeNeed).toBe(168n * LAKH);
    expect(r.totalNeed).toBe(228n * LAKH);
    expect(r.available).toBe(68n * LAKH);
    expect(r.gap).toBe(160n * LAKH);
    expect(r.covered).toBe(false);
    expect(termCoverNeeded({ annualIncome: LAKH, years: 1, existingCover: 2n * LAKH }).covered).toBe(true);
    expect(() => termCoverNeeded({ annualIncome: LAKH, years: 1, incomeSharePercent: '120' })).toThrow(RangeError);
  });
});

it('is exported from the root', () => {
  expect(root.xirr).toBe(xirr);
  expect(root.projectSip).toBe(projectSip);
  expect(root.termCoverNeeded).toBe(termCoverNeeded);
});
