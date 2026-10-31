import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  circuitLimits, compactCount, getMarketSession, heatStep, heatmapItemsFromQuotes, limitPosition, moveItem, nepseSchedule, nextQuoteSort, quoteChange, quoteChangePercent,
  rankMovers, sortQuotes, squarify, type MarketSchedule, type Quote,
} from '../src/index.ts';
import { NUM_RUNS } from './fc.ts';
import { npr, QUOTES } from './market-fixtures.ts';

type Box = { x: number; y: number; width: number; height: number };
const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

const symbols = (quotes: readonly Quote[]) => quotes.map((q) => q.symbol);

describe('sortQuotes', () => {
  it('orders NEPSE quotes by change percent, biggest first, with the untraded stock last', () => {
    expect(symbols(sortQuotes(QUOTES, { key: 'changePercent', dir: 'desc' }))).toEqual(['UPPER', 'NICA', 'NABIL', 'HDL', 'ADBL', 'NTC', 'CIT', 'SHIVM']);
  });
  it('keeps nulls last in both directions', () => {
    expect(symbols(sortQuotes(QUOTES, { key: 'turnover', dir: 'asc' })).at(-1)).toBe('SHIVM');
    expect(symbols(sortQuotes(QUOTES, { key: 'turnover', dir: 'desc' })).at(-1)).toBe('SHIVM');
    expect(symbols(sortQuotes(QUOTES, { key: 'volume', dir: 'asc' }))[0]).toBe('CIT');
  });
  it('sorts symbols case-insensitively and does not mutate the input', () => {
    const input: Quote[] = ['nica', 'ADBL', 'Cit'].map((symbol) => ({ ...QUOTES[0]!, symbol }));
    const copy = [...input];
    expect(symbols(sortQuotes(input, { key: 'symbol', dir: 'asc' }))).toEqual(['ADBL', 'Cit', 'nica']);
    expect(input).toEqual(copy);
  });
  it('keeps equal values in input order in both directions', () => {
    const flat = QUOTES.filter((q) => q.symbol === 'HDL' || q.symbol === 'ADBL');
    expect(symbols(sortQuotes(flat, { key: 'changePercent', dir: 'asc' }))).toEqual(['HDL', 'ADBL']);
    expect(symbols(sortQuotes(flat, { key: 'changePercent', dir: 'desc' }))).toEqual(['HDL', 'ADBL']);
  });
  it('treats a previous close of zero as no percent change', () => {
    const q = { ...QUOTES[0]!, previousClose: 0n };
    expect(quoteChangePercent(q)).toBeNull();
    expect(quoteChange(q)).toBe(q.ltp);
  });

  const quoteArb = fc.record({
    ltp: fc.option(fc.bigInt({ min: 0n, max: 12n }), { nil: null }),
    previousClose: fc.option(fc.bigInt({ min: 0n, max: 12n }), { nil: null }),
    volume: fc.option(fc.integer({ min: 0, max: 6 }), { nil: null }),
    turnover: fc.option(fc.bigInt({ min: 0n, max: 6n }), { nil: null }),
    code: fc.constantFrom('A', 'a', 'B', 'b', 'C'),
  });
  const listArb = fc.array(quoteArb, { maxLength: 30 }).map((rows): Quote[] => rows.map((r, i) => ({ symbol: r.code, name: String(i), ltp: r.ltp, previousClose: r.previousClose, volume: r.volume, turnover: r.turnover })));
  const sortArb = fc.record({ key: fc.constantFrom('symbol', 'ltp', 'change', 'changePercent', 'volume', 'turnover' as const), dir: fc.constantFrom('asc', 'desc' as const) });

  it('is a permutation, ordered, null-last, stable and idempotent (property)', () => {
    fc.assert(fc.property(listArb, sortArb, (list, sort) => {
      const out = sortQuotes(list, sort);
      expect(out).toHaveLength(list.length);
      expect(new Set(out)).toEqual(new Set(list));
      const keyOf = (q: Quote): string | number | bigint | null => {
        switch (sort.key) {
          case 'symbol': return q.symbol.toUpperCase();
          case 'ltp': return q.ltp;
          case 'change': return quoteChange(q);
          case 'changePercent': return quoteChangePercent(q);
          case 'volume': return q.volume;
          case 'turnover': return q.turnover;
        }
      };
      let seenNull = false;
      for (let i = 0; i < out.length; i += 1) {
        const v = keyOf(out[i]!);
        if (v === null) { seenNull = true; continue; }
        expect(seenNull).toBe(false);
        if (i === 0) continue;
        const p = keyOf(out[i - 1]!);
        if (p === null) continue;
        const ordered = sort.dir === 'asc' ? p <= v : p >= v;
        expect(ordered).toBe(true);
        expect(p === v ? list.indexOf(out[i - 1]!) < list.indexOf(out[i]!) : true).toBe(true);
      }
      expect(sortQuotes(out, sort)).toEqual(out);
    }), { numRuns: NUM_RUNS });
  });
});

