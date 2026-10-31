/**
 * Chart math: the pure helpers the financial charts share. No React, no DOM,
 * no locale: numbers in, numbers out, the same answer every time.
 *
 *   niceTicks          round ticks that cover a domain (1, 2, 2.5 or 5 times a power of ten)
 *   bandScale          category axis: n equal bands, so non-trading days leave no hole
 *   timeScale          time axis: position by timestamp, so gaps stay visible
 *   validateOhlc       low <= open, close <= high, all finite, volume not negative
 *   reduceCandles      aggregate candles into at most `max` buckets (open first, close last, high/low extremes, volume summed)
 *   downsampleIndices  keep at most about `max` points of a line, always the endpoints and the global min and max
 *   sma, ema           moving averages; `null` where the span is not full or the input is missing
 *   rebase             a series as percent change from its first finite value
 *   cumulativeDepth    order book levels as running quantity from the best price outward
 *
 * Missing, null and non-finite numbers are "no value" everywhere. They are
 * never read as zero.
 */

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export interface NiceTicks {
  /** Round values, ascending. Always at least two when the inputs are finite. */
  ticks: number[];
  /** The first tick: at or below the smallest value. */
  lo: number;
  /** The last tick: at or above the largest value. */
  hi: number;
  /** The distance between ticks. */
  step: number;
}

/**
 * Round ticks that cover [min, max]: `lo <= min` and `hi >= max`, evenly
 * spaced by 1, 2, 2.5 or 5 times a power of ten, about `count` of them.
 * A flat domain (min equals max) is widened so the value sits inside; a
 * reversed or non-finite domain is repaired (swapped, or 0..1).
 */
export function niceTicks(min: number, max: number, count = 5): NiceTicks {
  let a = isNum(min) ? min : 0;
  let b = isNum(max) ? max : a + 1;
  if (a > b) [a, b] = [b, a];
  if (b - a <= Math.max(Math.abs(a), Math.abs(b)) * 1e-12 || b - a < 1e-12) {
    let pad = Math.max(Math.abs(a), Math.abs(b)) * 0.02;
    if (!(pad > 1e-100)) pad = 1;
    a -= pad;
    b += pad;
  }
  const want = Math.min(12, Math.max(2, Math.floor(isNum(count) ? count : 5)));
  const raw = (b - a) / (want - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  let step = mag * 10;
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * mag >= raw - 1e-12 * raw) {
      step = m * mag;
      break;
    }
  }
  // Ticks are k * step rounded to a precision that removes 0.1 + 0.2 drift.
  const digits = Math.min(100, Math.max(0, 12 - Math.floor(Math.log10(Math.max(Math.abs(a), Math.abs(b), step))) - 1));
  const snap = (v: number) => Number(v.toFixed(digits));
  const k0 = Math.floor(a / step + 1e-9);
  let k1 = Math.ceil(b / step - 1e-9);
  if (k1 === k0) k1 = k0 + 1;
  const ticks: number[] = [];
  for (let k = k0; k <= k1; k += 1) ticks.push(snap(k * step));
  // The covering promise is exact: widen by one step if rounding broke it.
  if (ticks[0]! > a) ticks.unshift(snap((k0 - 1) * step));
  if (ticks[ticks.length - 1]! < b) ticks.push(snap((k1 + 1) * step));
  return { ticks, lo: ticks[0]!, hi: ticks[ticks.length - 1]!, step };
}

export interface BandScale {
  /** Number of bands. */
  count: number;
  /** Width of one band. */
  step: number;
  /** Width left for the mark inside a band. */
  bandwidth: number;
  /** The centre of band `i`. */
  center: (i: number) => number;
  /** The band under position `x`, clamped into 0..count-1 (-1 when there are no bands). */
  indexAt: (x: number) => number;
}

/** A category axis: `count` equal bands across [start, end]. Missing days (weekends, Saturdays on NEPSE, holidays) take no room. */
export function bandScale(count: number, start: number, end: number, padding = 0.2): BandScale {
  const n = Math.max(0, Math.floor(isNum(count) ? count : 0));
  const width = Math.max(0, end - start);
  const step = n > 0 ? width / n : 0;
  const pad = Math.min(0.9, Math.max(0, padding));
  return {
    count: n,
    step,
    bandwidth: step * (1 - pad),
    center: (i) => start + step * (i + 0.5),
    indexAt: (x) => (n === 0 ? -1 : step === 0 ? 0 : Math.min(n - 1, Math.max(0, Math.floor((x - start) / step)))),
  };
}

