'use client';

/**
 * CandlestickChart: open, high, low and close per session as candles (or OHLC
 * bars), with an optional volume pane and moving averages. Drawn as SVG, owned
 * here, no chart library, on ChartA11yShell (one focus stop, live region,
 * hint, summary and a hidden table, the same path as every native chart).
 *
 * Edge cases are decided, not accidents:
 *   empty         no candle to draw prints `labels.empty`; no axes.
 *   single        one candle, centred, at normal width.
 *   constant      high = low = open = close draws a one pixel mark on a widened scale.
 *   bad candle    a candle with a non-finite price, or with low above open or
 *                 close, or high below them, is not drawn (a wrong wick is worse
 *                 than none). It is counted in `labels.skipped` under the chart
 *                 and kept in the data table with the reason.
 *   no volume     the pane is left out when no candle has a volume; a candle
 *                 without one has no bar and "none" in the table.
 *   gaps          the default axis is by session, so Saturdays, holidays and
 *                 suspensions leave no hole; `axis="time"` spaces by date.
 *   many candles  more candles than the width has room for (3px each) are
 *                 aggregated into buckets: first open, last close, extreme high
 *                 and low, summed volume. The table keeps every candle.
 *   log, percent  a scale that cannot hold the prices (log needs prices above
 *                 zero, percent and indexed a first close above zero) falls
 *                 back to linear and says so under the chart.
 *
 * Price modes (`mode`): candles, hollow, bars, heikin-ashi, line, area,
 * baseline and high-low. Hollow follows TradingView: the body is hollow when
 * the close is above the open and filled otherwise, while the colour says
 * whether the close is above or below the previous close. Heikin Ashi is
 * `heikinAshi()` in chart-math.
 *
 * Interaction: the pointer shows a crosshair and a readout; the plot is a
 * focus stop and Left, Right, Home, End and Escape move through the candles;
 * with `events`, Shift plus Left or Right jumps to the previous or next event.
 * The focused candle's open, high, low, close and volume (and the indicators,
 * compared series and events at it) are announced through a polite live
 * region. Direction is never colour alone: the readout, live region and table
 * spell it out, and a hollow or filled body, the marker shapes and the line
 * dashes carry it in the drawing. A visually hidden table lists every candle.
 */