describe('nextQuoteSort', () => {
  it('starts symbols ascending and figures descending, then flips', () => {
    expect(nextQuoteSort(undefined, 'symbol')).toEqual({ key: 'symbol', dir: 'asc' });
    expect(nextQuoteSort({ key: 'symbol', dir: 'asc' }, 'turnover')).toEqual({ key: 'turnover', dir: 'desc' });
    expect(nextQuoteSort({ key: 'turnover', dir: 'desc' }, 'turnover')).toEqual({ key: 'turnover', dir: 'asc' });
  });
});

describe('rankMovers', () => {
  it('ranks gainers, losers and the most active', () => {
    expect(symbols(rankMovers(QUOTES, 'gainers', { limit: 3 }))).toEqual(['UPPER', 'NICA', 'NABIL']);
    expect(symbols(rankMovers(QUOTES, 'losers'))).toEqual(['CIT', 'NTC']);
    expect(symbols(rankMovers(QUOTES, 'active', { limit: 2 }))).toEqual(['UPPER', 'NICA']);
    expect(symbols(rankMovers(QUOTES, 'active', { limit: 1, activeBy: 'volume' }))).toEqual(['UPPER']);
  });
  it('leaves out quotes with no change and a zero limit returns nothing', () => {
    expect(symbols(rankMovers(QUOTES, 'gainers', { limit: 99 }))).not.toContain('SHIVM');
    expect(symbols(rankMovers(QUOTES, 'active', { limit: 99 }))).not.toContain('SHIVM');
    expect(rankMovers(QUOTES, 'gainers', { limit: 0 })).toEqual([]);
  });
});

const at = (iso: string, schedule: MarketSchedule = nepseSchedule, options?: { halted?: boolean }) => getMarketSession(new Date(iso), schedule, options);

