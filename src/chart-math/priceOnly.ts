/**
 * Price-only charts as pure builders: Renko, Kagi, Point and Figure, Line Break and Range bars. They drop time and keep
 * price movement: an element is drawn only when price has moved enough. Prices come in as decimal strings, all
 * arithmetic is scaled bigint (the scale is the most decimals any input carries) and every output price is a decimal
 * string with that many decimals, so nothing is rounded by floating point. Each element also says which source bars it
 * covers (`fromBar` to `toBar`, and their dates), because the time axis is gone.
 *
 * Rules, and where they come from (TradingView's help is the primary source; the algorithm shapes were learned from
 * d3-kagi, MIT, aticio/renko, MIT, and dhelm-pnf-chart-generator, Apache-2.0; nothing is copied from GPL or LGPL code):
 *   Renko         https://www.tradingview.com/support/solutions/43000502284 : box size fixed or ATR (default 14); a brick
 *                 forms when price moves at least one box beyond the last brick. The reversal needs one box beyond the
 *                 brick's open edge (the classic two-box reversal, as aticio/renko does).
 *   Kagi          https://www.tradingview.com/support/solutions/43000502272 : reversal fixed or percent; lines from
 *                 closes. Yang (thick) and yin (thin) switch when a line passes the previous shoulder or waist (secondary
 *                 source: https://www.luxalgo.com/library/concept/kagi/; d3-kagi does the same).
 *   Point & Figure https://in.tradingview.com/support/solutions/43000502276 : box size, reversal = that many boxes (3 is
 *                 the classic, https://thismatter.com/money/technical-analysis/point-and-figure-charts.htm); X rises, O falls.
 *   Line Break    https://www.tradingview.com/support/solutions/43000502273 : a new line when the close goes past the
 *                 last line's end; a reversal when it goes past the high or low of the last N lines (default 3).
 *   Range bars    every bar's high minus low is exactly the range; a bar closes when price has moved a full range
 *                 from its other extreme and the next bar opens at that close.
 *
 * Choices the sources leave open, made here and stated: the first brick, line or column is anchored on the first
 * close; the source "highlow" feeds each bar's low then high when it closed at or above its open (the previous close
 * when no open is given) and high then low otherwise; an ATR box is Wilder's ATR over the whole series, rounded half up
 * to the prices' decimals and never below one unit of them; the element still forming at the end of the data is not
 * returned. Bad input (a price that is not a decimal string, a zero box) throws a RangeError.
 */

/** One source bar. Prices are decimal strings ("487.50"). `high` and `low` are needed only by the "highlow" source and the ATR box. */
export interface PriceBar {
  /** "YYYY-MM-DD". Oldest first. */
  date: string;
  /** The opening price as a decimal string. */
  open?: string;
  /** The highest price as a decimal string. */
  high?: string;
  /** The lowest price as a decimal string. */
  low?: string;
  /** The closing price as a decimal string. */
  close: string;
}

/** What drives the builder: each bar's close, or its high and low. */
export type PriceSource = 'close' | 'highlow';

/** What every element says about the bars it covers. */
export interface BarSpan {
  /** Index of the first source bar after the previous element formed (0 for the first element). */
  fromBar: number;
  /** Index of the source bar that formed it (or last extended it). */
  toBar: number;
  /** The date of the first source bar it covers ("YYYY-MM-DD"). */
  fromDate: string;
  /** The date of the last source bar it covers ("YYYY-MM-DD"). */
  toDate: string;
}

const DECIMAL = /^([+-]?)(\d+)(?:\.(\d+))?$/;
const decimalsIn = (s: string) => DECIMAL.exec(s)?.[3]?.length ?? 0;

function field(bars: readonly PriceBar[], pick: (b: PriceBar) => string | undefined, name: string): string[] {
  return bars.map((b, i) => {
    const v = pick(b);
    if (typeof v !== 'string' || !DECIMAL.test(v)) throw new RangeError(`Bar ${i} (${b.date}): ${name} must be a decimal string, got ${String(v)}`);
    return v;
  });
}

