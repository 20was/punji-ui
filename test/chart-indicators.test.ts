import { describe, expect, it } from 'vitest';

import { decimalsOf, exactText, heikinAshi, logTicks, priceTransform, spreadLabels } from '../src/chart-math/chartMath.ts';
import { bollinger, macd, rsi, vwap } from '../src/chart-math/indicators.ts';

const close2 = (v: number | null, want: number) => expect(Math.round((v as number) * 100) / 100).toBe(want);

// StockCharts' RSI worksheet (ChartSchool, "Relative Strength Index (RSI)"): 14-period RSI of these closes.
const SC_CLOSES = [44.3389, 44.0902, 44.1497, 43.6124, 44.3278, 44.8264, 45.0955, 45.4245, 45.8433, 46.0826, 45.8931, 46.0328, 45.614, 46.282, 46.282, 46.0028, 46.0328, 46.4116, 46.2222, 45.6439, 46.2122, 46.2521, 45.7137, 46.4515, 45.7835, 45.3548, 44.0288, 44.1783, 44.2219, 44.5605, 43.4205, 42.6628, 43.1314];
const SC_RSI = [70.53, 66.32, 66.55, 69.41, 66.36, 57.97, 62.93, 63.26, 56.06, 62.38, 54.71, 50.42, 39.99, 41.46];

describe('rsi', () => {
  it('matches the StockCharts RSI(14) worksheet (its first fourteen values)', () => {
    const out = rsi(SC_CLOSES, 14);
    expect(out.slice(0, 14).every((v) => v === null)).toBe(true);
    SC_RSI.forEach((want, k) => close2(out[14 + k]!, want));
  });
  it('is 100 with no losses, 50 with no movement, null for a gap, and stays within 0..100', () => {
    expect(rsi([1, 2, 3, 4, 5, 6], 3)[3]).toBe(100);
    expect(rsi([5, 5, 5, 5, 5], 3)[3]).toBe(50);
    const gap = rsi([1, 2, null, 4, 3, 5, 4, 6], 3);
    expect(gap[2]).toBeNull();
    const real = rsi(SC_CLOSES, 5).filter((v): v is number => v !== null);
    expect(real.length).toBeGreaterThan(20);
    expect(real.every((v) => v >= 0 && v <= 100)).toBe(true);
  });
});