describe('getMarketSession', () => {
  describe('Asia/Kathmandu (UTC+05:45, no DST)', () => {
    it('is open in continuous trading on a Sunday', () => {
      const s = at('2026-11-01T05:15:00Z');
      expect(s).toMatchObject({ state: 'open', label: 'Continuous trading', localDate: '2026-11-01', localTime: '11:00' });
      expect(s.next).toEqual({ state: 'closed', at: new Date('2026-11-01T09:15:00Z') });
    });
    it('is pre-open from 10:30 and closed just before it', () => {
      expect(at('2026-11-01T04:45:00Z').state).toBe('pre-open');
      const before = at('2026-11-01T04:44:59Z');
      expect(before).toMatchObject({ state: 'closed', localTime: '10:29' });
      expect(before.next).toEqual({ state: 'pre-open', at: new Date('2026-11-01T04:45:00Z') });
    });
    it('closes at 15:00 sharp (the end is outside the window)', () => {
      expect(at('2026-11-01T09:14:59Z').state).toBe('open');
      expect(at('2026-11-01T09:15:00Z').state).toBe('closed');
    });
    it('is closed on Friday and Saturday and names Sunday pre-open as next', () => {
      const fri = at('2026-11-06T06:00:00Z');
      expect(fri.state).toBe('closed');
      expect(fri.next).toEqual({ state: 'pre-open', at: new Date('2026-11-08T04:45:00Z') });
      expect(at('2026-10-31T06:00:00Z').state).toBe('closed');
    });
    it('uses the exchange date, not the UTC date, near midnight', () => {
      expect(at('2026-11-01T18:30:00Z')).toMatchObject({ localDate: '2026-11-02', localTime: '00:15' });
    });
  });

  describe('holidays and halts are caller supplied', () => {
    const withHoliday: MarketSchedule = { ...nepseSchedule, holidays: [{ date: '2026-11-02', name: 'Sample holiday' }] };
    it('ships no holidays', () => {
      expect(nepseSchedule.holidays).toEqual([]);
    });
    it('is a holiday all day and skips to the next trading day', () => {
      const s = at('2026-11-02T06:00:00Z', withHoliday);
      expect(s).toMatchObject({ state: 'holiday', label: 'Sample holiday' });
      expect(s.next).toEqual({ state: 'pre-open', at: new Date('2026-11-03T04:45:00Z') });
      expect(at('2026-11-02T06:00:00Z').state).toBe('open');
    });
    it('halts only an open or pre-open market', () => {
      expect(at('2026-11-01T05:15:00Z', nepseSchedule, { halted: true }).state).toBe('halted');
      expect(at('2026-11-01T04:50:00Z', nepseSchedule, { halted: true }).state).toBe('halted');
      expect(at('2026-11-06T06:00:00Z', nepseSchedule, { halted: true }).state).toBe('closed');
    });
  });

  describe('America/New_York (daylight saving)', () => {
    const nyse: MarketSchedule = {
      timeZone: 'America/New_York',
      sessions: [
        { state: 'pre-open', days: [1, 2, 3, 4, 5], start: '04:00', end: '09:30' },
        { state: 'open', days: [1, 2, 3, 4, 5], start: '09:30', end: '16:00' },
      ],
    };
    it('opens at 14:30Z in winter (EST, UTC-5)', () => {
      expect(at('2026-03-06T14:30:00Z', nyse)).toMatchObject({ state: 'open', localTime: '09:30' });
      expect(at('2026-03-06T14:29:00Z', nyse).state).toBe('pre-open');
    });
    it('opens at 13:30Z after the spring change (EDT, UTC-4)', () => {
      expect(at('2026-03-09T13:30:00Z', nyse)).toMatchObject({ state: 'open', localDate: '2026-03-09', localTime: '09:30' });
      expect(at('2026-03-09T13:29:00Z', nyse).state).toBe('pre-open');
    });
    it('finds the next change across the spring change (Fri close to Mon 04:00 EDT)', () => {
      const s = at('2026-03-06T22:00:00Z', nyse);
      expect(s.state).toBe('closed');
      expect(s.next).toEqual({ state: 'pre-open', at: new Date('2026-03-09T08:00:00Z') });
    });
    it('finds the next change across the autumn change (Fri close to Mon 04:00 EST)', () => {
      expect(at('2026-10-30T13:30:00Z', nyse).state).toBe('open');
      expect(at('2026-11-02T14:30:00Z', nyse).state).toBe('open');
      expect(at('2026-10-30T21:00:00Z', nyse).next).toEqual({ state: 'pre-open', at: new Date('2026-11-02T09:00:00Z') });
    });
    it('does not wrap the wall clock through the skipped hour', () => {
      expect(at('2026-03-08T07:30:00Z', nyse)).toMatchObject({ state: 'closed', localDate: '2026-03-08', localTime: '03:30' });
    });
  });

  it('rejects invalid schedules and instants', () => {
    expect(() => getMarketSession(new Date('2026-11-01T05:00:00Z'), { timeZone: 'Nowhere/Land', sessions: [] })).toThrow(RangeError);
    expect(() => getMarketSession(new Date('2026-11-01T05:00:00Z'), { timeZone: 'UTC', sessions: [{ state: 'open', days: [1], start: '9:30', end: '16:00' }] })).toThrow(RangeError);
    expect(() => getMarketSession(new Date('2026-11-01T05:00:00Z'), { timeZone: 'UTC', sessions: [{ state: 'open', days: [1], start: '16:00', end: '09:30' }] })).toThrow(RangeError);
    expect(() => getMarketSession(new Date('2026-11-01T05:00:00Z'), { timeZone: 'UTC', sessions: [], holidays: [{ date: '1 Nov' }] })).toThrow(RangeError);
    expect(() => getMarketSession(new Date('nope'), nepseSchedule)).toThrow(RangeError);
  });
  it('has no next change with no sessions', () => {
    expect(getMarketSession(0, { timeZone: 'UTC', sessions: [] })).toMatchObject({ state: 'closed', next: null });
  });
});