function toScaled(s: string, scale: number): bigint {
  const m = DECIMAL.exec(s)!;
  const v = BigInt(`${m[2]}${(m[3] ?? '').padEnd(scale, '0')}`);
  return m[1] === '-' ? -v : v;
}

/** A scaled integer as a decimal string with exactly `scale` decimals. */
function text(v: bigint, scale: number): string {
  const neg = v < 0n;
  const digits = (neg ? -v : v).toString().padStart(scale + 1, '0');
  const cut = digits.length - scale;
  return `${neg ? '-' : ''}${digits.slice(0, cut)}${scale > 0 ? `.${digits.slice(cut)}` : ''}`;
}

const floorDiv = (a: bigint, b: bigint) => (a >= 0n || a % b === 0n ? a / b : a / b - 1n);
const abs = (v: bigint) => (v < 0n ? -v : v);
const max = (a: bigint, b: bigint) => (a > b ? a : b);
const min = (a: bigint, b: bigint) => (a < b ? a : b);

interface Prepared {
  scale: number;
  closes: bigint[];
  highs: bigint[] | null;
  lows: bigint[] | null;
  opens: bigint[] | null;
}

function prepare(bars: readonly PriceBar[], extra: string[], needRange: boolean): Prepared {
  const closeS = field(bars, (b) => b.close, 'close');
  const highS = needRange ? field(bars, (b) => b.high, 'high') : null;
  const lowS = needRange ? field(bars, (b) => b.low, 'low') : null;
  const openS = needRange && bars.every((b) => typeof b.open === 'string') ? field(bars, (b) => b.open, 'open') : null;
  const scale = Math.max(0, ...[...closeS, ...(highS ?? []), ...(lowS ?? []), ...(openS ?? []), ...extra].map(decimalsIn));
  const all = (list: string[] | null) => (list ? list.map((s) => toScaled(s, scale)) : null);
  return { scale, closes: all(closeS)!, highs: all(highS), lows: all(lowS), opens: all(openS) };
}

/** The prices a builder walks, in order, each tagged with its bar. */
function walk(p: Prepared, source: PriceSource): { bar: number; price: bigint }[] {
  if (source === 'close') return p.closes.map((price, bar) => ({ bar, price }));
  const out: { bar: number; price: bigint }[] = [];
  p.closes.forEach((close, bar) => {
    const open = p.opens ? p.opens[bar]! : bar > 0 ? p.closes[bar - 1]! : close;
    const hi = p.highs![bar]!;
    const lo = p.lows![bar]!;
    if (close >= open) out.push({ bar, price: lo }, { bar, price: hi });
    else out.push({ bar, price: hi }, { bar, price: lo });
  });
  return out;
}

const spanOf = (bars: readonly PriceBar[], from: number, to: number): BarSpan => ({ fromBar: from, toBar: to, fromDate: bars[from]!.date, toDate: bars[to]!.date });

function boxOf(s: string, scale: number, name: string): bigint {
  if (!DECIMAL.test(s)) throw new RangeError(`${name} must be a decimal string, got ${s}`);
  const v = toScaled(s, scale);
  if (v <= 0n) throw new RangeError(`${name} must be above zero`);
  return v;
}

// ---------------------------------------------------------------------------------------------------------- Renko

export interface RenkoBrick extends BarSpan {
  /** Which way it points. */
  direction: 'up' | 'down';
  /** The price the brick starts from. */
  open: string;
  /** The price it ends at: one box away from `open`. */
  close: string;
}

export interface RenkoOptions {
  /** A fixed box size ("5", "0.25"), or `{ atr: 14 }` for Wilder's ATR over that many bars (needs high and low on the bars). */
  box: string | { atr: number };
  /** Default "close". "highlow" needs high and low on the bars. */
  source?: PriceSource;
}