import { memo, useMemo, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

import { ChartA11yShell } from '../chart-a11y/ChartA11yShell.tsx';
import { bandScale, ema, niceTicks, reduceCandles, timeScale, validateOhlc, type OhlcIssue } from '../chart-math/chartMath.ts';
import { ChartTooltip, clamp, isNum, nprPrice, quantity, shortDate, thinned, useMeasuredWidth } from '../internal/chartFrame.tsx';
import type { CandlestickLayer, CandlestickScale, CandlestickTransform, CompareSeries, LegendEntry, PriceScalesEngine } from './extensionTypes.ts';
import type { ChartIndicator } from './indicatorTypes.ts';
import { SERIES_TONES } from './seriesTones.ts';

export type { CandlestickLayer, CandlestickScale, TradingEngine, TradingModel, TradingPlaced, CandlestickTransform, CompareLine, CompareSeries, LayerContext, LayerModel, PriceScalesEngine } from './extensionTypes.ts';
export type { ChartIndicator, IndicatorInput, IndicatorLine, IndicatorResult, IndicatorViewProps } from './indicatorTypes.ts';

export interface Candle {
  /** The session's date as "YYYY-MM-DD". Sorted by it when `axis="time"`. */
  date: string;
  /** Opening price. */
  open: number;
  /** Highest price of the session. */
  high: number;
  /** Lowest price of the session. */
  low: number;
  /** Closing price. */
  close: number;
  /** Shares traded. Missing, null and non-finite mean no volume. */
  volume?: number | null;
}

export interface MovingAverage {
  /** 'sma' (simple) or 'ema' (exponential), over closes. */
  type: 'sma' | 'ema';
  /** Sessions in the window, at least 2. */
  window: number;
  /** Its name in the legend and the readout. Default "SMA 20". */
  label?: string;
}

/** How the price is drawn. */
export type CandlestickMode = 'candles' | 'hollow' | 'bars' | 'heikin-ashi' | 'line' | 'area' | 'baseline' | 'high-low';

export interface CandlestickChartLabels {
  /** Printed when there is nothing to draw. Default "No data". */
  empty?: ReactNode;
  /** Table heads. */
  date?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  volume?: string;
  /** Table head of the problem column. Default "Problem". */
  problem?: string;
  /** A volume a candle did not have. Default "none". */
  none?: string;
  /** Under the chart: how many candles were not drawn. Default "N candles not drawn: inconsistent prices". */
  skipped?: (count: number) => string;
  /** Spoken direction of a candle. Default up, down, unchanged. */
  up?: string;
  down?: string;
  flat?: string;
  /** The keyboard hint read once with the chart's name. */
  hint?: string;
  /** Said when a table is cut to the latest candles. Default "Showing the latest N of M candles". */
  truncated?: (shown: number, total: number) => string;
  /** The reasons a candle is not drawn, by code. */
  issues?: Partial<Record<OhlcIssue, string>>;
  /** Table head of the direction column (added when `mode` is set). Default "Direction". */
  direction?: string;
  /** Spoken body of a candle in `hollow` mode. Default "hollow body" (closed above its open) and "filled body". */
  hollowBody?: string;
  filledBody?: string;
  /** Names of the modes, for the summary. */
  modes?: Partial<Record<CandlestickMode, string>>;
  /** Names of the scales, for the summary and the table head of the scaled close. */
  scales?: Partial<Record<CandlestickScale, string>>;
  /** Under the chart when the scale asked for cannot hold the prices. Default "This scale needs prices above zero; showing a linear scale." */
  scaleFallback?: string;
  /** Under the chart when `compare` moved the axis to percent. Default "Comparing: the axis shows percent change from the first close." */
  compareNote?: string;
  /** Spoken name of the real close next to a Heikin Ashi candle. Default "Actual close". */
  actualClose?: string;
}

export interface CandlestickChartProps {
  /** Sessions, oldest first. */
  candles: readonly Candle[];
  /** Names the chart and its data table. */
  label: string;
  /** How the price is drawn. Default 'candles' (or 'bars' with the older `variant="bars"`). 'heikin-ashi' needs `transform={heikinAshiTransform}` (from `@punji/ui/heikin-ashi`) and smooths the candles, the table and the readout carry the exact Heikin Ashi values; 'line', 'area' and 'baseline' draw the close ('baseline' adds its gain and loss fill with `layers={[baselineLayer()]}` from `@punji/ui/candlestick-baseline`); 'high-low' draws each session's range. */
  mode?: CandlestickMode;
  /** The older way to pick OHLC bars: `variant="bars"` is `mode="bars"`. `mode` wins when both are given. */
  variant?: 'candles' | 'bars';
  /** The price axis: 'linear' (default), 'log', 'percent' (change from the first close) or 'indexed' (first close is 100). Needs `scales={priceScales}`. With `compare`, a linear or log scale becomes percent. */
  scale?: CandlestickScale;
  /** The engine behind `scale` and `compare`: pass `priceScales` from `@punji/ui/price-scales`. Without it the axis is linear and `scale` and `compare` are ignored, so a plain chart does not ship the log, percent and indexed maths. */
  scales?: PriceScalesEngine;
  /** Replaces the candles drawn by `mode="heikin-ashi"`: pass `heikinAshiTransform` from `@punji/ui/heikin-ashi`. Without it that mode draws plain candles. */
  transform?: CandlestickTransform;
  /** Extra layers: `eventsLayer(events)` from `@punji/ui/candlestick-events` (dividends, splits, earnings, your own marks; Shift and the arrow keys jump between them) and `levelsLayer(levels)` from `@punji/ui/candlestick-levels` (support, resistance, cost basis). Each is its own module, so only the ones you import ship. */
  layers?: readonly CandlestickLayer[];
  /** Other instruments drawn as lines over the price, started level with the price on their first date. Needs a first close above zero. */
  compare?: readonly CompareSeries[];
  /** Indicators: panes below the price or lines over it. Build them with `rsiIndicator`, `macdIndicator`, `bollingerIndicator`, `vwapIndicator` (each its own module, so only the ones you import ship). */
  indicators?: readonly ChartIndicator[];
  /** Price pane height in CSS px, clamped to 140..640. Default 280. */
  height?: number;
  /** Show the volume pane. Default true when any candle has a volume. */
  volume?: boolean;
  /** 'category' (default): one slot per session, no holes for non-trading days. 'time': spaced by date. */
  axis?: 'category' | 'time';
  /** Draw up candles as outlines and down candles filled, so direction survives without colour. */
  hollowUp?: boolean;
  /** Per-instance override of which hue means up: 'green-up' or 'red-up' (absolute, never a second swap on top of the theme). Default: follow the theme's gain and loss colours (`createTheme({ finance })`), which is the one place to set the convention. */
  convention?: 'green-up' | 'red-up';
  /** Moving averages over closes, drawn over the candles. */
  averages?: readonly MovingAverage[];
  /** How a price is printed. Default: en-IN NPR through the money formatter ("NPR 487.50"). Pass your own to change currency or locale, for example `price => formatter.format(BigInt(Math.round(price * 100)))`. */
  formatPrice?: (price: number) => string;
  /** How a volume is printed. Default grouped whole shares. */
  formatVolume?: (volume: number) => string;
  /** How a date is printed on the axis and in the readout. Default "14 Nov". */
  formatDate?: (date: string) => string;
  /** The latest candles listed in the hidden table (the chart always uses all). Default 500. */
  tableLimit?: number;
  /** Overrides for the printed and spoken words. */
  labels?: CandlestickChartLabels;
  /** Test id on the figure. */
  testId?: string;
}

/** Least room per candle; beyond it candles are aggregated. */
const MIN_PX = 3;
const AXIS_H = 22;
const MAX_BODY = 24;

interface Item {
  candle: Candle;
  /** The real (not Heikin Ashi) close of the last session in the item. */
  realClose: number;
  /** Index of the first source candle in `valid` and of the last, when aggregated. */
  from: number;
  to: number;
  time: number;
}

type Dir = 'up' | 'down' | 'flat';
const dirOf = (c: { open: number; close: number }): Dir => (c.close > c.open ? 'up' : c.close < c.open ? 'down' : 'flat');
const cmp = (a: number, b: number): Dir => (a > b ? 'up' : a < b ? 'down' : 'flat');

const DEFAULT_ISSUES: Record<OhlcIssue, string> = {
  'not-finite': 'a price is missing or not a number',
  'high-below-low': 'high is below low',
  'high-below-body': 'high is below open or close',
  'low-above-body': 'low is above open or close',
  'negative-volume': 'volume is negative',
};

/*
 * Live data replaces one candle at a time (the forming session), so the checks
 * of a candle are kept per candle object: a new array with 99,999 of the same
 * candles re-checks one. The entry remembers the values it checked, so a
 * candle changed in place is checked again; a new entry (a new identity) is
 * also what tells a table row to re-render.
 */
interface CheckEntry { open: number; high: number; low: number; close: number; volume: Candle['volume']; date: string; issues: OhlcIssue[]; time: number }
const checks = new WeakMap<Candle, CheckEntry>();
const NO_ISSUES: OhlcIssue[] = [];
function checkOf(c: Candle): CheckEntry {
  const r = checks.get(c);
  if (r && r.open === c.open && r.high === c.high && r.low === c.low && r.close === c.close && r.volume === c.volume && r.date === c.date) return r;
  const next: CheckEntry = { open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume, date: c.date, issues: validateOhlc(c), time: Date.parse(c.date) };
  if (next.issues.length === 0) next.issues = NO_ISSUES;
  if (typeof c === 'object' && c !== null) checks.set(c, next);
  return next;
}

/** The simple moving average at index i only (the mean of i-w+1..i, null on a gap); the same sum, in the same order, as sma(). */
function smaAt(values: readonly number[], w: number, i: number): number | null {
  if (i < w - 1) return null;
  let sum = 0;
  for (let j = i - w + 1; j <= i; j += 1) {
    const v = values[j];
    if (!isNum(v)) return null;
    sum += v;
  }
  return sum / w;
}

/** Round linear ticks: the axis when no scales engine is given. */
const identity = (v: number) => v;
const linearTicks = (lo: number, hi: number, count: number, formatPrice: (price: number) => string) => {
  const t = niceTicks(lo, hi, count);
  return { tickT: t.ticks, loT: t.lo, hiT: t.hi, text: t.ticks.map(formatPrice) };
};

/**
 * @stability beta
 */
export function CandlestickChart(props: CandlestickChartProps) {
  const { candles, label, labels, testId } = props;
  const checked = useMemo(() => candles.map((c, i) => {
    const entry = checkOf(c);
    return { c, i, issues: entry.issues, time: entry.time, entry };
  }), [candles]);
  const timeAxis = props.axis === 'time';
  const valid = useMemo(() => {
    const ok = checked.filter((x) => x.issues.length === 0 && (!timeAxis || Number.isFinite(x.time)));
    return timeAxis ? ok.toSorted((p, q) => p.time - q.time) : ok;
  }, [checked, timeAxis]);
  if (valid.length === 0) {
    return (
      <ChartA11yShell className="kit-ct empty" label={label} roleDescription="candlestick chart" count={0} speak={() => ''} interactive={false} testId={testId}
        table={checked.length > 0 ? <DataTable {...props} checked={checked} extraHeads={[]} extras={null} /> : null}>
        {() => <p className="kit-ct-empty">{labels?.empty ?? 'No data'}</p>}
      </ChartA11yShell>
    );
  }
  return <Plot {...props} checked={checked} valid={valid} />;
}

type Checked = { c: Candle; i: number; issues: OhlcIssue[]; time: number; entry: object };

function Plot({ candles, label, mode: modeProp, variant = 'candles', scale: scaleProp = 'linear', compare = [], scales, transform, layers = [], indicators = [], height = 280, volume, axis = 'category', hollowUp = false, convention, averages = [], formatPrice = nprPrice, formatVolume = quantity, formatDate = shortDate, labels, testId, checked, valid, tableLimit = 500 }: CandlestickChartProps & { checked: Checked[]; valid: Checked[] }) {
  const { ref, width } = useMeasuredWidth(640);
  const none = labels?.none ?? 'none';
  const mode: CandlestickMode = modeProp ?? (variant === 'bars' ? 'bars' : 'candles');
  const bodyMode = mode === 'candles' || mode === 'hollow' || mode === 'bars' || mode === 'heikin-ashi';
  const drawsBody = bodyMode || mode === 'high-low';
  const hasVolume = valid.some((x) => isNum(x.c.volume));
  const showVolume = (volume ?? true) && hasVolume;
  const priceH = clamp(isNum(height) ? height : 280, 140, 640);
  const volH = showVolume ? Math.round(clamp(priceH * 0.22, 44, 96)) : 0;
  const gap = showVolume ? 10 : 0;
  const top = 8;
  const plotH = priceH;

  // The engine rides in on whichever opt-in module was imported (an indicator, a layer, the scales or the transform); a plain chart has none.
  const engine = [scales, transform, ...indicators, ...layers].find((x) => x?.engine)?.engine;
  // The sessions as drawn: a transform (Heikin Ashi) replaces the candles, over every session before any grouping.
  const tf = engine && mode === 'heikin-ashi' ? transform : undefined;
  const drawn = useMemo<Candle[]>(() => {
    const src = valid.map((x) => x.c);
    return tf ? tf.apply(src) : src;
  }, [valid, tf]);

  // Aggregate when the width has no room (3px each) for every candle.
  const items = useMemo(() => {
    const labelsW = 64;
    const plotW = Math.max(40, width - labelsW);
    const cap = Math.max(1, Math.floor(plotW / MIN_PX));
    if (valid.length <= cap) return valid.map((x, k): Item => ({ candle: drawn[k]!, realClose: x.c.close, from: k, to: k, time: x.time }));
    return reduceCandles(drawn, cap).map((b): Item => {
      const first = valid[b.from]!;
      return { candle: { ...b.candle, date: first.c.date }, realClose: valid[b.to]!.c.close, from: b.from, to: b.to, time: first.time };
    });
  }, [valid, drawn, width]);
  const aggregated = items.length < valid.length;

  const lines = useMemo(() => {
    if (averages.length === 0) return [];
    const closes = valid.map((x) => x.c.close);
    return averages.map((a, k) => {
      const w = Math.max(2, Math.floor(a.window) || 2);
      // A simple average is only needed where a mark is drawn (a few hundred points, not every candle); an exponential one carries through every close.
      const full = a.type === 'ema' ? ema(closes, w) : null;
      return { label: a.label ?? `${a.type.toUpperCase()} ${w}`, tone: SERIES_TONES[k % 3]!, values: items.map((it) => (full ? (full[it.to] ?? null) : smaAt(closes, w, it.to))) };
    });
  }, [averages, valid, items]);

  // Scale, compared lines, indicators, layers: the engine's, when any opt-in module was imported.
  const m = useMemo(() => engine?.model({ label, valid, items, drawn, scaleProp, scales, transform: tf, compare, indicators, labels, formatPrice, none, toneOffset: averages.length }), [engine, label, valid, items, drawn, scaleProp, scales, tf, compare, indicators, labels, formatPrice, none, averages.length]);
  const T = m?.T ?? identity;
  const fmt = m?.fmt ?? formatPrice;

  // The price domain, in the scale's units.
  const closeOnly = mode === 'line' || mode === 'area' || mode === 'baseline';
  let lo = Infinity;
  let hi = -Infinity;
  const take = (v: number | null | undefined) => {
    if (v === null || v === undefined || !Number.isFinite(v)) return;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  };
  for (const it of items) {
    if (closeOnly) take(T(it.candle.close));
    else {
      lo = Math.min(lo, T(it.candle.low));
      hi = Math.max(hi, T(it.candle.high));
    }
  }
  m?.points.forEach(take);

  const count = Math.max(3, Math.round(plotH / 56));
  const { tickT, loT, hiT, text: tickText } = m?.ticks(lo, hi, count) ?? linearTicks(lo, hi, count, formatPrice);
  const axisW = Math.min(120, Math.max(...tickText.map((t) => t.length)) * 7 + 12);
  const x0 = 4;
  const x1 = Math.max(x0 + 20, width - axisW);
  const yOf = (t: number) => top + plotH - ((t - loT) / (hiT - loT || 1)) * plotH;
  const py = (p: number) => yOf(T(p));
  const volMax = Math.max(1, ...items.map((it) => (isNum(it.candle.volume) ? it.candle.volume : 0)));
  const volTop = top + plotH + gap;
  const volY = (v: number) => volTop + volH - (v / volMax) * volH;

  const volBottom = volTop + volH;

  const band = bandScale(items.length, x0, x1, 0.25);
  const time = axis === 'time' ? timeScale(items.map((it) => it.time), x0, x1) : null;
  const cx = (k: number) => (time ? time.x(items[k]!.time) : band.center(k));
  const slot = time ? time.step : band.step;
  const body = clamp(slot * 0.72, 1, MAX_BODY);
  const labelIdx = thinned(items.length, slot, 76);
  const indexAt = (px: number) => (time ? time.nearest(px) : band.indexAt(px));

  // The engine places panes and layers under the price and volume, and gives back its drawing and words.
  const placed = m?.place({ layers, formatDate, cx, yOf, loT, hiT, top, plotH, x0, x1, body, volBottom });
  const plotBottom = placed?.paneBottom ?? volBottom;
  const svgH = (placed?.bottom ?? volBottom) + AXIS_H;

  const words = { up: labels?.up ?? 'up', down: labels?.down ?? 'down', flat: labels?.flat ?? 'unchanged' };
  const L = { date: labels?.date ?? 'Date', open: labels?.open ?? 'Open', high: labels?.high ?? 'High', low: labels?.low ?? 'Low', close: labels?.close ?? 'Close', volume: labels?.volume ?? 'Volume' };
  const modeName = labels?.modes?.[mode] ?? mode.replace('-', ' ');
  const dateText = (it: Item) => {
    const end = valid[it.to]!.c.date;
    return it.from === it.to ? formatDate(it.candle.date) : `${formatDate(it.candle.date)} – ${formatDate(end)}`;
  };

  // Direction of an item: the body for candles and bars, the move from the previous close otherwise.
  const prevBased = mode === 'hollow' || !bodyMode;
  const dirAt = (k: number): { dir: Dir; pct: number | null } => {
    const c = items[k]!.candle;
    const prev = k > 0 ? items[k - 1]!.candle.close : null;
    const [a, b] = prevBased && prev !== null ? [prev, c.close] : [c.open, c.close];
    return { dir: cmp(b, a), pct: a !== 0 ? Math.abs((b - a) / a) * 100 : null };
  };
  const bodyHollow = (k: number) => items[k]!.candle.close > items[k]!.candle.open;

  const spoken = (k: number) => {
    const it = items[k]!;
    const c = it.candle;
    const { dir, pct } = dirAt(k);
    const move = dir === 'flat' || pct === null ? '' : ` ${pct.toFixed(2)}%`;
    const head = `${dateText(it)}: ${words[dir]}${move}`;
    const parts = [head];
    if (mode === 'hollow') parts.push(bodyHollow(k) ? (labels?.hollowBody ?? 'hollow body') : (labels?.filledBody ?? 'filled body'));
    if (closeOnly) parts.push(`${L.close} ${fmt(c.close)}`);
    else {
      parts.push(`${L.open} ${fmt(c.open)}`, `${L.high} ${fmt(c.high)}`, `${L.low} ${fmt(c.low)}`, `${L.close} ${fmt(c.close)}`);
    }
    if (hasVolume) parts.push(`${L.volume} ${isNum(c.volume) ? formatVolume(c.volume) : none}`);
    if (placed) parts.push(...placed.speak(k));
    return parts.join(', ');
  };

  const skipped = checked.length - valid.length;
  const skippedText = (labels?.skipped ?? ((n: number) => `${n} ${n === 1 ? 'candle' : 'candles'} not drawn: inconsistent prices`))(skipped);
  const toneOf = (k: number): string => {
    if (mode === 'high-low') return 'neutral';
    const { dir } = dirAt(k);
    return dir === 'up' ? 'gain' : dir === 'down' ? 'loss' : 'flat';
  };

  // The spoken summary of the whole chart.
  const firstClose = valid[0]!.c.close;
  const lastClose = valid[valid.length - 1]!.c.close;
  const overall = firstClose !== 0 ? ((lastClose - firstClose) / Math.abs(firstClose)) * 100 : null;
  const summary = [
    `${valid.length} sessions from ${formatDate(valid[0]!.c.date)} to ${formatDate(valid[valid.length - 1]!.c.date)}, drawn as ${modeName}${m && m.scale !== 'linear' ? ` on a ${m.scaleName} scale` : ''}.`,
    `Last close ${formatPrice(lastClose)}${overall === null ? '' : `, ${words[cmp(lastClose, firstClose)]} ${Math.abs(overall).toFixed(2)}% over the period`}.`,
    ...(placed?.summary ?? []),
  ].filter(Boolean).join(' ');

  const baseHint = labels?.hint ?? 'Use the left and right arrow keys to move between candles, Home and End to jump to the first and last.';
  const hint = [baseHint, ...(placed?.hint ?? [])].join(' ');

  // Table columns beyond the six every table has: they appear only for the options that add figures.
  const tableCols = useMemo(() => {
    const heads: string[] = [];
    const get: ((v: number) => string)[] = [];
    if (modeProp !== undefined) {
      heads.push(labels?.direction ?? 'Direction');
      get.push((v) => {
        const c = drawn[v]!;
        const prev = v > 0 ? drawn[v - 1]!.close : null;
        const dir = prevBased && prev !== null ? cmp(c.close, prev) : dirOf(c);
        return `${words[dir]}${mode === 'hollow' ? `, ${c.close > c.open ? (labels?.hollowBody ?? 'hollow body') : (labels?.filledBody ?? 'filled body')}` : ''}`;
      });
    }
    for (const c of m?.columns ?? []) {
      heads.push(c.head);
      get.push(c.get);
    }
    return { heads, get };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- words are read through the labels prop
  }, [modeProp, mode, drawn, m, labels, prevBased]);
  const extras = useMemo(() => {
    if (tableCols.heads.length === 0) return null;
    const at = new Map<number, number>();
    valid.forEach((x, v) => at.set(x.i, v));
    return { at, cells: valid.map((_, v) => tableCols.get.map((g) => g(v))) };
  }, [tableCols, valid]);

  const maLegend: LegendEntry[] = lines.map((l) => ({ label: l.label, tone: l.tone, dash: '' }));
  const legend = m ? m.legend(maLegend, label) : maLegend;

  const style: CSSProperties = { height: svgH };
  return (
    <ChartA11yShell
      className="kit-ct"
      label={label}
      roleDescription="candlestick chart"
      count={items.length}
      speak={spoken}
      hint={hint}
      summary={summary}
      testId={testId}
      dataAttrs={{ 'data-convention': convention }}
      footer={(
        <>
          {aggregated && <p className="kit-ct-note">{`${valid.length} sessions shown as ${items.length} groups`}</p>}
          {skipped > 0 && <p className="kit-ct-note" role="note">{skippedText}</p>}
          {placed?.notes}
        </>
      )}
      table={(
        <>
          <DataTable candles={candles} label={label} labels={labels} formatPrice={formatPrice} formatVolume={formatVolume} formatDate={formatDate} checked={checked} tableLimit={tableLimit} extraHeads={tableCols.heads} extras={extras} />
          {placed?.table}
        </>
      )}
    >
      {(ctx) => {
        const active = ctx.index === null ? null : items[ctx.index]!;
        const activeX = active ? cx(ctx.index!) : 0;
        const onPointer = (e: PointerEvent<HTMLDivElement>) => {
          const r = e.currentTarget.getBoundingClientRect();
          ctx.pointerTo(items.length ? indexAt(e.clientX - r.left) : null);
        };
        const plot = ctx.plotProps(onPointer);
        const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
          if (!placed?.onKey(e, ctx.index, items.length, ctx.moveTo)) plot.onKeyDown?.(e);
        };
        const activeDir = active ? dirAt(ctx.index!).dir : 'flat';
        const closeY = active ? py(active.candle.close) : 0;
        const closePath = items.map((it, k) => `${k === 0 ? 'M' : 'L'}${cx(k).toFixed(1)},${py(it.candle.close).toFixed(1)}`).join(' ');
        return (
          <>
            {legend.length > 0 && (
              <ul className="kit-ct-legend" aria-hidden="true">
                {legend.map((l) => (
                  <li key={l.label}><i style={{ background: l.dash ? `repeating-linear-gradient(90deg, ${l.tone} 0 5px, transparent 5px 8px)` : l.tone }} />{l.label}</li>
                ))}
              </ul>
            )}
            <div ref={ref} className="kit-ct-area" style={style}>
              {/* The plot is the one focus stop: arrow keys move through the data, the pointer reads it. */}
              {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
              <div className="kit-ct-plot" {...plot} onKeyDown={onKeyDown}>
                <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false" data-testid={testId ? `${testId}-svg` : undefined}>
                  {tickT.map((t, k) => (
                    <g key={t}>
                      <line className="kit-ct-grid" x1={x0} x2={x1} y1={yOf(tickT[k]!)} y2={yOf(tickT[k]!)} />
                      <text className="kit-ct-axis" x={x1 + 8} y={yOf(tickT[k]!)} dominantBaseline="middle">{tickText[k]}</text>
                    </g>
                  ))}
                  {showVolume && <line className="kit-ct-grid" x1={x0} x2={x1} y1={volTop + volH} y2={volTop + volH} />}
                  {mode === 'area' && <path className="pu-ct-fill" d={`${closePath} L${cx(items.length - 1).toFixed(1)},${top + plotH} L${cx(0).toFixed(1)},${top + plotH} Z`} />}
                  {placed?.below}
                  {items.map((it, k) => {
                    const c = it.candle;
                    const hollow = mode === 'hollow' ? bodyHollow(k) : hollowUp && dirOf(c) === 'up';
                    return (
                      <CandleMark key={`${it.candle.date}-${k}`} variant={mode === 'bars' ? 'bars' : drawsBody ? (mode === 'high-low' ? 'highlow' : 'candles') : 'none'} tone={toneOf(k)} dir={dirOf(c)} hollow={hollow} solid={mode === 'hollow' && !hollow} x={cx(k)} body={body}
                        yo={py(c.open)} yc={py(c.close)} yh={py(c.high)} yl={py(c.low)}
                        volY={showVolume && isNum(c.volume) ? volY(c.volume) : null} volBase={volTop + volH} volPositive={isNum(c.volume) && c.volume > 0} />
                    );
                  })}
                  {closeOnly && (
                    <>
                      <path className="pu-ct-price" d={closePath} />
                      {items.length === 1 && <circle className="pu-ct-dot" cx={cx(0)} cy={py(items[0]!.candle.close)} r={3} />}
                    </>
                  )}
                  {placed?.lines}
                  {lines.map((l) => (
                    <path key={l.label} className="kit-ct-ma" stroke={l.tone} d={l.values.map((v, k) => (v === null ? '' : `${k === 0 || l.values[k - 1] === null ? 'M' : 'L'}${cx(k).toFixed(1)},${yOf(v).toFixed(1)}`)).join(' ')} />
                  ))}
                  {placed?.over(ctx.index)}
                  {labelIdx.map((k) => (
                    <text key={k} className="kit-ct-axis" x={clamp(cx(k), x0 + 24, x1 - 24)} y={svgH - 6} textAnchor="middle">{formatDate(items[k]!.candle.date)}</text>
                  ))}
                  {active && (
                    <g className="kit-ct-cross">
                      <line x1={activeX} x2={activeX} y1={top} y2={plotBottom} />
                      <line x1={x0} x2={x1} y1={closeY} y2={closeY} />
                      <rect x={x1 + 2} y={closeY - 9} width={axisW - 4} height={18} rx={3} />
                      <text x={x1 + 8} y={closeY} dominantBaseline="middle">{(m?.priceText ?? formatPrice)(active.candle.close)}</text>
                    </g>
                  )}
                </svg>
                {active && (
                  <ChartTooltip x={activeX} width={width} testId={testId ? `${testId}-tip` : undefined}>
                    <b>{dateText(active)}</b>
                    <dl>
                      {!closeOnly && (
                        <>
                          <dt>{L.open}</dt><dd>{fmt(active.candle.open)}</dd>
                          <dt>{L.high}</dt><dd>{fmt(active.candle.high)}</dd>
                          <dt>{L.low}</dt><dd>{fmt(active.candle.low)}</dd>
                        </>
                      )}
                      <dt>{L.close}</dt><dd className={`kit-ct-${activeDir === 'flat' ? 'flat' : activeDir === 'up' ? 'gain' : 'loss'}`}>{fmt(active.candle.close)}</dd>
                      {hasVolume && (<><dt>{L.volume}</dt><dd>{isNum(active.candle.volume) ? formatVolume(active.candle.volume) : none}</dd></>)}
                      {placed?.rows(ctx.index!).map(([a, b], n) => <div key={n}><dt>{a}</dt><dd>{b}</dd></div>)}
                    </dl>
                  </ChartTooltip>
                )}
              </div>
            </div>
          </>
        );
      }}
    </ChartA11yShell>
  );
}


interface MarkProps {
  variant: 'candles' | 'bars' | 'highlow' | 'none';
  tone: string;
  dir: Dir;
  hollow: boolean;
  solid: boolean;
  x: number;
  body: number;
  yo: number;
  yc: number;
  yh: number;
  yl: number;
  volY: number | null;
  volBase: number;
  volPositive: boolean;
}

/** One candle (or OHLC bar, or high-low range) and its volume bar, from pixel positions only: a live tick that moves one candle re-renders one mark, not hundreds. */
const CandleMark = memo(function CandleMark({ variant, tone, dir, hollow, solid, x, body, yo, yc, yh, yl, volY, volBase, volPositive }: MarkProps) {
  return (
    <g className={`kit-ct-c ${tone}`} data-dir={dir}>
      {variant === 'bars' && (
        <>
          <line x1={x} x2={x} y1={yh} y2={yl} />
          <line x1={x - body / 2} x2={x} y1={yo} y2={yo} />
          <line x1={x} x2={x + body / 2} y1={yc} y2={yc} />
        </>
      )}
      {variant === 'candles' && (
        <>
          <line x1={x} x2={x} y1={yh} y2={yl} />
          <rect x={x - body / 2} width={body} y={Math.min(yo, yc) - (Math.abs(yo - yc) < 1 ? 0.5 : 0)} height={Math.max(1, Math.abs(yo - yc))} className={hollow ? 'hollow' : solid ? 'solid' : undefined} />
        </>
      )}
      {variant === 'highlow' && <rect className="pu-ct-range" x={x - Math.max(1, body / 3)} width={Math.max(2, (body * 2) / 3)} y={yh} height={Math.max(1, yl - yh)} />}
      {volY !== null && <rect className="kit-ct-vol" x={x - body / 2} width={body} y={volY} height={Math.max(volPositive ? 1 : 0, volBase - volY)} />}
    </g>
  );
});

interface TableExtras { at: Map<number, number>; cells: string[][] }

function DataTable({ label, labels, formatPrice = nprPrice, formatVolume = quantity, formatDate = shortDate, checked, tableLimit = 500, extraHeads, extras }: CandlestickChartProps & { checked: Checked[]; extraHeads: string[]; extras: TableExtras | null }) {
  const none = labels?.none ?? 'none';
  const rows = checked.slice(-Math.max(1, tableLimit));
  const anyProblem = checked.some((x) => x.issues.length > 0);
  const custom = labels?.issues;
  const issueText = useMemo(() => (i: OhlcIssue) => custom?.[i] ?? DEFAULT_ISSUES[i], [custom]);
  const price = useMemo(() => (v: number) => (isNum(v) ? formatPrice(v) : none), [formatPrice, none]);
  return (
    <>
      <table>
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{labels?.date ?? 'Date'}</th>
            <th scope="col">{labels?.open ?? 'Open'}</th>
            <th scope="col">{labels?.high ?? 'High'}</th>
            <th scope="col">{labels?.low ?? 'Low'}</th>
            <th scope="col">{labels?.close ?? 'Close'}</th>
            <th scope="col">{labels?.volume ?? 'Volume'}</th>
            {extraHeads.map((h, n) => <th key={n} scope="col">{h}</th>)}
            {anyProblem && <th scope="col">{labels?.problem ?? 'Problem'}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => {
            const v = extras?.at.get(x.i);
            return <TableRow key={x.i} x={x} price={price} formatVolume={formatVolume} formatDate={formatDate} none={none} problem={anyProblem ? issueText : null} extra={extras && v !== undefined ? extras.cells[v]! : null} extraCount={extraHeads.length} />;
          })}
        </tbody>
      </table>
      {rows.length < checked.length && <p>{(labels?.truncated ?? ((s: number, t: number) => `Showing the latest ${s} of ${t} candles`))(rows.length, checked.length)}</p>}
    </>
  );
}

