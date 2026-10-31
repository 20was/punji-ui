import * as fc from 'fast-check';
import { NUM_RUNS } from './fc.ts';
import { describe, it, expect } from 'vitest';
import {
  allocation, applyRate, breakEvenPrice, cagr, computePosition, divideRounded, dividendYield, parseRate,
  percentageChange, priceChange, returnOnCost, taxOnGain, valuePosition, weightedAverage,
  type RoundingMode, type Trade,
} from '../src/calculations/calculations.ts';

const MODES: RoundingMode[] = ['half-even', 'half-up', 'floor', 'ceil', 'trunc'];

describe('divideRounded', () => {
  it('runs properties with the shared settings', () => expect(NUM_RUNS).toBeGreaterThan(0));
  it.each([
    [5n, 2n, { 'half-even': 2n, 'half-up': 3n, floor: 2n, ceil: 3n, trunc: 2n }],
    [-5n, 2n, { 'half-even': -2n, 'half-up': -3n, floor: -3n, ceil: -2n, trunc: -2n }],
    [7n, 2n, { 'half-even': 4n, 'half-up': 4n, floor: 3n, ceil: 4n, trunc: 3n }],
    [-7n, 2n, { 'half-even': -4n, 'half-up': -4n, floor: -4n, ceil: -3n, trunc: -3n }],
    [1n, 3n, { 'half-even': 0n, 'half-up': 0n, floor: 0n, ceil: 1n, trunc: 0n }],
    [2n, 3n, { 'half-even': 1n, 'half-up': 1n, floor: 0n, ceil: 1n, trunc: 0n }],
    [5n, -2n, { 'half-even': -2n, 'half-up': -3n, floor: -3n, ceil: -2n, trunc: -2n }],
  ])('%s / %s', (n, d, expected) => {
    for (const mode of MODES) expect(divideRounded(n, d, mode)).toBe(expected[mode]);
  });
  it('rejects division by zero and unknown modes', () => {
    expect(() => divideRounded(1n, 0n, 'floor')).toThrow(RangeError);
    expect(() => divideRounded(1n, 3n, 'up' as RoundingMode)).toThrow(RangeError);
  });
  it('stays within one unit of the true quotient and brackets it with floor/ceil', () => {
    fc.assert(fc.property(fc.bigInt({ min: -(10n ** 24n), max: 10n ** 24n }), fc.bigInt({ min: 1n, max: 10n ** 12n }), (n, d) => {
      const floor = divideRounded(n, d, 'floor'), ceil = divideRounded(n, d, 'ceil');
      expect(floor * d <= n && n <= ceil * d).toBe(true);
      expect(ceil - floor <= 1n).toBe(true);
      for (const mode of MODES) { const r = divideRounded(n, d, mode); expect(r === floor || r === ceil).toBe(true); }
    }));
  });
});

describe('rates', () => {
  it('parses decimal fractions exactly and applies them', () => {
    expect(parseRate('0.00015')).toEqual({ numerator: 15n, denominator: 100000n });
    expect(applyRate(1234567n, '0.0027', 'half-up')).toBe(3333n); // 3333.33
    expect(applyRate(100n, '0.005', 'half-even')).toBe(0n); // 0.5 → even
    expect(applyRate(300n, '0.005', 'half-even')).toBe(2n); // 1.5 → even
    for (const bad of ['-0.1', '1e-3', '.5', '0.5%', '']) expect(() => parseRate(bad)).toThrow(TypeError);
  });
  it('taxes only positive gains under the caller rule', () => {
    expect(taxOnGain(1_000_000n, { rate: '0.075', rounding: 'half-up' })).toBe(75_000n);
    expect(taxOnGain(1n, { rate: '0.075', rounding: 'ceil' })).toBe(1n);
    expect(taxOnGain(0n, { rate: '0.5', rounding: 'ceil' })).toBe(0n);
    expect(taxOnGain(-500n, { rate: '0.5', rounding: 'ceil' })).toBe(0n);
  });
});

const trades: Trade[] = [
  { side: 'buy', quantity: 100n, price: 50_000n, fees: 1_000n },
  { side: 'buy', quantity: 100n, price: 60_000n, fees: 1_200n },
  { side: 'sell', quantity: 50n, price: 70_000n, fees: 900n },
];

