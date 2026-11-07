/**
 * Volume at price, exactly. Pure and deterministic: the same bars give the same rows, and every volume is a `bigint`
 * (or an integer string), so a profile's rows always sum to the volume it was given (inside the price range).
 *
 * Rows: the price range is cut into `rows` equal bands, lowest price first. A bar's volume is spread over the bands its
 * low to high range crosses, in proportion to the overlap. The split is integer-exact (largest remainder, ties to the
 * lower band), so no volume is lost or invented. A bar with `low === high` goes entirely to the band holding that price.
 * Prices are decimal strings and are compared as scaled integers; no float touches a volume.
 *
 * Point of Control: the band with the most volume. Ties go to the band nearest the middle of the range, then the lower.
 *
 * Value area: starts at the Point of Control and adds one band at a time: the larger of the band just above and the band
 * just below the area (a tie goes to the band nearer the Point of Control, then the upper), until the area holds at least
 * `valueArea` (default 0.7) of the total. Market Profile practice often adds the larger adjacent pair of bands instead, and
 * TradingView's Volume Profile help (https://www.tradingview.com/support/solutions/43000502040-volume-profile/) describes
 * growing the area outward from the Point of Control. TradingView's exact stopping rule was not verified, so this is our
 * documented rule, not a claim of TradingView parity.
 */
import { decimalText, divRound, parseDecimal, percentText, pow10, type ScaledDecimal } from '../internal/exactMath.ts';

export type VolumeInput = bigint | string;

export interface ProfileBar {
  /** Lowest traded price, a decimal string. */
  low: string;
  /** Highest traded price, a decimal string. */
  high: string;
  /** Traded volume: a non-negative `bigint` or integer string. */
  volume: VolumeInput;
  /** The part of `volume` that was buyer-initiated (at most `volume`). The rest is sell volume. Give it on every bar or none. */
  buyVolume?: VolumeInput;
}

export interface VolumeProfileOptions {
  /** Number of price bands, 2 to 200. Default 24. */
  rows?: number;
  /** Fix the price range (so a profile lines up with a chart's price scale). Default: lowest low to highest high. */
  range?: { min: string; max: string };
  /** Share of volume the value area holds, above 0 and up to 1, as a number or decimal string. Default 0.7. */
  valueArea?: number | string;
}

export interface ProfileRow {
  /** 0 is the lowest band. */
  index: number;
  /** The band's lower and upper price, decimal strings (rounded to the input scale for display; the maths is exact). */
  low: string;
  /** The band's upper price. */
  high: string;
  /** Exact volume in the band. */
  volume: bigint;
  /** Buyer-initiated volume. Null unless every bar gave `buyVolume`. */
  buyVolume: bigint | null;
  /** Volume that was not buyer-initiated (`volume - buyVolume`). Null without the split. */
  sellVolume: bigint | null;
  /** Percent of the total, one place ("12.4"); "0.0" when there is no volume. */
  share: string;
  /** True for the Point of Control band. */
  isPoc: boolean;
  /** True for bands inside the value area (the Point of Control included). */
  inValueArea: boolean;
}

export interface ProfileValueArea {
  lowIndex: number;
  highIndex: number;
  /** Lower edge of the lowest band and upper edge of the highest band in the area. */
  low: string;
  high: string;
  volume: bigint;
  /** Percent of the total, one place. */
  share: string;
}

export interface VolumeProfileResult {
  /** The bands, lowest price first. */
  rows: ProfileRow[];
  /** Sum of every band, exact. */
  totalVolume: bigint;
  /** Index of the Point of Control band in `rows`; null when there is no volume. */
  pocIndex: number | null;
  /** The value area; null when there is no volume. */
  valueArea: ProfileValueArea | null;
  /** The price range the bands cover, decimal strings. */
  min: string;
  /** The range's highest price. */
  max: string;
  /** Bars that were left out: bad numbers, `high < low`, negative volume, buy above volume, or wholly outside `range`. */
  skipped: number;
}