interface RowProps {
  x: Checked;
  price: (v: number) => string;
  formatVolume: (v: number) => string;
  formatDate: (d: string) => string;
  none: string;
  problem: ((i: OhlcIssue) => string) | null;
  extra: readonly string[] | null;
  extraCount: number;
}

const sameCells = (a: readonly string[] | null, b: readonly string[] | null) => a === b || (a !== null && b !== null && a.length === b.length && a.every((s, i) => s === b[i]));

/** A table row re-renders only when its candle (or a formatter) changed: a live tick reformats one row, not 500. */
const TableRow = memo(function TableRow({ x, price, formatVolume, formatDate, none, problem, extra, extraCount }: RowProps) {
  return (
    <tr>
      <th scope="row">{formatDate(x.c.date)}</th>
      <td>{price(x.c.open)}</td>
      <td>{price(x.c.high)}</td>
      <td>{price(x.c.low)}</td>
      <td>{price(x.c.close)}</td>
      <td>{isNum(x.c.volume) ? formatVolume(x.c.volume) : none}</td>
      {Array.from({ length: extraCount }, (_, n) => <td key={n}>{extra?.[n] ?? none}</td>)}
      {problem && <td>{x.issues.map(problem).join('; ')}</td>}
    </tr>
  );
}, (a, b) => a.x.c === b.x.c && a.x.entry === b.x.entry && a.price === b.price && a.formatVolume === b.formatVolume && a.formatDate === b.formatDate && a.none === b.none && a.problem === b.problem && a.extraCount === b.extraCount && sameCells(a.extra, b.extra));