export interface TimeScale {
  /** Position of a timestamp. */
  x: (t: number) => number;
  /** The index (into the times given) nearest to position `x`; -1 for none. */
  nearest: (x: number) => number;
  /** The smallest spacing between neighbours, in px, for sizing marks so none overlap. */
  step: number;
}

/**
 * A time axis: x is proportional to the timestamp, so a four-day holiday is a
 * visible gap. `times` must be ascending. Marks are inset by half the typical
 * step so the first and last do not clip.
 */
export function timeScale(times: readonly number[], start: number, end: number): TimeScale {
  const n = times.length;
  if (n === 0) return { x: () => start, nearest: () => -1, step: 0 };
  const gaps: number[] = [];
  for (let i = 1; i < n; i += 1) gaps.push(times[i]! - times[i - 1]!);
  // The smallest positive gap sizes the marks: a holiday or a weekend must not make neighbouring candles overlap.
  const smallest = gaps.filter((g) => g > 0).reduce((m, g) => Math.min(m, g), Infinity);
  const medianGap = Number.isFinite(smallest) ? smallest : 1;
  const t0 = times[0]! - medianGap / 2;
  const t1 = times[n - 1]! + medianGap / 2;
  const span = t1 - t0 || 1;
  const scale = Math.max(0, end - start) / span;
  const x = (t: number) => start + (t - t0) * scale;
  return {
    x,
    step: medianGap * scale,
    nearest: (px) => {
      let best = 0;
      let dist = Infinity;
      for (let i = 0; i < n; i += 1) {
        const d = Math.abs(x(times[i]!) - px);
        if (d < dist) {
          dist = d;
          best = i;
        }
      }
      return best;
    },
  };
}

export interface Ohlc {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
}

export type OhlcIssue = 'not-finite' | 'high-below-low' | 'high-below-body' | 'low-above-body' | 'negative-volume';

/**
 * Checks one candle: every price finite, `low <= min(open, close)` and
 * `high >= max(open, close)`. A volume that is present must be finite and not
 * negative (a missing volume is fine). Returns the problems; empty means valid.
 */
export function validateOhlc(c: Ohlc): OhlcIssue[] {
  const issues: OhlcIssue[] = [];
  if (!isNum(c.open) || !isNum(c.high) || !isNum(c.low) || !isNum(c.close)) {
    issues.push('not-finite');
  } else {
    if (c.high < c.low) issues.push('high-below-low');
    if (c.high < Math.max(c.open, c.close)) issues.push('high-below-body');
    if (c.low > Math.min(c.open, c.close)) issues.push('low-above-body');
  }
  if (c.volume != null && (!isNum(c.volume) || c.volume < 0)) issues.push('negative-volume');
  return issues;
}

/** Whether `validateOhlc` finds nothing wrong. */
export const isValidOhlc = (c: Ohlc): boolean => validateOhlc(c).length === 0;

/**
 * Aggregate consecutive candles into at most `max` buckets: the first open,
 * the last close, the highest high, the lowest low, the summed volume. Only
 * pass valid candles. Each bucket reports its first and last source index so a
 * caller can name the range.
 */
export function reduceCandles(candles: readonly Ohlc[], max: number): { candle: Ohlc; from: number; to: number }[] {
  const n = candles.length;
  const buckets = Math.max(1, Math.floor(isNum(max) ? max : n));
  const size = Math.max(1, Math.ceil(n / buckets));
  const out: { candle: Ohlc; from: number; to: number }[] = [];
  for (let from = 0; from < n; from += size) {
    const to = Math.min(n, from + size) - 1;
    const first = candles[from]!;
    const last = candles[to]!;
    let high = -Infinity;
    let low = Infinity;
    let volume: number | null = null;
    for (let i = from; i <= to; i += 1) {
      const c = candles[i]!;
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
      if (isNum(c.volume)) volume = (volume ?? 0) + c.volume;
    }
    out.push({ candle: { open: first.open, high, low, close: last.close, volume }, from, to });
  }
  return out;
}