export interface RenkoResult {
  /** The box size used, as a decimal string (the rounded ATR when `box` was `{ atr }`). */
  boxSize: string;
  /** The bricks, oldest first. */
  bricks: RenkoBrick[];
}

/** Wilder's average true range at the last bar, rounded half up to the prices' decimals, never below one unit of them. */
function atrBox(p: Prepared, period: number): bigint {
  if (!Number.isInteger(period) || period < 1) throw new RangeError('atr period must be a whole number of at least 1');
  const W = 1_000_000n;
  const n = BigInt(period);
  let atr = 0n;
  let sum = 0n;
  for (let i = 0; i < p.closes.length; i += 1) {
    const hi = p.highs![i]!;
    const lo = p.lows![i]!;
    const prev = i > 0 ? p.closes[i - 1]! : null;
    const tr = (prev === null ? hi - lo : max(hi - lo, max(abs(hi - prev), abs(lo - prev)))) * W;
    if (i < period) {
      sum += tr;
      atr = sum / BigInt(i + 1);
    } else atr = (atr * (n - 1n) + tr) / n;
  }
  const rounded = (atr + W / 2n) / W;
  return rounded < 1n ? 1n : rounded;
}

/**
 * Renko bricks. A brick forms each time price reaches one box beyond the last brick's end in its direction, or one box
 * beyond its open edge against it (a reversal skips the brick's own height). One price can form several bricks.
 *
 * @stability beta
 */
export function renkoBricks(bars: readonly PriceBar[], options: RenkoOptions): RenkoResult {
  const atr = typeof options.box === 'object';
  const p = prepare(bars, atr ? [] : [options.box as string], atr || options.source === 'highlow');
  const box = typeof options.box === 'string' ? boxOf(options.box, p.scale, 'box') : bars.length > 0 ? atrBox(p, options.box.atr) : 1n;
  const result: RenkoResult = { boxSize: text(box, p.scale), bricks: [] };
  if (bars.length === 0) return result;
  const anchor = p.closes[0]!;
  let top = anchor;
  let bottom = anchor;
  let dir: 0 | 1 | -1 = 0;
  let last = -1;
  const emit = (up: boolean, from: bigint, to: bigint, bar: number) => {
    result.bricks.push({ direction: up ? 'up' : 'down', open: text(from, p.scale), close: text(to, p.scale), ...spanOf(bars, last === bar ? bar : last + 1, bar) });
    last = bar;
    dir = up ? 1 : -1;
    top = max(from, to);
    bottom = min(from, to);
  };
  for (const { bar, price } of walk(p, options.source ?? 'close')) {
    for (;;) {
      if (dir === 0) {
        if (price >= anchor + box) emit(true, anchor, anchor + box, bar);
        else if (price <= anchor - box) emit(false, anchor, anchor - box, bar);
        else break;
      } else if (dir === 1) {
        if (price >= top + box) emit(true, top, top + box, bar);
        else if (price <= bottom - box) emit(false, bottom, bottom - box, bar);
        else break;
      } else if (price <= bottom - box) emit(false, bottom, bottom - box, bar);
      else if (price >= top + box) emit(true, top, top + box, bar);
      else break;
    }
  }
  return result;
}

// ----------------------------------------------------------------------------------------------------------- Kagi

export type KagiStyle = 'yang' | 'yin';

export interface KagiPart {
  /** The price it starts at, as a decimal string. */
  start: string;
  /** The price it ends at, as a decimal string. */
  end: string;
  /** Yang is the thick line, yin the thin one. */
  style: KagiStyle;
}

export interface KagiLine extends BarSpan {
  /** Which way it points. */
  direction: 'up' | 'down';
  /** Where the line starts (the previous line's end) and where it ends (its shoulder or waist). */
  start: string;
  /** The price it ends at, as a decimal string. */
  end: string;
  /** The line as one or two pieces: it changes thickness where it passes the previous shoulder or waist. */
  parts: KagiPart[];
  /** The style at the line's end. */
  style: KagiStyle;
}

