import { describe, expect, it } from 'vitest';

import { allocateExact, volumeProfile, type ProfileBar } from '../src/chart-math/volumeProfile.ts';

const bar = (low: string, high: string, volume: bigint | string, buyVolume?: bigint | string): ProfileBar => ({ low, high, volume, buyVolume });
const vols = (bars: ProfileBar[], o?: Parameters<typeof volumeProfile>[1]) => volumeProfile(bars, o).rows.map((r) => r.volume);

describe('allocateExact', () => {
  it('sums to the total, largest remainder first, ties to the lower index', () => {
    expect(allocateExact(10n, [1n, 1n, 1n])).toEqual([4n, 3n, 3n]);
    expect(allocateExact(100n, [1n, 2n])).toEqual([33n, 67n]);
    expect(allocateExact(0n, [1n, 2n])).toEqual([0n, 0n]);
    expect(allocateExact(7n, [0n, 0n])).toEqual([0n, 0n]);
  });
  it('is exact for volumes beyond Number precision', () => {
    const total = 9_007_199_254_740_993_123n;
    expect(allocateExact(total, [3n, 5n, 7n]).reduce((a, b) => a + b, 0n)).toBe(total);
  });
});

describe('volumeProfile bucketing', () => {
  it('cuts the range into equal bands, lowest first, and spreads a bar by overlap', () => {
    const p = volumeProfile([bar('10', '20', 100n)], { rows: 2 });
    expect(p.rows.map((r) => [r.low, r.high])).toEqual([['10', '15'], ['15', '20']]);
    expect(p.rows.map((r) => r.volume)).toEqual([50n, 50n]);
    expect([p.min, p.max]).toEqual(['10', '20']);
  });
  it('puts a flat bar (low = high) in one band, the top price in the last band', () => {
    expect(vols([bar('10', '20', 1n), bar('12', '12', 8n), bar('20', '20', 4n)], { rows: 2 })).toEqual([9n, 4n]);
  });
  it('never loses or invents volume: rows sum to the input, to the last unit', () => {
    const bars = [bar('100.05', '103.15', '1000003'), bar('101.10', '101.10', '17'), bar('99.95', '104.30', '9007199254740993')];
    const p = volumeProfile(bars, { rows: 13 });
    expect(p.totalVolume).toBe(1000003n + 17n + 9007199254740993n);
    expect(p.rows.reduce((a, r) => a + r.volume, 0n)).toBe(p.totalVolume);
  });
  it('keeps exact decimal prices as strings', () => {
    const p = volumeProfile([bar('0.10', '0.40', 3n)], { rows: 3 });
    expect(p.rows.map((r) => r.low)).toEqual(['0.10', '0.20', '0.30']);
    expect(p.rows.at(-1)!.high).toBe('0.40');
  });
  it('drops the part of a bar outside a fixed range, and skips a bar wholly outside', () => {
    const p = volumeProfile([bar('0', '20', 100n), bar('50', '60', 9n)], { rows: 2, range: { min: '0', max: '10' } });
    expect(p.rows.map((r) => r.volume)).toEqual([25n, 25n]);
    expect(p.skipped).toBe(1);
  });
  it('skips bad bars and counts them', () => {
    const p = volumeProfile([bar('5', '1', 1n), bar('x', '2', 1n), bar('1', '2', '-3'), bar('1', '2', 5n, 6n), bar('1', '3', '4')], { rows: 2 });
    expect(p.skipped).toBe(4);
    expect(p.totalVolume).toBe(4n);
  });
  it('handles no bars and a single price', () => {
    const none = volumeProfile([], { rows: 4 });
    expect(none.pocIndex).toBeNull();
    expect(none.valueArea).toBeNull();
    const one = volumeProfile([bar('7', '7', 9n)], { rows: 4 });
    expect(one.rows[0]!.volume).toBe(9n);
    expect(one.pocIndex).toBe(0);
  });
  it('splits buy and sell exactly, buy never above the band total', () => {
    const p = volumeProfile([bar('0', '3', 10n, 7n), bar('1', '2', 5n, 5n)], { rows: 3 });
    for (const r of p.rows) {
      expect(r.buyVolume! + r.sellVolume!).toBe(r.volume);
      expect(r.buyVolume!).toBeLessThanOrEqual(r.volume);
    }
    expect(p.rows.reduce((a, r) => a + r.buyVolume!, 0n)).toBe(12n);
  });
  it('gives no split unless every bar has it', () => {
    expect(volumeProfile([bar('0', '3', 10n, 7n), bar('1', '2', 5n)], { rows: 3 }).rows[0]!.buyVolume).toBeNull();
  });
});

