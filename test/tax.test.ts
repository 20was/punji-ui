import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import {
  NEPALI_NUMBER_WORDS, ageItems, amountInWords, checkPan, computeIncomeTax, computeInvoice, daysBetween, formatPan, integerInWords, isValidPan,
  payslipTotals, ratePercent, summariseTds, taxableIncome, tdsToCsv, type TaxSlab,
} from '../src/tax/tax.ts';
import { NUM_RUNS } from './fc.ts';

fc.configureGlobal({ numRuns: NUM_RUNS });

const L = 100_000n * 100n; // one lakh rupees in paisa
// An example single-filer table (FY 2081/82 style). Test data, not a statement of current law.
const SINGLE: TaxSlab[] = [
  { width: 5n * L, rate: '0.01', label: 'Social security tax', waivable: true },
  { width: 2n * L, rate: '0.1' },
  { width: 3n * L, rate: '0.2' },
  { width: 10n * L, rate: '0.3' },
  { width: 30n * L, rate: '0.36' },
  { width: null, rate: '0.39' },
];

describe('amount in words', () => {
  it('reads rupees and paisa in the lakh and crore system', () => {
    expect(amountInWords(12345678n)).toBe('Rupees One Lakh Twenty-Three Thousand Four Hundred Fifty-Six and Seventy-Eight Paisa Only');
    expect(amountInWords(100n)).toBe('Rupees One Only');
    expect(amountInWords(0n)).toBe('Rupees Zero Only');
    expect(amountInWords(5n, { case: 'sentence', suffix: '' })).toBe('Rupees zero and five paisa');
    expect(amountInWords(-150000n, { case: 'lower' })).toBe('minus rupees one thousand five hundred only');
    expect(amountInWords(1234n, { scale: 0, major: 'yen', unitPosition: 'after' })).toBe('One Thousand Two Hundred Thirty-Four Yen Only');
  });

  it('names crore, arab and kharab, and goes past them by repeating kharab', () => {
    expect(integerInWords(10_000_000n)).toBe('one crore');
    expect(integerInWords(1_000_000_000n)).toBe('one arab');
    expect(integerInWords(100_000_000_000n)).toBe('one kharab');
    expect(integerInWords(120_00_00_00_00_000n)).toBe('one hundred twenty kharab');
    expect(integerInWords(1_01_01_01_101n)).toBe('one arab one crore one lakh one thousand one hundred one');
  });

  it('reads Nepali with the unit after the number', () => {
    expect(NEPALI_NUMBER_WORDS).toHaveLength(100);
    expect(new Set(NEPALI_NUMBER_WORDS).size).toBe(100);
    expect(amountInWords(150050n, { language: 'ne' })).toBe('एक हजार पाँच सय रुपैयाँ पचास पैसा मात्र');
    expect(integerInWords(2_50_00_000n, { language: 'ne' })).toBe('दुई करोड पचास लाख');
  });

  it('accepts a custom word list and refuses a short one', () => {
    const custom = Array.from({ length: 100 }, (_, i) => `n${i}`);
    expect(integerInWords(305n, { numberWords: custom })).toBe('n3 hundred n5');
    expect(() => integerInWords(1n, { numberWords: ['a'] })).toThrow(RangeError);
    expect(() => amountInWords(1 as unknown as bigint)).toThrow(TypeError);
  });

  it('never repeats a word for different amounts below one crore (property)', () => {
    fc.assert(fc.property(fc.bigInt({ min: 0n, max: 9_999_999n }), fc.bigInt({ min: 0n, max: 9_999_999n }), (a, b) => {
      fc.pre(a !== b);
      expect(integerInWords(a)).not.toBe(integerInWords(b));
    }));
  });
});