/** A plain Wilder RSI written for the test, not sharing a line with the production code: diffs first, then the recursive moving average avg += (x - avg) / n. */
function referenceRsi(closes: number[], n: number): (number | null)[] {
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    const d = closes[i]! - closes[i - 1]!;
    gains.push(d > 0 ? d : 0);
    losses.push(d < 0 ? -d : 0);
  }
  const out: (number | null)[] = closes.map(() => null);
  let g = gains.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let l = losses.slice(0, n).reduce((a, b) => a + b, 0) / n;
  out[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  for (let i = n; i < gains.length; i += 1) {
    g += (gains[i]! - g) / n;
    l += (losses[i]! - l) / n;
    out[i + 1] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return out;
}

const walk = (length: number, seed: number) => {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  let p = 100;
  return Array.from({ length }, () => {
    p = Math.max(1, p * (1 + (rand() - 0.5) * 0.06));
    return Math.round(p * 100) / 100;
  });
};
describe('rsi against an independent Wilder implementation', () => {
  it.each([[14, 1], [14, 2], [5, 3], [21, 4]])('period %i, series %i: 3,000 random-walk closes agree to 1e-9', (period, seed) => {
    const closes = walk(3000, seed);
    const want = referenceRsi(closes, period);
    const got = rsi(closes, period);
    expect(got.slice(0, period).every((v) => v === null)).toBe(true);
    const worst = Math.max(...got.map((v, i) => (v === null ? 0 : Math.abs(v - (want[i] as number)))));
    expect(got.filter((v) => v !== null)).toHaveLength(3000 - period);
    expect(worst).toBeLessThan(1e-9);
  });
});

describe('macd', () => {
  it('a straight line settles at exactly (slow - fast) / 2 times the slope, and the histogram at zero', () => {
    const line = Array.from({ length: 80 }, (_, i) => 100 + 3 * i);
    const r = macd(line, 12, 26, 9);
    expect(r.macd.slice(0, 25).every((v) => v === null)).toBe(true);
    for (let i = 25; i < 80; i += 1) expect(r.macd[i]!).toBeCloseTo(7 * 3, 9);
    expect(r.signal[32]).toBeNull();
    expect(r.signal[33]!).toBeCloseTo(21, 9);
    expect(r.histogram[79]!).toBeCloseTo(0, 9);
  });
  it('matches a hand-worked small case (2, 3, 2) over 1, 2, 4, 8, 16', () => {
    // EMA2 (k = 2/3) seeded 1.5 at i=1: i2 = 4*2/3 + 1.5/3 = 3.1667; i3 = 8*2/3 + 3.1667/3 = 6.3889; i4 = 16*2/3 + 6.3889/3 = 12.7963
    // EMA3 (k = 1/2) seeded (1+2+4)/3 = 2.3333 at i=2: i3 = 5.1667; i4 = 10.5833
    const r = macd([1, 2, 4, 8, 16], 2, 3, 2);
    expect(r.macd[0]).toBeNull();
    expect(r.macd[1]).toBeNull();
    expect(r.macd[2]!).toBeCloseTo(3.16667 - 2.33333, 4);
    expect(r.macd[3]!).toBeCloseTo(6.38889 - 5.16667, 4);
    expect(r.macd[4]!).toBeCloseTo(12.79630 - 10.58333, 4);
    // signal EMA2 of the MACD line seeded with the mean of its first two values
    const m = [r.macd[2]!, r.macd[3]!, r.macd[4]!];
    const seed = (m[0]! + m[1]!) / 2;
    expect(r.signal[3]!).toBeCloseTo(seed, 9);
    expect(r.signal[4]!).toBeCloseTo((m[2]! * 2) / 3 + seed / 3, 9);
    expect(r.histogram[4]!).toBeCloseTo(m[2]! - r.signal[4]!, 9);
  });
});

describe('bollinger', () => {
  it('uses the population deviation: 1..20 has mean 10.5 and deviation sqrt(399 / 12)', () => {
    const r = bollinger(Array.from({ length: 20 }, (_, i) => i + 1), 20, 2);
    const sd = Math.sqrt(399 / 12);
    expect(r.middle[19]).toBe(10.5);
    expect(r.upper[19]!).toBeCloseTo(10.5 + 2 * sd, 9);
    expect(r.lower[19]!).toBeCloseTo(10.5 - 2 * sd, 9);
    expect(r.middle[18]).toBeNull();
  });
  it('collapses to the average on a flat series and is null across a gap', () => {
    const r = bollinger([5, 5, 5, 5], 3, 2);
    expect(r.upper[3]).toBe(5);
    expect(r.lower[3]).toBe(5);
    expect(bollinger([1, null, 3, 4, 5], 3, 2).middle[3]).toBeNull();
  });
});

describe('vwap', () => {
  it('is the running typical price weighted by volume', () => {
    // typical prices: (12+8+10)/3 = 10, (15+9+12)/3 = 12; volumes 100 and 300
    const out = vwap([{ high: 12, low: 8, close: 10, volume: 100 }, { high: 15, low: 9, close: 12, volume: 300 }, { high: 20, low: 20, close: 20, volume: null }]);
    expect(out[0]).toBe(10);
    expect(out[1]).toBeCloseTo((10 * 100 + 12 * 300) / 400, 12);
    expect(out[2]).toBe(out[1]);
  });
  it('is null until some volume has traded', () => {
    expect(vwap([{ high: 2, low: 1, close: 1.5 }, { high: 2, low: 1, close: 1.5, volume: 0 }])).toEqual([null, null]);
  });
});

describe('heikinAshi', () => {
  it('follows the TradingView construction rules', () => {
    const out = heikinAshi([
      { open: 10, high: 14, low: 9, close: 13 },
      { open: 13, high: 16, low: 12, close: 15 },
      { open: 15, high: 15, low: 10, close: 11 },
    ]);
    // first: close (10+14+9+13)/4 = 11.5, open (10+13)/2 = 11.5
    expect(out[0]).toEqual({ open: 11.5, high: 14, low: 9, close: 11.5, volume: null });
    // second: close (13+16+12+15)/4 = 14, open (11.5+11.5)/2 = 11.5, high max(16, 11.5, 14) = 16, low min(12, 11.5, 14) = 11.5
    expect(out[1]).toEqual({ open: 11.5, high: 16, low: 11.5, close: 14, volume: null });
    // third: close (15+15+10+11)/4 = 12.75, open (11.5+14)/2 = 12.75, high 15, low 10
    expect(out[2]).toEqual({ open: 12.75, high: 15, low: 10, close: 12.75, volume: null });
  });
  it('carries volume and returns one candle per input', () => {
    expect(heikinAshi([])).toEqual([]);
    expect(heikinAshi([{ open: 1, high: 2, low: 1, close: 2, volume: 7 }])[0]!.volume).toBe(7);
  });
});

describe('scales and labels', () => {
  it('transforms by mode, with the base at 0 percent and 100 indexed', () => {
    expect(priceTransform('linear', 50)(60)).toBe(60);
    expect(priceTransform('log', 50)(1000)).toBeCloseTo(3, 12);
    expect(priceTransform('percent', 50)(60)).toBeCloseTo(20, 12);
    expect(priceTransform('percent', 50)(50)).toBe(0);
    expect(priceTransform('indexed', 50)(60)).toBeCloseTo(120, 12);
    expect(priceTransform('log', 1)(-1)).toBeNaN();
    expect(priceTransform('percent', 0)(5)).toBeNaN();
  });
  it('gives log ticks that cover the data', () => {
    const t = logTicks(3, 800, 5);
    expect(t.lo).toBeLessThanOrEqual(3);
    expect(t.hi).toBeGreaterThanOrEqual(800);
    expect(t.ticks).toEqual([2, 5, 10, 20, 50, 100, 200, 500, 1000]);
    const narrow = logTicks(480, 520, 5);
    expect(narrow.lo).toBeLessThanOrEqual(480);
    expect(narrow.hi).toBeGreaterThanOrEqual(520);
  });
  it('spreads labels apart, inside the range, in the order given', () => {
    expect(spreadLabels([], 14, 0, 100)).toEqual([]);
    const out = spreadLabels([50, 52, 51], 14, 0, 200);
    const sorted = [...out].toSorted((a, b) => a - b);
    for (let i = 1; i < sorted.length; i += 1) expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThanOrEqual(14 - 1e-9);
    expect(out[0]!).toBeLessThan(out[2]!);
    expect(out[2]!).toBeLessThan(out[1]!);
    const edge = spreadLabels([98, 99, 100], 10, 0, 100);
    expect(Math.max(...edge)).toBeLessThanOrEqual(100);
    expect(Math.min(...edge)).toBeGreaterThanOrEqual(0);
  });
  it('writes exact decimals', () => {
    expect(decimalsOf(487.25)).toBe(2);
    expect(decimalsOf(3)).toBe(0);
    expect(decimalsOf(0.1 + 0.2)).toBe(1);
    expect(exactText(0.1 + 0.2, 4)).toBe('0.3');
    expect(exactText(487.3125, 4, 2)).toBe('487.3125');
    expect(exactText(487.5, 4, 2)).toBe('487.50');
    expect(exactText(-0.00001, 2)).toBe('0');
    expect(exactText(1e21, 2)).toBe('1000000000000000000000');
  });
});