describe('computePosition', () => {
  it('pools cost under the weighted-average method', () => {
    const position = computePosition(trades, { method: 'average', rounding: 'half-even' });
    expect(position).toMatchObject({ quantity: 150n, costBasis: 8_251_650n, realisedPnL: 748_550n, totalFees: 3_100n, averageCost: 55_011n });
    expect(position.lots).toEqual([{ quantity: 150n, cost: 8_251_650n }]);
  });
  it('consumes the oldest lots first under FIFO', () => {
    const position = computePosition(trades, { method: 'fifo', rounding: 'half-even' });
    expect(position).toMatchObject({ quantity: 150n, costBasis: 8_501_700n, realisedPnL: 998_600n });
    expect(position.lots).toEqual([{ quantity: 50n, cost: 2_500_500n }, { quantity: 100n, cost: 6_001_200n }]);
  });
  it('treats bonus shares as zero-cost buys and closes out exactly', () => {
    const position = computePosition([
      { side: 'buy', quantity: 10n, price: 100_00n },
      { side: 'buy', quantity: 3n, price: 0n },
      { side: 'sell', quantity: 13n, price: 100_00n },
    ], { method: 'average', rounding: 'half-even' });
    expect(position).toMatchObject({ quantity: 0n, costBasis: 0n, averageCost: null, realisedPnL: 3n * 100_00n, lots: [] });
  });
  it('rejects oversells and malformed trades with the trade index', () => {
    expect(() => computePosition([{ side: 'sell', quantity: 1n, price: 1n }], { method: 'fifo', rounding: 'floor' })).toThrow('Trade 0: sells 1 but only 0 held');
    expect(() => computePosition([{ side: 'buy', quantity: 0n, price: 1n }], { method: 'fifo', rounding: 'floor' })).toThrow(RangeError);
    expect(() => computePosition([{ side: 'buy', quantity: 1n, price: -1n }], { method: 'fifo', rounding: 'floor' })).toThrow(RangeError);
    expect(() => computePosition([{ side: 'buy', quantity: 1n, price: 1n, fees: -1n }], { method: 'fifo', rounding: 'floor' })).toThrow(RangeError);
  });

  const tradeLists = fc.array(fc.record({
    buy: fc.boolean(), quantity: fc.bigInt({ min: 1n, max: 10_000n }), price: fc.bigInt({ min: 0n, max: 10n ** 9n }), fees: fc.bigInt({ min: 0n, max: 10n ** 6n }),
  }), { maxLength: 30 }).map(raw => {
    // Clamp sells to the units held so every generated list is valid.
    let held = 0n;
    const list: Trade[] = [];
    for (const { buy, quantity, price, fees } of raw) {
      if (buy) { held += quantity; list.push({ side: 'buy', quantity, price, fees }); }
      else if (held > 0n) { const q = quantity > held ? held : quantity; held -= q; list.push({ side: 'sell', quantity: q, price, fees }); }
    }
    return list;
  });

  it('conserves cost: open cost + cost removed by sells = cost bought, for every method and rounding', () => {
    fc.assert(fc.property(tradeLists, fc.constantFrom<'average' | 'fifo'>('average', 'fifo'), fc.constantFrom(...MODES), (list, method, rounding) => {
      const p = computePosition(list, { method, rounding });
      const bought = list.filter(t => t.side === 'buy').reduce((s, t) => s + t.quantity * t.price + (t.fees ?? 0n), 0n);
      const netSales = list.filter(t => t.side === 'sell').reduce((s, t) => s + t.quantity * t.price - (t.fees ?? 0n), 0n);
      expect(p.costBasis + netSales - p.realisedPnL).toBe(bought);
      expect(p.lots.reduce((s, l) => s + l.quantity, 0n)).toBe(p.quantity);
      expect(p.costBasis >= 0n).toBe(true);
    }));
  });
  it('gives the same lifetime P&L for both methods once flat', () => {
    fc.assert(fc.property(tradeLists, list => {
      const held = list.reduce((s, t) => s + (t.side === 'buy' ? t.quantity : -t.quantity), 0n);
      const closed = held > 0n ? [...list, { side: 'sell' as const, quantity: held, price: 12_345n }] : list;
      const average = computePosition(closed, { method: 'average', rounding: 'half-even' });
      const fifo = computePosition(closed, { method: 'fifo', rounding: 'floor' });
      expect(average.realisedPnL).toBe(fifo.realisedPnL);
      expect(average.costBasis).toBe(0n);
    }));
  });
});