describe('circuit limits', () => {
  it('computes a band around the previous close, rounded toward the close', () => {
    expect(circuitLimits(npr('223.20'), '0.10')).toEqual({ lower: npr('200.88'), upper: npr('245.52') });
    expect(circuitLimits(npr('731.80'), '0.10')).toEqual({ lower: npr('658.62'), upper: npr('804.98') });
    expect(circuitLimits(npr('100.05'), '0.10')).toEqual({ lower: 9005n, upper: 11005n });
    expect(circuitLimits(333n, '0.10')).toEqual({ lower: 300n, upper: 366n });
  });
  it('rejects a negative close and a malformed rate', () => {
    expect(() => circuitLimits(-1n, '0.1')).toThrow(RangeError);
    expect(() => circuitLimits(100n, '10%')).toThrow(TypeError);
  });
  it('places the price between the limits', () => {
    expect(limitPosition(npr('512.30'), npr('457.20'), npr('558.80'))).toMatchObject({ state: 'within', outside: false });
    expect(limitPosition(npr('507.00'), npr('457.20'), npr('556.80'))?.position).toBeCloseTo(0.5, 3);
    expect(limitPosition(npr('245.52'), npr('200.88'), npr('245.52'))).toEqual({ state: 'at-upper', position: 1, outside: false });
    expect(limitPosition(npr('200.88'), npr('200.88'), npr('245.52'))).toEqual({ state: 'at-lower', position: 0, outside: false });
    expect(limitPosition(npr('250.00'), npr('200.88'), npr('245.52'))).toEqual({ state: 'at-upper', position: 1, outside: true });
  });
  it('is unknown when anything is missing or the limits are not a band', () => {
    expect(limitPosition(null, 1n, 2n).state).toBe('unknown');
    expect(limitPosition(1n, undefined, 2n).state).toBe('unknown');
    expect(limitPosition(5n, 10n, 10n).state).toBe('unknown');
    expect(limitPosition(5n, 10n, 9n).state).toBe('unknown');
  });
  it('keeps the position inside 0..1 (property)', () => {
    fc.assert(fc.property(fc.bigInt({ min: -1000n, max: 1000n }), fc.bigInt({ min: -500n, max: 500n }), fc.bigInt({ min: 1n, max: 500n }), (ltp, lower, width) => {
      const r = limitPosition(ltp, lower, lower + width);
      expect(r.position).not.toBeNull();
      expect(r.position!).toBeGreaterThanOrEqual(0);
      expect(r.position!).toBeLessThanOrEqual(1);
    }), { numRuns: NUM_RUNS });
  });
});