export interface KagiOptions {
  /** A fixed reversal amount ("5"), or `{ percent: "4" }` for that percent of the line's extreme price. */
  reversal: string | { percent: string };
}

/**
 * Kagi lines from closes. A line is extended while closes keep going its way and reverses when a close falls back
 * (or rises back) by the reversal amount from its end. It turns yang (thick) when it passes the previous shoulder
 * and yin (thin) when it passes the previous waist; the first lines, with nothing to pass, are yin.
 *
 * @stability beta
 */
export function kagiLines(bars: readonly PriceBar[], options: KagiOptions): KagiLine[] {
  const pct = typeof options.reversal === 'object' ? options.reversal.percent : null;
  const given = pct ?? (options.reversal as string);
  const p = prepare(bars, pct === null ? [given] : [], false);
  const amount = pct === null ? boxOf(given, p.scale, 'reversal') : boxOf(given, decimalsIn(given), 'reversal percent');
  if (bars.length === 0) return [];
  const pd = 10n ** BigInt(decimalsIn(given));
  // Has price moved `diff` from `ref` far enough to reverse?
  const reached = (diff: bigint, ref: bigint) => (pct === null ? diff >= amount : diff * 100n * pd >= ref * amount);
  interface Raw { up: boolean; start: bigint; end: bigint; from: number; to: number }
  const raw: Raw[] = [];
  let cur: Raw | null = null;
  const base = p.closes[0]!;
  for (let i = 1; i < p.closes.length; i += 1) {
    const c = p.closes[i]!;
    if (cur === null) {
      if (c !== base && reached(abs(c - base), base)) cur = { up: c > base, start: base, end: c, from: 0, to: i };
    } else if (cur.up) {
      if (c > cur.end) {
        cur.end = c;
        cur.to = i;
      } else if (reached(cur.end - c, cur.end)) {
        raw.push(cur);
        cur = { up: false, start: cur.end, end: c, from: cur.to + 1, to: i };
      }
    } else if (c < cur.end) {
      cur.end = c;
      cur.to = i;
    } else if (reached(c - cur.end, cur.end)) {
      raw.push(cur);
      cur = { up: true, start: cur.end, end: c, from: cur.to + 1, to: i };
    }
  }
  if (cur !== null) raw.push(cur);
  let thick = false;
  return raw.map((l, k) => {
    const ref = raw[k - 2]?.end;
    const part = (s: bigint, e: bigint, style: KagiStyle): KagiPart => ({ start: text(s, p.scale), end: text(e, p.scale), style });
    let parts: KagiPart[];
    if (l.up) {
      if (thick) parts = [part(l.start, l.end, 'yang')];
      else if (ref !== undefined && l.end > ref) {
        parts = l.start >= ref ? [part(l.start, l.end, 'yang')] : [part(l.start, ref, 'yin'), part(ref, l.end, 'yang')];
        thick = true;
      } else parts = [part(l.start, l.end, 'yin')];
    } else if (thick && ref !== undefined && l.end < ref) {
      parts = l.start <= ref ? [part(l.start, l.end, 'yin')] : [part(l.start, ref, 'yang'), part(ref, l.end, 'yin')];
      thick = false;
    } else parts = [part(l.start, l.end, thick ? 'yang' : 'yin')];
    return { direction: l.up ? 'up' : 'down', start: text(l.start, p.scale), end: text(l.end, p.scale), parts, style: parts[parts.length - 1]!.style, ...spanOf(bars, l.from, l.to) };
  });
}

// ---------------------------------------------------------------------------------------------- Point and Figure

export interface PointFigureColumn extends BarSpan {
  /** X columns rise, O columns fall. */
  direction: 'x' | 'o';
  /** The lowest and highest box, each named by its bottom edge. */
  low: string;
  /** The highest price as a decimal string. */
  high: string;
  /** How many boxes. */
  boxes: number;
}