describe('PAN', () => {
  it('normalises Devanagari digits, spaces and hyphens', () => {
    expect(checkPan('१२३४५६७८९')).toEqual({ state: 'valid', value: '123456789' });
    expect(checkPan('123-456 789')).toEqual({ state: 'valid', value: '123456789' });
    expect(checkPan('')).toEqual({ state: 'empty', value: '' });
    expect(checkPan('12345')).toEqual({ state: 'partial', value: '12345' });
    expect(checkPan('12345678a')).toEqual({ state: 'invalid', value: '12345678a', reason: 'characters' });
    expect(checkPan('1234567890')).toEqual({ state: 'invalid', value: '1234567890', reason: 'length' });
    expect(isValidPan('301234567')).toBe(true);
    expect(formatPan('301234567', { digits: 'deva' })).toBe('३०१२३४५६७');
  });
});

describe('computeInvoice', () => {
  const lines = [
    { id: 'l1', quantity: 40n, rate: 285_000n },
    { id: 'l2', quantity: 25n, rate: 64_000n },
    { id: 'l3', quantity: 6n, rate: 345_000n },
    { id: 'l4', quantity: 1n, rate: 50_000n },
  ];

  it('discount, 13% VAT and total in exact paisa', () => {
    const t = computeInvoice(lines, { vatRate: '0.13', rounding: 'half-up', discount: { rate: '0.05' } });
    expect(t.subtotal).toBe(15_120_000n);
    expect(t.invoiceDiscount).toBe(756_000n);
    expect(t.taxable).toBe(14_364_000n);
    expect(t.vat).toBe(1_867_320n);
    expect(t.total).toBe(16_231_320n);
    expect(t.exempt).toBe(0n);
  });

  it('shares a fixed discount between taxable and exempt lines exactly', () => {
    const t = computeInvoice([{ id: 'a', quantity: 1n, rate: 1000n }, { id: 'b', quantity: 1n, rate: 500n, taxable: false }], { vatRate: '0.13', rounding: 'half-up', discount: { amount: 100n } });
    expect(t.taxable).toBe(933n);
    expect(t.exempt).toBe(467n);
    expect(t.vat).toBe(121n);
    expect(t.total).toBe(1521n);
  });

  it('rounds a decimal quantity with the mode given, and applies line discounts', () => {
    expect(computeInvoice([{ id: 'a', quantity: '2.5', rate: 333n }], { vatRate: '0', rounding: 'half-even' }).lines[0]!.amount).toBe(832n);
    expect(computeInvoice([{ id: 'a', quantity: '2.5', rate: 333n }], { vatRate: '0', rounding: 'half-up' }).lines[0]!.amount).toBe(833n);
    const t = computeInvoice([{ id: 'a', quantity: 2n, rate: 1000n, discount: 300n }], { vatRate: '0.13', rounding: 'half-up' });
    expect(t.lines[0]).toMatchObject({ amount: 2000n, discount: 300n, net: 1700n });
    expect(t.vat).toBe(221n);
  });

  it('refuses negative or impossible input', () => {
    const opts = { vatRate: '0.13', rounding: 'half-up' as const };
    expect(() => computeInvoice([{ id: 'a', quantity: -1n, rate: 1n }], opts)).toThrow(RangeError);
    expect(() => computeInvoice([{ id: 'a', quantity: '-1', rate: 1n }], opts)).toThrow(TypeError);
    expect(() => computeInvoice([{ id: 'a', quantity: 1n, rate: -1n }], opts)).toThrow(RangeError);
    expect(() => computeInvoice([{ id: 'a', quantity: 1n, rate: 10n, discount: 11n }], opts)).toThrow(RangeError);
    expect(() => computeInvoice([{ id: 'a', quantity: 1n, rate: 10n }], { ...opts, discount: { amount: 11n } })).toThrow(RangeError);
    expect(() => computeInvoice([{ id: 'a', quantity: 1n, rate: 10n }], { ...opts, discount: { amount: 1n, rate: '0.1' } })).toThrow(TypeError);
    expect(() => computeInvoice([{ id: 'a', quantity: 1n, rate: 1 as unknown as bigint }], opts)).toThrow(TypeError);
  });

  it('total = taxable + exempt + VAT, and taxable + exempt = subtotal − discount (property)', () => {
    const line = fc.record({ quantity: fc.bigInt({ min: 0n, max: 10_000n }), rate: fc.bigInt({ min: 0n, max: 10n ** 10n }), taxable: fc.boolean() });
    fc.assert(fc.property(fc.array(line, { minLength: 1, maxLength: 8 }), fc.integer({ min: 0, max: 100 }), fc.constantFrom('half-up', 'half-even', 'floor', 'ceil', 'trunc' as const), (raw, pct, rounding) => {
      const items = raw.map((l, i) => ({ id: String(i), ...l }));
      const t = computeInvoice(items, { vatRate: '0.13', rounding, discount: { rate: (pct / 100).toFixed(2) } });
      expect(t.total).toBe(t.taxable + t.exempt + t.vat);
      expect(t.taxable + t.exempt).toBe(t.subtotal - t.discount);
      expect(t.taxable >= 0n && t.exempt >= 0n).toBe(true);
    }));
  });

  it('writes a rate as a percent', () => {
    expect(ratePercent('0.13')).toBe('13');
    expect(ratePercent('0.015')).toBe('1.5');
    expect(ratePercent('0.125')).toBe('12.5');
    expect(ratePercent({ numerator: 1n, denominator: 3n })).toBe('33.333333');
  });
});