// One flat bar per band: band i at price i+0.5.
const flatBars = (v: number[]) => v.map((x, i) => bar(String(i + 0.5), String(i + 0.5), BigInt(x) * 2n));

const withRange = (v: number[], valueArea?: number | string) => volumeProfile(flatBars(v), { rows: v.length, range: { min: '0', max: String(v.length) }, valueArea });

describe('Point of Control and value area', () => {

  it('finds the highest band', () => {
    const p = withRange([1, 3, 9, 4, 2]);
    expect(p.pocIndex).toBe(2);
    expect(p.rows[2]!.isPoc).toBe(true);
  });
  it('breaks a POC tie toward the middle, then the lower band', () => {
    expect(withRange([5, 1, 1, 1, 5, 1, 1]).pocIndex).toBe(4);
    expect(withRange([5, 1, 1, 1, 1, 5]).pocIndex).toBe(0);
    expect(withRange([4, 4]).pocIndex).toBe(0);
  });
  it('grows the value area outward one band at a time, taking the larger neighbour', () => {
    // total 100, POC 40 (band 2). 70 needed. up 20 vs down 15 -> up (60). then up 5 vs down 15 -> down (75).
    const p = withRange([15, 15, 40, 20, 5, 5], 0.7);
    expect(p.pocIndex).toBe(2);
    expect([p.valueArea!.lowIndex, p.valueArea!.highIndex]).toEqual([1, 3]);
    expect(p.valueArea!.volume).toBe(150n);
    expect(p.rows.map((r) => r.inValueArea)).toEqual([false, true, true, true, false, false]);
  });
  it('breaks an expansion tie toward the band nearer the POC, then upward', () => {
    // POC band 2. Both neighbours tie (10 and 10, one away): up wins. Then 10 (two away) vs 10 (one away): the nearer, down.
    expect([withRange([10, 10, 30, 10, 10], 0.55).valueArea!.lowIndex, withRange([10, 10, 30, 10, 10], 0.55).valueArea!.highIndex]).toEqual([2, 3]);
    const p = withRange([10, 10, 30, 10, 10], 0.6);
    expect([p.valueArea!.lowIndex, p.valueArea!.highIndex]).toEqual([1, 3]);
  });
  it('walks one way when the POC is at an edge', () => {
    const p = withRange([50, 20, 20, 10], 0.9);
    expect([p.valueArea!.lowIndex, p.valueArea!.highIndex]).toEqual([0, 2]);
  });
  it('uses only the side that remains at the edge', () => {
    const p = withRange([9, 1, 1, 1], 1);
    expect([p.valueArea!.lowIndex, p.valueArea!.highIndex]).toEqual([0, 3]);
    expect(p.valueArea!.share).toBe('100.0');
  });
  it('holds at least the asked share, never less', () => {
    const p = withRange([10, 20, 30, 25, 15], '0.5');
    expect(p.valueArea!.volume * 100n).toBeGreaterThanOrEqual(p.totalVolume * 50n);
  });
  it('rejects a bad value-area share', () => {
    expect(() => volumeProfile([], { valueArea: 0 })).toThrow(RangeError);
    expect(() => volumeProfile([], { valueArea: 1.2 })).toThrow(RangeError);
    expect(() => volumeProfile([], { valueArea: 'abc' })).toThrow(RangeError);
  });
  it('is deterministic', () => {
    const bars = [bar('10', '12', 5n), bar('11', '13', 7n), bar('10.5', '10.5', 3n)];
    expect(volumeProfile(bars)).toEqual(volumeProfile(bars));
  });
});
