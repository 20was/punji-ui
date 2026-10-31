import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  bandScale, cumulativeDepth, downsampleIndices, ema, niceTicks, rebase, reduceCandles, sma, timeScale, validateOhlc,
} from '../src/chart-math/chartMath.ts';
import { NUM_RUNS } from './fc.ts';

const fin = (lo: number, hi: number) => fc.double({ min: lo, max: hi, noNaN: true, noDefaultInfinity: true });

describe('niceTicks', () => {
  it('covers the domain, is ascending, evenly spaced and made of nice steps', () => {
    fc.assert(fc.property(fin(-1e6, 1e6), fin(-1e6, 1e6), fc.integer({ min: 2, max: 10 }), (a, b, count) => {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const t = niceTicks(lo, hi, count);
      expect(t.lo).toBeLessThanOrEqual(lo);
      expect(t.hi).toBeGreaterThanOrEqual(hi);
      for (let i = 1; i < t.ticks.length; i += 1) {
        expect(t.ticks[i]!).toBeGreaterThan(t.ticks[i - 1]!);
        expect(t.ticks[i]! - t.ticks[i - 1]!).toBeCloseTo(t.step, 6);
      }
      const mantissa = t.step / Math.pow(10, Math.floor(Math.log10(t.step)));
      expect([1, 2, 2.5, 5, 10].some((m) => Math.abs(m - mantissa) < 1e-6)).toBe(true);
    }), { numRuns: NUM_RUNS });
  });
  it('gives round numbers for a NEPSE price range and widens a flat domain', () => {
    expect(niceTicks(471.2, 493.5, 5).ticks).toEqual([470, 480, 490, 500]);
    const flat = niceTicks(487.5, 487.5);
    expect(flat.lo).toBeLessThan(487.5);
    expect(flat.hi).toBeGreaterThan(487.5);
    expect(niceTicks(0.1, 0.3, 3).ticks).toEqual([0.1, 0.2, 0.3]);
  });
  it('repairs reversed and non-finite input', () => {
    expect(niceTicks(10, 0).lo).toBeLessThanOrEqual(0);
    expect(niceTicks(Number.NaN, Number.NaN).ticks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('scales', () => {
  it('bandScale centres are inside their bands and indexAt inverts them', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 500 }), (n) => {
      const s = bandScale(n, 10, 710);
      for (const i of [0, Math.floor(n / 2), n - 1]) expect(s.indexAt(s.center(i))).toBe(i);
      expect(s.indexAt(-1e9)).toBe(0);
      expect(s.indexAt(1e9)).toBe(n - 1);
    }), { numRuns: NUM_RUNS });
    expect(bandScale(0, 0, 100).indexAt(5)).toBe(-1);
  });
  it('timeScale keeps a holiday gap visible and the category scale does not', () => {
    const day = 86_400_000;
    const t = [0, day, 2 * day, 6 * day, 7 * day];
    const s = timeScale(t, 0, 500);
    expect(s.x(t[3]!) - s.x(t[2]!)).toBeGreaterThan(3 * (s.x(t[1]!) - s.x(t[0]!)));
    expect(s.nearest(s.x(t[3]!) + 1)).toBe(3);
    const b = bandScale(5, 0, 500);
    expect(b.center(3) - b.center(2)).toBe(b.center(1) - b.center(0));
  });
});

describe('validateOhlc', () => {
  it('accepts a sane candle and flags each kind of problem', () => {
    expect(validateOhlc({ open: 10, high: 12, low: 9, close: 11, volume: 100 })).toEqual([]);
    expect(validateOhlc({ open: 10, high: 12, low: 9, close: 11 })).toEqual([]);
    expect(validateOhlc({ open: 10, high: 8, low: 9, close: 9 })).toContain('high-below-low');
    expect(validateOhlc({ open: 13, high: 12, low: 9, close: 11 })).toContain('high-below-body');
    expect(validateOhlc({ open: 10, high: 12, low: 10.5, close: 11 })).toContain('low-above-body');
    expect(validateOhlc({ open: Number.NaN, high: 12, low: 9, close: 11 })).toEqual(['not-finite']);
    expect(validateOhlc({ open: 10, high: 12, low: 9, close: 11, volume: -1 })).toEqual(['negative-volume']);
  });
  it('a candle built around its body is always valid', () => {
    fc.assert(fc.property(fin(0, 1e5), fin(0, 1e5), fin(0, 100), fin(0, 100), (o, c, up, down) => {
      expect(validateOhlc({ open: o, close: c, high: Math.max(o, c) + up, low: Math.min(o, c) - down })).toEqual([]);
    }), { numRuns: NUM_RUNS });
  });
});