/**
 * Indices of the points to keep when a line has more than `max` of them:
 * the first, the last, and the minimum and maximum of each bucket between
 * (so the global extremes and every spike survive). Ascending, unique; the
 * whole range when it already fits. Missing values are never chosen as an
 * extreme. At most `max + 2` indices.
 */
export function downsampleIndices(values: readonly (number | null | undefined)[], max: number): number[] {
  const n = values.length;
  const cap = Math.max(4, Math.floor(isNum(max) ? max : n));
  if (n <= cap) return Array.from({ length: n }, (_, i) => i);
  const keep = new Set<number>([0, n - 1]);
  const buckets = Math.max(1, Math.floor((cap - 2) / 2));
  const size = n / buckets;
  for (let b = 0; b < buckets; b += 1) {
    const from = Math.floor(b * size);
    const to = Math.min(n, Math.floor((b + 1) * size));
    let lo = -1;
    let hi = -1;
    for (let i = from; i < to; i += 1) {
      const v = values[i];
      if (!isNum(v)) continue;
      if (lo < 0 || v < (values[lo] as number)) lo = i;
      if (hi < 0 || v > (values[hi] as number)) hi = i;
    }
    if (lo >= 0) keep.add(lo);
    if (hi >= 0) keep.add(hi);
  }
  return [...keep].toSorted((p, q) => p - q);
}

/**
 * Simple moving average over `span` values. Position i is the mean of
 * values i-span+1..i, or `null` when fewer than `span` positions exist or
 * any value in the span is missing (a gap is never averaged as zero).
 */
export function sma(values: readonly (number | null | undefined)[], span: number): (number | null)[] {
  const w = Math.max(1, Math.floor(isNum(span) ? span : 1));
  const out: (number | null)[] = Array.from({ length: values.length }, () => null);
  for (let i = w - 1; i < values.length; i += 1) {
    let sum = 0;
    let ok = true;
    for (let j = i - w + 1; j <= i; j += 1) {
      const v = values[j];
      if (!isNum(v)) {
        ok = false;
        break;
      }
      sum += v;
    }
    if (ok) out[i] = sum / w;
  }
  return out;
}

/**
 * Exponential moving average, smoothing 2 / (span + 1), seeded with the mean
 * of the first `span` real values. A missing value gives `null` at its
 * position and leaves the running average untouched for the next real one.
 */
export function ema(values: readonly (number | null | undefined)[], span: number): (number | null)[] {
  const w = Math.max(1, Math.floor(isNum(span) ? span : 1));
  const k = 2 / (w + 1);
  const out: (number | null)[] = Array.from({ length: values.length }, () => null);
  let prev: number | null = null;
  const seed: number[] = [];
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (!isNum(v)) continue;
    if (prev === null) {
      seed.push(v);
      if (seed.length === w) {
        prev = seed.reduce((a, b) => a + b, 0) / w;
        out[i] = prev;
      }
    } else {
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

/**
 * A series as percent change from its first finite value (that point is 0).
 * Missing stays `null`. A first value of zero cannot be a base: every point is
 * `null` rather than infinite.
 */
export function rebase(values: readonly (number | null | undefined)[]): (number | null)[] {
  const base = values.find(isNum);
  return values.map((v) => (isNum(v) && isNum(base) && base !== 0 ? ((v - base) / Math.abs(base)) * 100 : null));
}

export interface DepthPoint {
  price: number;
  quantity: number;
  /** Quantity from the best price out to and including this level. */
  cumulative: number;
}

/**
 * Order book levels as running totals. Levels that are not a positive finite
 * price with a non-negative finite quantity are dropped. Bids are sorted high
 * to low, asks low to high (the best level first), then accumulated, so the
 * result does not depend on the order given. Equal prices are merged.
 */
export function cumulativeDepth(levels: readonly { price: number; quantity: number }[], side: 'bid' | 'ask'): DepthPoint[] {
  const merged = new Map<number, number>();
  for (const l of levels) {
    if (!isNum(l.price) || !isNum(l.quantity) || l.price <= 0 || l.quantity < 0) continue;
    merged.set(l.price, (merged.get(l.price) ?? 0) + l.quantity);
  }
  const sorted = [...merged.entries()].toSorted((p, q) => (side === 'bid' ? q[0] - p[0] : p[0] - q[0]));
  let total = 0;
  return sorted.map(([price, quantity]) => {
    total += quantity;
    return { price, quantity, cumulative: total };
  });
}