export interface PointFigureOptions {
  /** The price one box spans ("5"). */
  box: string;
  /** Boxes of reversal needed to start a column the other way. Default 3. */
  reversal?: number;
  /** "close" (default) or "highlow" (needs high and low on the bars): a column is extended by a bar's high (X) or low (O) before the other side is tried for a reversal. */
  source?: PriceSource;
}

export interface PointFigureResult {
  /** The box size as a decimal string. */
  boxSize: string;
  /** The reversal in boxes. */
  reversal: number;
  /** The columns, oldest first. */
  columns: PointFigureColumn[];
}

/**
 * Point and Figure columns. A price falls in the box whose bottom edge is the multiple of the box size at or below it.
 * An X column rises while prices reach a higher box; it reverses when price falls `reversal` boxes below its top,
 * starting an O column one box under that top (and the mirror for O). A column never both extends and reverses on one bar.
 *
 * @stability beta
 */
export function pointAndFigure(bars: readonly PriceBar[], options: PointFigureOptions): PointFigureResult {
  const reversal = options.reversal ?? 3;
  if (!Number.isInteger(reversal) || reversal < 1) throw new RangeError('reversal must be a whole number of boxes, at least 1');
  const hl = options.source === 'highlow';
  const p = prepare(bars, [options.box], hl);
  const B = boxOf(options.box, p.scale, 'box');
  const result: PointFigureResult = { boxSize: text(B, p.scale), reversal, columns: [] };
  if (bars.length === 0) return result;
  const idx = (v: bigint) => floorDiv(v, B);
  const R = BigInt(reversal);
  interface Col { up: boolean; lo: bigint; hi: bigint; from: number; to: number }
  const cols: Col[] = [];
  let cur: Col | null = null;
  const base = idx(p.closes[0]!);
  for (let bar = 1; bar < bars.length; bar += 1) {
    const ih = idx(hl ? p.highs![bar]! : p.closes[bar]!);
    const il = idx(hl ? p.lows![bar]! : p.closes[bar]!);
    const rose = p.closes[bar]! >= (p.opens ? p.opens[bar]! : p.closes[bar - 1]!);
    const from: number = cur === null ? 0 : cur.to + 1;
    if (cur === null) {
      if (ih > base && (il >= base || rose)) cur = { up: true, lo: base, hi: ih, from, to: bar };
      else if (il < base) cur = { up: false, lo: il, hi: base, from, to: bar };
    } else if (cur.up) {
      if (ih > cur.hi) {
        cur.hi = ih;
        cur.to = bar;
      } else if (il <= cur.hi - R) {
        cols.push(cur);
        cur = { up: false, lo: il, hi: cur.hi - 1n, from, to: bar };
      }
    } else if (il < cur.lo) {
      cur.lo = il;
      cur.to = bar;
    } else if (ih >= cur.lo + R) {
      cols.push(cur);
      cur = { up: true, lo: cur.lo + 1n, hi: ih, from, to: bar };
    }
  }
  if (cur !== null) cols.push(cur);
  result.columns = cols.map((c) => ({ direction: c.up ? 'x' : 'o', low: text(c.lo * B, p.scale), high: text(c.hi * B, p.scale), boxes: Number(c.hi - c.lo) + 1, ...spanOf(bars, c.from, c.to) }));
  return result;
}

// ------------------------------------------------------------------------------------------------------ Line Break

export interface LineBreakLine extends BarSpan {
  /** Which way it points. */
  direction: 'up' | 'down';
  /** A line runs from the previous line's close (its open) to its own close. */
  open: string;
  /** The closing price as a decimal string. */
  close: string;
}

export interface LineBreakOptions {
  /** How many previous lines a close must break to reverse. Default 3. */
  lines?: number;
}

/**
 * Line Break (three-line break by default). The first line joins the first two different closes. After that a close
 * past the last line's end adds a line the same way; a close past the lowest low (after an up line) or the highest high
 * (after a down line) of the last N lines adds a reversal line; anything else adds nothing.
 *
 * @stability beta
 */