describe('income tax', () => {
  it('taxes 12 lakh band by band and waives the social security band when asked', () => {
    const r = computeIncomeTax(12n * L, SINGLE, { rounding: 'half-up' });
    expect(r.bands.map((b) => b.tax)).toEqual([500_000n, 2_000_000n, 6_000_000n, 6_000_000n, 0n, 0n]);
    expect(r.tax).toBe(14_500_000n);
    expect(r.marginalRate).toBe('0.3');
    expect(r.effectiveRate).toBeCloseTo(12.0833, 3);
    expect(computeIncomeTax(12n * L, SINGLE, { rounding: 'half-up', waive: true }).tax).toBe(14_000_000n);
  });

  it('applies rebates and never goes below zero', () => {
    const r = computeIncomeTax(12n * L, SINGLE, { rounding: 'half-up', rebates: [{ label: 'Rebate', rate: '0.1' }] });
    expect(r.rebates[0]!.amount).toBe(1_450_000n);
    expect(r.tax).toBe(13_050_000n);
    expect(computeIncomeTax(0n, SINGLE, { rounding: 'half-up' })).toMatchObject({ tax: 0n, effectiveRate: null, marginalRate: null });
    expect(computeIncomeTax(-5n, SINGLE, { rounding: 'half-up' }).taxable).toBe(0n);
  });

  it('refuses a bad table', () => {
    expect(() => computeIncomeTax(1n, [], { rounding: 'half-up' })).toThrow(RangeError);
    expect(() => computeIncomeTax(1n, [{ width: null, rate: '0.1' }, { width: 1n, rate: '0.2' }], { rounding: 'half-up' })).toThrow(RangeError);
    expect(() => computeIncomeTax(1n, [{ width: 0n, rate: '0.1' }], { rounding: 'half-up' })).toThrow(RangeError);
    expect(() => computeIncomeTax(1n, [{ width: null, rate: '10%' }], { rounding: 'half-up' })).toThrow(TypeError);
  });

  it('bands cover the income exactly and tax never falls as income rises (property)', () => {
    fc.assert(fc.property(fc.bigInt({ min: 0n, max: 200n * L }), fc.bigInt({ min: 0n, max: 10n * L }), (income, raise) => {
      const a = computeIncomeTax(income, SINGLE, { rounding: 'half-up' });
      expect(a.bands.reduce((s, b) => s + b.taxed, 0n)).toBe(income);
      expect(a.tax).toBe(a.bands.reduce((s, b) => s + b.tax, 0n));
      expect(computeIncomeTax(income + raise, SINGLE, { rounding: 'half-up' }).tax >= a.tax).toBe(true);
    }));
  });

  it('limits retirement contributions by the lowest of paid, cap and fraction', () => {
    const r = taxableIncome({
      income: 12n * L,
      retirement: [{ id: 'ssf', label: 'SSF', amount: 3n * L }, { id: 'cit', label: 'CIT', amount: 3n * L }],
      retirementRule: { cap: 5n * L, fraction: { numerator: 1n, denominator: 3n } },
      deductions: [{ id: 'ins', label: 'Life insurance', amount: 5_000_000n, cap: 4_000_000n }],
      rounding: 'floor',
    });
    expect(r.retirementPaid).toBe(6n * L);
    expect(r.retirementAllowed).toBe(4n * L);
    expect(r.deductions[0]!.allowed).toBe(4_000_000n);
    expect(r.taxable).toBe(12n * L - 4n * L - 4_000_000n);
    expect(taxableIncome({ income: 100n, deductions: [{ id: 'x', label: 'x', amount: 500n }], rounding: 'floor' }).taxable).toBe(0n);
    expect(() => taxableIncome({ income: 1n, deductions: [{ id: 'x', label: 'x', amount: -1n }], rounding: 'floor' })).toThrow(RangeError);
  });
});