describe('downsampleIndices', () => {
  it('keeps the endpoints and the global min and max, ascending and bounded', () => {
    fc.assert(fc.property(fc.array(fin(-1e4, 1e4), { minLength: 1, maxLength: 3000 }), fc.integer({ min: 4, max: 200 }), (vs, max) => {
      const idx = downsampleIndices(vs, max);
      expect(idx[0]).toBe(0);
      expect(idx[idx.length - 1]).toBe(vs.length - 1);
      expect(idx.length).toBeLessThanOrEqual(vs.length <= max ? vs.length : max + 2);
      for (let i = 1; i < idx.length; i += 1) expect(idx[i]!).toBeGreaterThan(idx[i - 1]!);
      const kept = idx.map((i) => vs[i]!);
      expect(Math.max(...kept)).toBe(Math.max(...vs));
      expect(Math.min(...kept)).toBe(Math.min(...vs));
    }), { numRuns: NUM_RUNS });
  });
  it('never picks a gap as an extreme and keeps a lone spike', () => {
    const v: (number | null)[] = Array.from({ length: 1000 }, (_, i) => (i % 7 === 0 ? null : 100 + (i % 5)));
    v[501] = 900;
    const idx = downsampleIndices(v, 50);
    expect(idx).toContain(501);
    expect(idx.filter((i) => v[i] === null).every((i) => i === 0 || i === 999)).toBe(true);
  });
});

describe('reduceCandles', () => {
  it('preserves open, close, extremes and total volume', () => {
    fc.assert(fc.property(fc.array(fc.tuple(fin(1, 1000), fin(0, 50), fin(0, 50), fc.nat(1e6)), { minLength: 1, maxLength: 500 }), fc.integer({ min: 1, max: 60 }), (rows, max) => {
      const cs = rows.map(([c, up, down, volume]) => ({ open: c, close: c, high: c + up, low: c - down, volume }));
      const r = reduceCandles(cs, max);
      expect(r.length).toBeLessThanOrEqual(max);
      expect(r[0]!.candle.open).toBe(cs[0]!.open);
      expect(r[r.length - 1]!.candle.close).toBe(cs[cs.length - 1]!.close);
      expect(Math.max(...r.map((x) => x.candle.high))).toBe(Math.max(...cs.map((x) => x.high)));
      expect(Math.min(...r.map((x) => x.candle.low))).toBe(Math.min(...cs.map((x) => x.low)));
      expect(r.reduce((s, x) => s + (x.candle.volume ?? 0), 0)).toBe(cs.reduce((s, x) => s + x.volume, 0));
      r.forEach((x) => expect(validateOhlc(x.candle)).toEqual([]));
    }), { numRuns: NUM_RUNS });
  });
});

describe('moving averages', () => {
  it('sma is the mean of its window and null before it fills', () => {
    fc.assert(fc.property(fc.array(fin(-1e4, 1e4), { minLength: 0, maxLength: 80 }), fc.integer({ min: 1, max: 20 }), (vs, w) => {
      const out = sma(vs, w);
      expect(out).toHaveLength(vs.length);
      expect(out.slice(0, w - 1).every((v) => v === null)).toBe(true);
      for (let i = w - 1; i < vs.length; i += 1) {
        const mean = vs.slice(i - w + 1, i + 1).reduce((a, b) => a + b, 0) / w;
        expect(out[i]).toBeCloseTo(mean, 6);
      }
    }), { numRuns: NUM_RUNS });
  });
  it('a gap blanks every window that contains it, nothing else', () => {
    expect(sma([1, 2, null, 4, 5, 6], 2)).toEqual([null, 1.5, null, null, 4.5, 5.5]);
  });
  it('ema seeds with the sma, stays inside the data range and handles a gap', () => {
    expect(ema([10, 11, 12, 13, 14], 3)).toEqual([null, null, 11, 12, 13]);
    fc.assert(fc.property(fc.array(fin(0, 1e4), { minLength: 1, maxLength: 80 }), fc.integer({ min: 1, max: 20 }), (vs, w) => {
      const lo = Math.min(...vs);
      const hi = Math.max(...vs);
      const real = ema(vs, w).filter((v): v is number => v !== null);
      expect(real.every((v) => v >= lo - 1e-9 && v <= hi + 1e-9)).toBe(true);
    }), { numRuns: NUM_RUNS });
    expect(ema([1, 2, null, 4], 2)).toEqual([null, 1.5, null, 4 * (2 / 3) + 1.5 * (1 / 3)]);
  });
});

describe('rebase and cumulativeDepth', () => {
  it('rebase starts at 0 and gives null on a zero base', () => {
    expect(rebase([null, 200, 210, null, 190])).toEqual([null, 0, 5, null, -5]);
    expect(rebase([0, 1, 2])).toEqual([null, null, null]);
  });
  it('cumulative depth is monotone, best first and independent of input order', () => {
    fc.assert(fc.property(fc.array(fc.tuple(fc.integer({ min: 1, max: 400 }), fc.nat(5000)), { maxLength: 60 }), fc.constantFrom('bid' as const, 'ask' as const), (rows, side) => {
      const levels = rows.map(([p, q]) => ({ price: p / 10, quantity: q }));
      const d = cumulativeDepth(levels, side);
      for (let i = 1; i < d.length; i += 1) {
        expect(d[i]!.cumulative).toBeGreaterThanOrEqual(d[i - 1]!.cumulative);
        expect(side === 'bid' ? d[i]!.price < d[i - 1]!.price : d[i]!.price > d[i - 1]!.price).toBe(true);
      }
      expect(d.at(-1)?.cumulative ?? 0).toBe(levels.reduce((s, l) => s + l.quantity, 0));
      expect(cumulativeDepth(levels.toReversed(), side)).toEqual(d);
    }), { numRuns: NUM_RUNS });
    expect(cumulativeDepth([{ price: 5, quantity: -1 }, { price: Number.NaN, quantity: 1 }, { price: 0, quantity: 1 }], 'bid')).toEqual([]);
  });
});