const INT = /^\d+$/;
const toVolume = (v: VolumeInput | undefined): bigint | null => {
  if (typeof v === 'bigint') return v >= 0n ? v : null;
  if (typeof v === 'string' && INT.test(v.trim())) return BigInt(v.trim());
  return null;
};

/** Splits `total` over `weights` in proportion, exactly (largest remainder, ties to the lower index). Sums to `total`. */
export function allocateExact(total: bigint, weights: readonly bigint[]): bigint[] {
  const sum = weights.reduce((a, b) => a + b, 0n);
  if (sum === 0n || total === 0n) return weights.map(() => 0n);
  const out = weights.map((w) => (total * w) / sum);
  let left = total - out.reduce((a, b) => a + b, 0n);
  const order = weights
    .map((w, i) => ({ i, r: (total * w) % sum }))
    .toSorted((a, b) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1));
  for (const o of order) {
    if (left === 0n || o.r === 0n) break;
    out[o.i] = out[o.i]! + 1n;
    left -= 1n;
  }
  return out;
}

function parseShare(v: number | string): { n: bigint; d: bigint } {
  const text = typeof v === 'number' ? String(v) : v;
  const p = parseDecimal(text);
  if (!p || p.units <= 0n || p.units > pow10(p.scale)) throw new RangeError('valueArea must be above 0 and at most 1');
  return { n: p.units, d: pow10(p.scale) };
}

interface Parsed { lo: bigint; hi: bigint; v: bigint; b: bigint | null }