export function lineBreak(bars: readonly PriceBar[], options: LineBreakOptions = {}): LineBreakLine[] {
  const N = options.lines ?? 3;
  if (!Number.isInteger(N) || N < 1) throw new RangeError('lines must be a whole number, at least 1');
  const p = prepare(bars, [], false);
  interface L { up: boolean; open: bigint; close: bigint; from: number; to: number }
  const lines: L[] = [];
  let last = -1;
  const add = (up: boolean, open: bigint, close: bigint, bar: number) => {
    lines.push({ up, open, close, from: last + 1, to: bar });
    last = bar;
  };
  for (let i = 1; i < p.closes.length; i += 1) {
    const c = p.closes[i]!;
    const l = lines[lines.length - 1];
    if (l === undefined) {
      if (c !== p.closes[0]) add(c > p.closes[0]!, p.closes[0]!, c, i);
      continue;
    }
    const recent = lines.slice(-N);
    if (l.up) {
      if (c > l.close) add(true, l.close, c, i);
      else if (c < recent.reduce((m, w) => min(m, min(w.open, w.close)), l.close)) add(false, l.close, c, i);
    } else if (c < l.close) add(false, l.close, c, i);
    else if (c > recent.reduce((m, w) => max(m, max(w.open, w.close)), l.close)) add(true, l.close, c, i);
  }
  return lines.map((l) => ({ direction: l.up ? 'up' : 'down', open: text(l.open, p.scale), close: text(l.close, p.scale), ...spanOf(bars, l.from, l.to) }));
}

// ------------------------------------------------------------------------------------------------------ Range bars

export interface PriceRangeBar extends BarSpan {
  /** Up when the bar closed at its high, down when it closed at its low. */
  direction: 'up' | 'down';
  /** The opening price as a decimal string. */
  open: string;
  /** The highest price as a decimal string. */
  high: string;
  /** The lowest price as a decimal string. */
  low: string;
  /** The closing price as a decimal string. */
  close: string;
}

export interface RangeBarOptions {
  /** The fixed high minus low of every bar ("2.50"). */
  range: string;
  /** Default "close". "highlow" needs high and low on the bars. */
  source?: PriceSource;
}

/**
 * Range bars. Each returned bar's high minus low is exactly `range`. A bar closes when price is a full range above its
 * low (closing at that high) or below its high (closing at that low); the next bar opens at the close, and one price
 * can close several bars. The bar still forming at the end of the data is not returned.
 *
 * @stability beta
 */
export function rangeBars(bars: readonly PriceBar[], options: RangeBarOptions): PriceRangeBar[] {
  const p = prepare(bars, [options.range], options.source === 'highlow');
  const R = boxOf(options.range, p.scale, 'range');
  const out: PriceRangeBar[] = [];
  let cur: { open: bigint; hi: bigint; lo: bigint } | null = null;
  let last = -1;
  for (const { bar, price } of walk(p, options.source ?? 'close')) {
    if (cur === null) {
      cur = { open: price, hi: price, lo: price };
      continue;
    }
    for (;;) {
      const hi = max(cur.hi, price);
      const lo = min(cur.lo, price);
      if (hi - lo < R) {
        cur.hi = hi;
        cur.lo = lo;
        break;
      }
      const up: boolean = price - cur.lo >= R;
      const high = up ? cur.lo + R : cur.hi;
      const low = up ? cur.lo : cur.hi - R;
      const close: bigint = up ? high : low;
      out.push({ direction: up ? 'up' : 'down', open: text(min(high, max(low, cur.open)), p.scale), high: text(high, p.scale), low: text(low, p.scale), close: text(close, p.scale), ...spanOf(bars, last === bar ? bar : last + 1, bar) });
      last = bar;
      cur = { open: close, hi: close, lo: close };
    }
  }
  return out;
}