describe('aging', () => {
  const asOf = { year: 2025, month: 11, day: 15 };
  const items = [
    { id: 'i1', party: 'Himal Traders', date: { year: 2025, month: 11, day: 20 }, amount: 10_000n },
    { id: 'i2', party: 'Himal Traders', date: { year: 2025, month: 11, day: 1 }, amount: 20_000n },
    { id: 'i3', party: 'Everest Stores', date: { year: 2025, month: 9, day: 30 }, amount: 30_000n },
    { id: 'i4', party: 'Everest Stores', date: { year: 2025, month: 8, day: 1 }, amount: 40_000n },
    { id: 'i5', party: 'Lumbini Mart', date: { year: 2025, month: 10, day: 16 }, amount: 5_000n },
  ];

  it('counts whole days across months and leap years', () => {
    expect(daysBetween({ year: 2024, month: 2, day: 28 }, { year: 2024, month: 3, day: 1 })).toBe(2);
    expect(daysBetween({ year: 2025, month: 11, day: 20 }, asOf)).toBe(-5);
  });

  it('groups by party and bucket with exact totals', () => {
    const r = ageItems(items, asOf);
    expect(r.buckets.map((b) => b.key)).toEqual(['not-due', '0-30', '31-60', '61-90', '90+']);
    expect(r.rows.map((row) => row.party)).toEqual(['Himal Traders', 'Everest Stores', 'Lumbini Mart']);
    expect(r.rows[0]!.amounts).toEqual([10_000n, 20_000n, 0n, 0n, 0n]);
    expect(r.rows[1]!.amounts).toEqual([0n, 0n, 30_000n, 0n, 40_000n]);
    expect(r.rows[2]!.amounts).toEqual([0n, 5_000n, 0n, 0n, 0n]); // Oct 16 to Nov 15 is 30 days: still 0–30
    expect(r.totals).toEqual([10_000n, 25_000n, 30_000n, 0n, 40_000n]);
    expect(r.total).toBe(105_000n);
    expect(r.rows[1]!.oldestDays).toBe(106);
  });

  it('puts not-due items in the first bucket when asked, and takes custom limits', () => {
    const r = ageItems(items, asOf, { notDue: false, limits: [15, 45] });
    expect(r.buckets.map((b) => b.key)).toEqual(['0-15', '16-45', '45+']);
    expect(r.totals.reduce((a, b) => a + b, 0n)).toBe(105_000n);
    expect(() => ageItems(items, asOf, { limits: [30, 30] })).toThrow(RangeError);
  });

  it('row totals add up to the grand total (property)', () => {
    const item = fc.record({ party: fc.constantFrom('A', 'B', 'C'), offset: fc.integer({ min: -60, max: 400 }), amount: fc.bigInt({ min: -(10n ** 9n), max: 10n ** 12n }) });
    fc.assert(fc.property(fc.array(item, { maxLength: 20 }), (raw) => {
      const list = raw.map((x, i) => {
        const d = new Date(Date.UTC(2025, 10, 15 - x.offset));
        return { id: String(i), party: x.party, amount: x.amount, date: { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() } };
      });
      const r = ageItems(list, asOf);
      expect(r.rows.reduce((s, row) => s + row.total, 0n)).toBe(r.total);
      expect(r.total).toBe(list.reduce((s, x) => s + x.amount, 0n));
      for (const row of r.rows) expect(row.amounts.reduce((a, b) => a + b, 0n)).toBe(row.total);
    }));
  });
});