describe('squarify', () => {
  const bounds = { width: 100, height: 60 };

  it('fills the bounds with one item', () => {
    expect(squarify([{ id: 'NICA', size: 7 }], bounds).rects).toEqual([{ id: 'NICA', x: 0, y: 0, width: 100, height: 60 }]);
  });
  it('lays out turnover with proportional areas, largest first', () => {
    const { rects, skipped } = squarify(QUOTES.map((q) => ({ id: q.symbol, size: q.turnover === null ? null : Number(q.turnover) })), bounds);
    expect(skipped).toEqual(['SHIVM']);
    expect(rects[0]!.id).toBe('UPPER');
    const total = QUOTES.reduce((s, q) => s + Number(q.turnover ?? 0n), 0);
    for (const r of rects) {
      const q = QUOTES.find((x) => x.symbol === r.id)!;
      expect(r.width * r.height).toBeCloseTo((Number(q.turnover) / total) * 6000, 6);
    }
  });
  it('skips missing, zero, negative and non-finite sizes and returns nothing when none is drawable', () => {
    const r = squarify([{ id: 'a', size: 5 }, { id: 'b', size: 0 }, { id: 'c', size: -3 }, { id: 'd', size: null }, { id: 'e', size: Number.NaN }, { id: 'f', size: Infinity }, { id: 'g', size: undefined }], bounds);
    expect(r.rects.map((x) => x.id)).toEqual(['a']);
    expect(r.skipped).toEqual(['b', 'c', 'd', 'e', 'f', 'g']);
    expect(squarify([{ id: 'x', size: 0 }], bounds)).toEqual({ rects: [], skipped: ['x'] });
    expect(squarify([], bounds).rects).toEqual([]);
  });
  it('rejects bounds with no area', () => {
    expect(() => squarify([], { width: 0, height: 5 })).toThrow(RangeError);
    expect(() => squarify([], { width: 5, height: Number.NaN })).toThrow(RangeError);
  });
  it('breaks equal sizes by input order', () => {
    const r = squarify([{ id: 'b', size: 1 }, { id: 'a', size: 1 }, { id: 'c', size: 1 }], bounds);
    expect(r.rects.map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });
  it('honours the bounds origin', () => {
    const r = squarify([{ id: 'a', size: 1 }, { id: 'b', size: 1 }], { x: 10, y: 20, width: 40, height: 40 });
    expect(Math.min(...r.rects.map((x) => x.x))).toBe(10);
    expect(Math.min(...r.rects.map((x) => x.y))).toBe(20);
  });
  it('tiles the bounds exactly: areas sum, stay inside, never overlap, match their share (property)', () => {
    const sizeArb = fc.oneof(fc.double({ min: 0.001, max: 1e9, noNaN: true }), fc.constantFrom(null, undefined, 0, -4, Number.NaN));
    fc.assert(fc.property(fc.array(sizeArb, { maxLength: 40 }), fc.double({ min: 10, max: 2000, noNaN: true }), fc.double({ min: 10, max: 2000, noNaN: true }), (sizes, width, height) => {
      const items = sizes.map((size, i) => ({ id: `i${i}`, size }));
      const { rects, skipped } = squarify(items, { width, height });
      const valid = items.filter((i) => typeof i.size === 'number' && Number.isFinite(i.size) && i.size > 0);
      expect(rects).toHaveLength(valid.length);
      expect(skipped).toHaveLength(items.length - valid.length);
      if (valid.length === 0) return;
      const eps = 1e-6 * Math.max(width, height);
      expect(rects.reduce((s, r) => s + r.width * r.height, 0)).toBeCloseTo(width * height, 3);
      const total = valid.reduce((s, i) => s + (i.size as number), 0);
      for (const r of rects) {
        expect(r.x).toBeGreaterThanOrEqual(-eps);
        expect(r.y).toBeGreaterThanOrEqual(-eps);
        expect(r.x + r.width).toBeLessThanOrEqual(width + eps);
        expect(r.y + r.height).toBeLessThanOrEqual(height + eps);
        expect(r.width).toBeGreaterThan(0);
        expect(r.height).toBeGreaterThan(0);
        const size = valid.find((i) => i.id === r.id)!.size as number;
        expect(Math.abs(r.width * r.height - (size / total) * width * height)).toBeLessThanOrEqual(1e-6 * width * height + 1e-9);
      }
      for (let i = 0; i < rects.length; i += 1) for (let j = i + 1; j < rects.length; j += 1) expect(overlap(rects[i]!, rects[j]!)).toBeLessThanOrEqual(1e-6 * width * height);
      expect(squarify(items, { width, height })).toEqual({ rects, skipped });
    }), { numRuns: NUM_RUNS });
  });
});

describe('heatStep', () => {
  it('maps a change to a diverging step', () => {
    expect([-5, -2.5, -1.2, -0.4, 0, 0.004, 0.4, 1.2, 2.5, 9].map((c) => heatStep(c))).toEqual([-3, -3, -2, -1, 0, 0, 1, 2, 3, 3]);
    expect(heatStep(null)).toBeNull();
    expect(heatStep(Number.NaN)).toBeNull();
    expect(heatStep(5, 15)).toBe(1);
    expect(() => heatStep(1, 0)).toThrow(RangeError);
  });
});

describe('heatmapItemsFromQuotes', () => {
  it('sizes by turnover in rupees and carries the change', () => {
    const items = heatmapItemsFromQuotes(QUOTES);
    expect(items.find((i) => i.id === 'UPPER')).toMatchObject({ size: 295_734_000, change: expect.closeTo(10, 5) });
    expect(items.find((i) => i.id === 'SHIVM')).toMatchObject({ size: null, change: null });
    expect(heatmapItemsFromQuotes(QUOTES, 'volume').find((i) => i.id === 'NICA')?.size).toBe(312_870);
  });
});

describe('moveItem', () => {
  it('moves an item and clamps at the ends', () => {
    expect(moveItem(['NABIL', 'NTC', 'HDL'], 'HDL', -1)).toEqual(['NABIL', 'HDL', 'NTC']);
    expect(moveItem(['NABIL', 'NTC', 'HDL'], 'NABIL', -1)).toEqual(['NABIL', 'NTC', 'HDL']);
    expect(moveItem(['NABIL', 'NTC', 'HDL'], 'NTC', 5)).toEqual(['NABIL', 'HDL', 'NTC']);
    expect(moveItem(['NABIL'], 'ZZZ', 1)).toEqual(['NABIL']);
  });
  it('keeps the same members in any move (property)', () => {
    fc.assert(fc.property(fc.uniqueArray(fc.string({ maxLength: 3 }), { maxLength: 12 }), fc.integer({ min: -20, max: 20 }), fc.nat(15), (list, delta, pick) => {
      const item = list[pick % Math.max(1, list.length)] ?? 'x';
      const out = moveItem(list, item, delta);
      expect(out.toSorted()).toEqual(list.toSorted());
    }), { numRuns: NUM_RUNS });
  });
});

describe('compactCount', () => {
  it('is exact below a lakh and shortens above', () => {
    expect(compactCount(98_700)).toBe('98,700');
    expect(compactCount(1_204_500)?.replace(/\s/g, ' ')).toBe('12.05 L');
    expect(compactCount(31_250_000)?.replace(/\s/g, ' ')).toBe('3.13 Cr');
    expect(compactCount(null)).toBeNull();
    expect(compactCount(Number.NaN)).toBeNull();
    expect(compactCount(1_500_000, { currency: 'USD', locale: 'en-US', display: 'none' })).toBe('1.5M');
  });
});