/** Volume profile of `bars`. See the file note for the rules. Throws RangeError for bad options; bad bars are skipped. */
export function volumeProfile(bars: readonly ProfileBar[], options: VolumeProfileOptions = {}): VolumeProfileResult {
  const N = Math.min(200, Math.max(2, Math.trunc(options.rows ?? 24)));
  const share = parseShare(options.valueArea ?? 0.7);
  let skipped = 0;
  const raw: { lo: ScaledDecimal; hi: ScaledDecimal; v: bigint; b: bigint | null }[] = [];
  for (const bar of bars) {
    const lo = parseDecimal(String(bar.low));
    const hi = parseDecimal(String(bar.high));
    const v = toVolume(bar.volume);
    const b = bar.buyVolume === undefined ? null : toVolume(bar.buyVolume);
    if (!lo || !hi || v === null || (bar.buyVolume !== undefined && (b === null || b > v))) { skipped += 1; continue; }
    raw.push({ lo, hi, v, b });
  }
  const rangeLo = options.range ? parseDecimal(options.range.min) : null;
  const rangeHi = options.range ? parseDecimal(options.range.max) : null;
  if (options.range && (!rangeLo || !rangeHi)) throw new RangeError('range must be decimal strings');
  let scale = 0;
  for (const r of raw) scale = Math.max(scale, r.lo.scale, r.hi.scale);
  if (rangeLo && rangeHi) scale = Math.max(scale, rangeLo.scale, rangeHi.scale);
  const at = (d: ScaledDecimal) => d.units * pow10(scale - d.scale);
  const parsed: Parsed[] = [];
  for (const r of raw) {
    const lo = at(r.lo);
    const hi = at(r.hi);
    if (hi < lo) { skipped += 1; continue; }
    parsed.push({ lo, hi, v: r.v, b: r.b });
  }
  let min = 0n;
  let max = 0n;
  if (rangeLo && rangeHi) {
    min = at(rangeLo);
    max = at(rangeHi);
    if (max < min) throw new RangeError('range.max must not be below range.min');
  } else if (parsed.length > 0) {
    min = parsed.reduce((m, p) => (p.lo < m ? p.lo : m), parsed[0]!.lo);
    max = parsed.reduce((m, p) => (p.hi > m ? p.hi : m), parsed[0]!.hi);
  }
  const R = max - min;
  const n = BigInt(N);
  const vol = Array.from({ length: N }, () => 0n);
  const buy = Array.from({ length: N }, () => 0n);
  const withSplit = parsed.length > 0 && parsed.every((p) => p.b !== null);
  // Band i spans [min + R*i/N, min + R*(i+1)/N]. Everything below is scaled by N so it stays integer.
  const edge = (i: number) => min * n + R * BigInt(i);
  const indexOf = (p: bigint) => {
    if (R === 0n) return 0;
    return Math.min(N - 1, Math.max(0, Number(((p - min) * n) / R)));
  };
  for (const p of parsed) {
    let alloc: bigint[];
    if (p.lo === p.hi) {
      if (p.lo < min || p.lo > max) { skipped += 1; continue; }
      alloc = Array.from({ length: N }, () => 0n);
      alloc[indexOf(p.lo)] = p.v;
    } else {
      const width = (p.hi - p.lo) * n;
      const w: bigint[] = [];
      let inside = 0n;
      for (let i = 0; i < N; i += 1) {
        const a = p.lo * n > edge(i) ? p.lo * n : edge(i);
        const b = p.hi * n < edge(i + 1) ? p.hi * n : edge(i + 1);
        const o = b > a ? b - a : 0n;
        w.push(o);
        inside += o;
      }
      if (inside === 0n) { skipped += 1; continue; }
      // The last weight is the part of the bar outside the range: it takes its share and the volume is dropped.
      alloc = allocateExact(p.v, [...w, width - inside]).slice(0, N);
    }
    for (let i = 0; i < N; i += 1) vol[i] = vol[i]! + alloc[i]!;
    if (withSplit) {
      const bAlloc = allocateExact(p.b!, alloc);
      for (let i = 0; i < N; i += 1) buy[i] = buy[i]! + bAlloc[i]!;
    }
  }
  const total = vol.reduce((a, b) => a + b, 0n);
  let poc: number | null = null;
  if (total > 0n) {
    poc = 0;
    for (let i = 1; i < N; i += 1) {
      const here = vol[i]!;
      const best = vol[poc]!;
      const better = here > best || (here === best && Math.abs(2 * i - (N - 1)) < Math.abs(2 * poc - (N - 1)));
      if (better) poc = i;
    }
  }
  let va: { lo: number; hi: number; sum: bigint } | null = null;
  if (poc !== null) {
    const target = (total * share.n + share.d - 1n) / share.d;
    let lo = poc;
    let hi = poc;
    let sum = vol[poc]!;
    while (sum < target && (lo > 0 || hi < N - 1)) {
      const upOk = hi < N - 1;
      const downOk = lo > 0;
      let up: boolean;
      if (upOk && downOk) {
        const u = vol[hi + 1]!;
        const d = vol[lo - 1]!;
        up = u !== d ? u > d : hi + 1 - poc <= poc - (lo - 1);
      } else up = upOk;
      if (up) { hi += 1; sum += vol[hi]!; } else { lo -= 1; sum += vol[lo]!; }
    }
    va = { lo, hi, sum };
  }
  const price = (num: bigint) => decimalText(divRound(num, n), scale);
  const rows: ProfileRow[] = vol.map((v, i) => ({
    index: i,
    low: price(edge(i)),
    high: price(edge(i + 1)),
    volume: v,
    buyVolume: withSplit ? buy[i]! : null,
    sellVolume: withSplit ? v - buy[i]! : null,
    share: total === 0n ? '0.0' : percentText(v, total, 1),
    isPoc: i === poc,
    inValueArea: va !== null && i >= va.lo && i <= va.hi,
  }));
  return {
    rows,
    totalVolume: total,
    pocIndex: poc,
    valueArea: va && {
      lowIndex: va.lo,
      highIndex: va.hi,
      low: rows[va.lo]!.low,
      high: rows[va.hi]!.high,
      volume: va.sum,
      share: percentText(va.sum, total, 1),
    },
    min: decimalText(min, scale),
    max: decimalText(max, scale),
    skipped,
  };
}