describe('TDS and payslip', () => {
  const entries = [
    { id: 't1', party: 'Ram Shrestha', pan: '123456789', category: 'Rent', gross: 5_000_000n, rate: '0.1' },
    { id: 't2', party: 'Sita Builders', pan: '301234567', category: 'Contract', gross: 10_000_000n, rate: '0.015' },
    { id: 't3', party: 'Hari Consult', category: 'Service fee', gross: 2_000_000n, rate: '0.15', withheld: 100_000n },
    { id: 't4', party: '=HYPERLINK("x")', category: 'Rent', gross: 3_333_333n, rate: '0.1' },
  ];

  it('withholds per entry and sums by category', () => {
    const r = summariseTds(entries, { rounding: 'half-up' });
    expect(r.entries.map((e) => e.tds)).toEqual([500_000n, 150_000n, 100_000n, 333_333n]);
    expect(r.categories).toEqual([
      { category: 'Rent', rate: '0.1', count: 2, gross: 8_333_333n, tds: 833_333n },
      { category: 'Contract', rate: '0.015', count: 1, gross: 10_000_000n, tds: 150_000n },
      { category: 'Service fee', rate: '0.15', count: 1, gross: 2_000_000n, tds: 100_000n },
    ]);
    expect(r.totals).toEqual({ gross: 20_333_333n, tds: 1_083_333n, net: 19_250_000n });
    expect(summariseTds([{ ...entries[0]!, id: 'a' }, { ...entries[0]!, id: 'b', rate: '0.05' }], { rounding: 'half-up' }).categories[0]!.rate).toBeNull();
    expect(() => summariseTds([{ ...entries[0]!, withheld: 6_000_000n }], { rounding: 'half-up' })).toThrow(RangeError);
  });

  it('exports exact, formula-safe CSV', () => {
    const csv = tdsToCsv(entries, { rounding: 'half-up' });
    const rows = csv.split('\r\n');
    expect(rows[0]).toBe('Party,PAN,Category,Gross,Rate,TDS,Net');
    expect(rows[1]).toBe('Ram Shrestha,123456789,Rent,50000.00,0.1,5000.00,45000.00');
    expect(rows[4]!.startsWith('"\'=HYPERLINK(""x"")"')).toBe(true);
  });

  it('payslip totals, including a negative net', () => {
    expect(payslipTotals([{ id: 'b', label: 'Basic', amount: 5_000_000n }, { id: 'a', label: 'Allowance', amount: 1_000_000n }], [{ id: 's', label: 'SSF', amount: 1_100_000n }]))
      .toEqual({ gross: 6_000_000n, deductions: 1_100_000n, net: 4_900_000n });
    expect(payslipTotals([], [{ id: 'x', label: 'Advance', amount: 5n }]).net).toBe(-5n);
    expect(() => payslipTotals([{ id: 'x', label: 'x', amount: -1n }], [])).toThrow(RangeError);
  });
});