describe('valuation and break-even', () => {
  it('marks to market', () => {
    expect(valuePosition({ quantity: 150n, costBasis: 8_251_650n }, 60_000n)).toEqual({ marketValue: 9_000_000n, unrealisedPnL: 748_350n });
    expect(() => valuePosition({ quantity: 1n, costBasis: 1n }, -1n)).toThrow(RangeError);
  });
  it('returns the minimal price that recovers cost after proportional selling costs', () => {
    expect(breakEvenPrice(8_251_650n, 150n)).toBe(55_011n);
    expect(breakEvenPrice(10n, 3n)).toBe(4n);
    expect(breakEvenPrice(10n, 0n)).toBeNull();
    expect(() => breakEvenPrice(10n, 1n, { sellRate: '1' })).toThrow(RangeError);
    fc.assert(fc.property(fc.bigInt({ min: 0n, max: 10n ** 12n }), fc.bigInt({ min: 1n, max: 10n ** 6n }), fc.constantFrom('0', '0.004', '0.0115', '0.00015'), (cost, quantity, sellRate) => {
      const price = breakEvenPrice(cost, quantity, { sellRate })!;
      const { numerator, denominator } = parseRate(sellRate);
      const net = (p: bigint) => p * quantity * (denominator - numerator); // proceeds × denominator, exact
      expect(net(price) >= cost * denominator).toBe(true);
      expect(price === 0n || net(price - 1n) < cost * denominator).toBe(true);
    }));
  });
});

describe('ratios', () => {
  it('computes changes and refuses misleading bases', () => {
    expect(percentageChange(110, 100)).toBeCloseTo(10);
    expect(percentageChange(90n, 100n)).toBeCloseTo(-10);
    expect(percentageChange(5, 0)).toBeNull();
    expect(percentageChange(5, -10)).toBeNull();
    expect(percentageChange(Number.NaN, 10)).toBeNull();
    expect(priceChange(105_50n, 100_00n)).toEqual({ absolute: 5_50n, percent: expect.closeTo(5.5) });
    expect(priceChange(99.5, 100)).toEqual({ absolute: -0.5, percent: expect.closeTo(-0.5) });
    expect(returnOnCost(25, 200)).toBeCloseTo(12.5);
    expect(returnOnCost(25, 0)).toBeNull();
  });
  it('computes CAGR and yield within their domains', () => {
    expect(cagr(100, 200, 1)).toBeCloseTo(100);
    expect(cagr(100, 121, 2)).toBeCloseTo(10);
    expect(cagr(100n, 0n, 3)).toBe(-100);
    for (const [start, end, years] of [[0, 10, 1], [10, -1, 1], [10, 20, 0], [10, 20, Number.POSITIVE_INFINITY]]) expect(cagr(start!, end!, years!)).toBeNull();
    expect(dividendYield(25, 500)).toBeCloseTo(5);
    expect(dividendYield(25, 0)).toBeNull();
    expect(dividendYield(-1, 10)).toBeNull();
  });
  it('weights averages and validates weights', () => {
    expect(weightedAverage([{ value: 500, weight: 100 }, { value: 600, weight: 300 }])).toBe(575);
    expect(weightedAverage([])).toBeNull();
    expect(() => weightedAverage([{ value: 1, weight: -1 }])).toThrow(RangeError);
  });
  it('rounds allocation shares so they always add up to 100', () => {
    expect(allocation([{ id: 'a', value: 1 }, { id: 'b', value: 1 }, { id: 'c', value: 1 }]).map(s => s.displayPercent)).toEqual([33.34, 33.33, 33.33]);
    expect(allocation([{ id: 'a', value: 1n }, { id: 'b', value: 1n }, { id: 'c', value: 1n }], { decimals: 0 }).map(s => s.displayPercent)).toEqual([34, 33, 33]);
    expect(allocation([{ id: 'x', value: 0 }])).toEqual([{ id: 'x', value: 0, percent: null, displayPercent: null }]);
    expect(() => allocation([{ id: 'x', value: -1 }])).toThrow(RangeError);
    fc.assert(fc.property(fc.array(fc.bigInt({ min: 0n, max: 10n ** 15n }), { minLength: 1, maxLength: 40 }), fc.integer({ min: 0, max: 4 }), (values, decimals) => {
      fc.pre(values.some(v => v > 0n));
      const slices = allocation(values.map((value, id) => ({ id, value })), { decimals });
      const units = slices.reduce((s, x) => s + Math.round(x.displayPercent! * 10 ** decimals), 0);
      expect(units).toBe(100 * 10 ** decimals);
      for (const slice of slices) expect(Math.abs(slice.displayPercent! - slice.percent!)).toBeLessThanOrEqual(10 ** -decimals + 1e-9);
    }));
  });
});
