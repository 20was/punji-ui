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
import { memo, useId, useMemo, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

import { ChartA11yShell } from '../chart-a11y/ChartA11yShell.tsx';
import { bandScale, decimalsOf, ema, exactText, heikinAshi, logTicks, niceTicks, priceTransform, rebase, rebaseOnto, reduceCandles, spreadLabels, timeScale, validateOhlc, type OhlcIssue, type PriceScaleMode } from '../chart-math/chartMath.ts';
import { ChartTooltip, clamp, isNum, nprPrice, quantity, shortDate, thinned, useMeasuredWidth } from '../internal/chartFrame.tsx';
import type { ChartIndicator, IndicatorInput, IndicatorResult } from './indicatorTypes.ts';

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

/** How the price axis is laid out: the price, its logarithm, percent change from the first close, or indexed to 100 at the first close. */
export type CandlestickScale = PriceScaleMode;

/** Another instrument drawn over the price, for comparison. */
export interface CompareSeries {
  /** Its name in the legend, the readout and the table. */
  label: string;
  /** Closes by date ("YYYY-MM-DD"). A date the chart has no session for is ignored; a session it has no close for is a gap in the line. */
  points: readonly { date: string; close: number | null }[];
}

export type PriceEventKind = 'dividend' | 'split' | 'earnings' | 'custom';

/** Something that happened on a date: drawn on the time axis, listed in the table, reachable with Shift plus the arrow keys. */
export interface PriceEvent {
  /** "YYYY-MM-DD". Placed on the session of that date, or the last session before it; outside the sessions shown it is listed in the table only. */
  date: string;
  /** Sets the marker's shape and letter: a circle for a dividend, a diamond for a split, a square for earnings, a triangle for your own. */
  kind: PriceEventKind;
  /** Short name ("Bonus 10%", "Q2 results"). */
  label: string;
  /** More words for the readout and the table ("Book closure 14 Nov"). */
  detail?: string;
}

export type PriceLevelKind = 'support' | 'resistance' | 'cost-basis' | 'custom';

/** A horizontal reference line at a price. */
export interface PriceLevel {
  /** The price the line sits at, in the same units as the candles. */
  price: number;
  /** Printed on the line ("Support", "Your cost"). The price is added. */
  label: string;
  /** Sets the dash and the word in the table. Default 'custom'. */
  kind?: PriceLevelKind;
}

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
  /** Names of the event kinds, for the table and the readout. */
  eventKinds?: Partial<Record<PriceEventKind, string>>;
  /** Names of the level kinds, for the table. */
  levelKinds?: Partial<Record<PriceLevelKind, string>>;
  /** Table heads of the events and levels tables. */
  event?: string;
  detail?: string;
  kind?: string;
  level?: string;
  price?: string;
  /** Default "From last close" (percent). */
  fromClose?: string;
  /** Captions of the two extra tables. Default "Events" and "Levels". */
  eventsCaption?: string;
  levelsCaption?: string;
  /** Said once under the chart. Default "N events outside the sessions shown are listed in the table." */
  eventsOutside?: (count: number) => string;
  /** Said once under the chart. Default "N levels outside the price range shown are listed in the table." */
  levelsOutside?: (count: number) => string;
  /** Spoken name of the real close next to a Heikin Ashi candle. Default "Actual close". */
  actualClose?: string;
  /** The jump-to-event keys, added to the hint. Default "Shift and the arrow keys jump between events." */
  eventsHint?: string;
}

export interface CandlestickChartProps {
  /** Sessions, oldest first. */
  candles: readonly Candle[];
  /** Names the chart and its data table. */
  label: string;
  /** How the price is drawn. Default 'candles' (or 'bars' with the older `variant="bars"`). 'heikin-ashi' smooths the candles (the table and the readout carry the exact Heikin Ashi values); 'line', 'area' and 'baseline' draw the close; 'high-low' draws each session's range. */
  mode?: CandlestickMode;
  /** The older way to pick OHLC bars: `variant="bars"` is `mode="bars"`. `mode` wins when both are given. */
  variant?: 'candles' | 'bars';
  /** The price axis: 'linear' (default), 'log', 'percent' (change from the first close) or 'indexed' (first close is 100). With `compare`, a linear or log scale becomes percent. */
  scale?: CandlestickScale;
  /** Other instruments drawn as lines over the price, started level with the price on their first date. Needs a first close above zero. */
  compare?: readonly CompareSeries[];
  /** The price a `baseline` chart divides gain from loss at, in price units. Default the first close. */
  baseline?: number;
  /** Dividends, splits, earnings and your own marks on the time axis. Shift and Left or Right jump between them. */
  events?: readonly PriceEvent[];
  /** Support, resistance and cost-basis lines. Labels are kept clear of each other; a level outside the price range shown is listed in the table instead. */
  levels?: readonly PriceLevel[];
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

const SERIES_TONES = ['var(--pu-color-series-nepse)', 'var(--pu-color-series-3)', 'var(--pu-color-series-4)', 'var(--pu-color-series-5)', 'var(--pu-color-series-6)', 'var(--pu-color-series-7)'];
const COMPARE_DASH = ['', '6 3', '2 3', '8 3 2 3'];
const LEVEL_DASH: Record<PriceLevelKind, string> = { support: '6 3', resistance: '2 3', 'cost-basis': '8 3 2 3', custom: '4 4' };
/** Least room per candle; beyond it candles are aggregated. */
const MIN_PX = 3;
const AXIS_H = 22;
const MAX_BODY = 24;
const PANE_H = 76;
const PANE_GAP = 14;
const EVENT_H = 20;

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

const DEFAULT_MODES: Record<CandlestickMode, string> = { candles: 'candles', hollow: 'hollow candles', bars: 'OHLC bars', 'heikin-ashi': 'Heikin Ashi', line: 'line', area: 'area', baseline: 'baseline', 'high-low': 'high-low' };
const DEFAULT_SCALES: Record<CandlestickScale, string> = { linear: 'linear', log: 'logarithmic', percent: 'percent change from the first close', indexed: 'indexed to 100 at the first close' };
const DEFAULT_EVENT_KINDS: Record<PriceEventKind, string> = { dividend: 'Dividend', split: 'Split', earnings: 'Earnings', custom: 'Event' };
const DEFAULT_LEVEL_KINDS: Record<PriceLevelKind, string> = { support: 'Support', resistance: 'Resistance', 'cost-basis': 'Cost basis', custom: 'Level' };

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

/** A percent change in the scale's units: itself for percent, plus 100 for indexed. */
const inScale = (scale: CandlestickScale, pct: number | null) => (pct === null ? null : scale === 'indexed' ? 100 + pct : pct);

const signed = (v: number) => `${v > 0 ? '+' : ''}${exactText(v, 2, 2)}%`;

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

interface LegendEntry { label: string; tone: string; dash: string }
interface PaneView { ind: ChartIndicator; result: IndicatorResult; tones: string[]; top: number }

function Plot({ candles, label, mode: modeProp, variant = 'candles', scale: scaleProp = 'linear', compare = [], baseline, events = [], levels = [], indicators = [], height = 280, volume, axis = 'category', hollowUp = false, convention, averages = [], formatPrice = nprPrice, formatVolume = quantity, formatDate = shortDate, labels, testId, checked, valid, tableLimit = 500 }: CandlestickChartProps & { checked: Checked[]; valid: Checked[] }) {
  const { ref, width } = useMeasuredWidth(640);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
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

  // The sessions as drawn: Heikin Ashi replaces the candles by their smoothed version, computed over every session before any grouping.
  const drawn = useMemo<Candle[]>(() => {
    const src = valid.map((x) => x.c);
    if (mode !== 'heikin-ashi') return src;
    return heikinAshi(src).map((h, k) => ({ date: src[k]!.date, ...h }));
  }, [valid, mode]);

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

  // Scale: what was asked, what the prices allow.
  const base = valid[0]!.c.close;
  const wanted: CandlestickScale = compare.length > 0 && (scaleProp === 'linear' || scaleProp === 'log') ? 'percent' : scaleProp;
  const allPositive = valid.every((x) => x.c.low > 0);
  const scaleOk = wanted === 'linear' || (wanted === 'log' ? allPositive : base > 0);
  const scale: CandlestickScale = scaleOk ? wanted : 'linear';
  const fellBack = !scaleOk;
  const compareMoved = compare.length > 0 && scaleOk && scale !== scaleProp;
  const T = useMemo(() => priceTransform(scale, base), [scale, base]);
  const scaled = scale === 'percent' || scale === 'indexed';

  // Other instruments, level with the price on their first shared date, in the scale's units.
  const compared = useMemo(() => {
    if (!scaled || compare.length === 0) return [];
    const mainPct = rebase(valid.map((x) => x.c.close));
    return compare.map((s, k) => {
      const byDate = new Map<string, number | null>();
      for (const p of s.points) byDate.set(p.date, isNum(p.close) ? p.close : null);
      const aligned = valid.map((x) => byDate.get(x.c.date) ?? null);
      const pct = rebaseOnto(aligned, mainPct);
      return { label: s.label, dash: COMPARE_DASH[k % COMPARE_DASH.length]!, all: pct.map((v) => inScale(scale, v)), values: items.map((it) => inScale(scale, pct[it.to] ?? null)) };
    });
  }, [scaled, compare, valid, items, scale]);

  // Indicators over every valid session (never the grouped ones, never Heikin Ashi).
  const inputs = useMemo<IndicatorInput[]>(() => valid.map((x) => ({ date: x.c.date, open: x.c.open, high: x.c.high, low: x.c.low, close: x.c.close, volume: isNum(x.c.volume) ? x.c.volume : null })), [valid]);
  const computed = useMemo(() => indicators.map((ind) => ({ ind, result: ind.compute(inputs) })), [indicators, inputs]);
  let toneAt = averages.length;
  const nextTone = () => SERIES_TONES[toneAt++ % SERIES_TONES.length]!;
  const compareTones = compared.map(() => nextTone());
  const placed = computed.map((p) => ({ ...p, tones: p.result.lines.map(() => nextTone()) }));
  const overlays = placed.filter((p) => p.ind.placement === 'price');
  const paneSpecs = placed.filter((p) => p.ind.placement === 'pane');

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
  const baselinePrice = isNum(baseline) ? baseline : base;
  if (mode === 'baseline') take(T(baselinePrice));
  const overlayAt = overlays.map((o) => o.result.lines.map((l) => items.map((it) => {
    const v = l.values[it.to];
    return isNum(v) ? T(v) : null;
  })));
  overlayAt.forEach((ls) => ls.forEach((vs) => vs.forEach(take)));
  compared.forEach((c) => c.values.forEach(take));

  const count = Math.max(3, Math.round(plotH / 56));
  const ticks = scale === 'log' ? logTicks(10 ** lo, 10 ** hi, count) : niceTicks(lo, hi, count);
  const tickT = scale === 'log' ? ticks.ticks.map((t) => Math.log10(t)) : ticks.ticks;
  const loT = scale === 'log' ? Math.log10(ticks.lo) : ticks.lo;
  const hiT = scale === 'log' ? Math.log10(ticks.hi) : ticks.hi;
  const tickText = ticks.ticks.map((t) => (scale === 'percent' ? signed(t) : scale === 'indexed' ? exactText(t, 2) : formatPrice(t)));
  const axisW = Math.min(120, Math.max(...tickText.map((t) => t.length)) * 7 + 12);
  const x0 = 4;
  const x1 = Math.max(x0 + 20, width - axisW);
  const yOf = (t: number) => top + plotH - ((t - loT) / (hiT - loT || 1)) * plotH;
  const py = (p: number) => yOf(T(p));
  const volMax = Math.max(1, ...items.map((it) => (isNum(it.candle.volume) ? it.candle.volume : 0)));
  const volTop = top + plotH + gap;
  const volY = (v: number) => volTop + volH - (v / volMax) * volH;

  // Panes stacked under the price and volume, then the strip of events, then the date axis.
  let cursorY = volTop + volH;
  const panes: PaneView[] = paneSpecs.map((p) => {
    const t = cursorY + PANE_GAP;
    cursorY = t + PANE_H;
    return { ind: p.ind, result: p.result, tones: p.tones, top: t };
  });
  const plotBottom = cursorY;

  const band = bandScale(items.length, x0, x1, 0.25);
  const time = axis === 'time' ? timeScale(items.map((it) => it.time), x0, x1) : null;
  const cx = (k: number) => (time ? time.x(items[k]!.time) : band.center(k));
  const slot = time ? time.step : band.step;
  const body = clamp(slot * 0.72, 1, MAX_BODY);
  const labelIdx = thinned(items.length, slot, 76);
  const indexAt = (px: number) => (time ? time.nearest(px) : band.indexAt(px));

  // Events: each on the item holding its session (or the last session before its date).
  const eventKinds = { ...DEFAULT_EVENT_KINDS, ...labels?.eventKinds };
  const levelKinds = { ...DEFAULT_LEVEL_KINDS, ...labels?.levelKinds };
  const placedEvents = useMemo(() => {
    const first = valid[0]!.c.date;
    const last = valid[valid.length - 1]!.c.date;
    return events.map((e, n) => {
      let at = -1;
      if (e.date >= first && e.date <= last) {
        let a = 0;
        let b = valid.length - 1;
        while (a <= b) {
          const m = (a + b) >> 1;
          if (valid[m]!.c.date <= e.date) {
            at = m;
            a = m + 1;
          } else b = m - 1;
        }
      }
      const item = at < 0 ? -1 : items.findIndex((it) => it.from <= at && at <= it.to);
      return { e, n, session: at, item };
    });
  }, [events, valid, items]);
  const inRange = placedEvents.filter((p) => p.item >= 0);
  const outsideEvents = placedEvents.length - inRange.length;
  const eventH = inRange.length > 0 ? EVENT_H : 0;
  const eventItems = useMemo(() => [...new Set(inRange.map((p) => p.item))].toSorted((p, q) => p - q), [inRange]);
  const svgH = plotBottom + eventH + AXIS_H;
  const eventsAt = (k: number) => inRange.filter((p) => p.item === k).map((p) => p.e);

  // Levels inside the shown range are drawn, with their labels pushed apart; the rest are only listed.
  const drawnLevels = levels.filter((l) => isNum(l.price) && Number.isFinite(T(l.price)) && T(l.price) >= loT && T(l.price) <= hiT);
  const outsideLevels = levels.length - drawnLevels.length;
  const levelY = spreadLabels(drawnLevels.map((l) => py(l.price)), 16, top + 8, top + plotH - 8);

  const words = { up: labels?.up ?? 'up', down: labels?.down ?? 'down', flat: labels?.flat ?? 'unchanged' };
  const L = { date: labels?.date ?? 'Date', open: labels?.open ?? 'Open', high: labels?.high ?? 'High', low: labels?.low ?? 'Low', close: labels?.close ?? 'Close', volume: labels?.volume ?? 'Volume' };
  const modeName = { ...DEFAULT_MODES, ...labels?.modes }[mode];
  const scaleName = { ...DEFAULT_SCALES, ...labels?.scales }[scale];
  const dateText = (it: Item) => {
    const end = valid[it.to]!.c.date;
    return it.from === it.to ? formatDate(it.candle.date) : `${formatDate(it.candle.date)} – ${formatDate(end)}`;
  };

  // Heikin Ashi values are printed to two more decimals than the prices were written with, never rounded to the currency's two.
  const srcDecimals = useMemo(() => (mode === 'heikin-ashi' ? valid.reduce((m, x) => Math.max(m, decimalsOf(x.c.open, 6), decimalsOf(x.c.high, 6), decimalsOf(x.c.low, 6), decimalsOf(x.c.close, 6)), 0) : 0), [valid, mode]);
  const fmt = (v: number): string => (mode === 'heikin-ashi' ? exactText(v, srcDecimals + 2, srcDecimals) : formatPrice(v));

  // Direction of an item: the body for candles and bars, the move from the previous close otherwise.
  const prevBased = mode === 'hollow' || !bodyMode;
  const dirAt = (k: number): { dir: Dir; pct: number | null } => {
    const c = items[k]!.candle;
    const prev = k > 0 ? items[k - 1]!.candle.close : null;
    const [a, b] = prevBased && prev !== null ? [prev, c.close] : [c.open, c.close];
    return { dir: cmp(b, a), pct: a !== 0 ? Math.abs((b - a) / a) * 100 : null };
  };
  const bodyHollow = (k: number) => items[k]!.candle.close > items[k]!.candle.open;

  const indicatorAt = (k: number) => panes.map((p) => ({ p, at: lineAt(p.result, items[k]!.to) })).concat(overlays.map((o) => ({ p: { ind: o.ind, result: o.result } as PaneView, at: lineAt(o.result, items[k]!.to) })));
  const indicatorWords = (k: number): string[] => {
    const out: string[] = [];
    for (const { p, at } of indicatorAt(k)) {
      const vals = p.result.lines.filter((l) => at[l.key] !== null && at[l.key] !== undefined).map((l) => `${l.label} ${exactText(at[l.key]!, p.result.decimals ?? 2, p.result.decimals ?? 2)}`);
      if (vals.length === 0) continue;
      const w = p.ind.describe?.(at, inputs[items[k]!.to]!) ?? '';
      out.push(`${p.ind.label}: ${vals.join(', ')}${w ? `, ${w}` : ''}`);
    }
    return out;
  };
  const scaledText = (v: number) => (scale === 'percent' ? signed(T(v)) : exactText(T(v), 2, 2));
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
      if (mode === 'heikin-ashi') parts.push(`${labels?.actualClose ?? 'Actual close'} ${formatPrice(it.realClose)}`);
    }
    if (hasVolume) parts.push(`${L.volume} ${isNum(c.volume) ? formatVolume(c.volume) : none}`);
    if (scaled) parts.push(`${scaleName} ${scaledText(it.realClose)}`);
    compared.forEach((s) => {
      const v = s.values[k];
      parts.push(`${s.label} ${v === null || v === undefined ? none : scale === 'percent' ? signed(v) : exactText(v, 2, 2)}`);
    });
    parts.push(...indicatorWords(k));
    for (const e of eventsAt(k)) parts.push(`${eventKinds[e.kind]}: ${e.label}${e.detail ? `, ${e.detail}` : ''}`);
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
    `${valid.length} sessions from ${formatDate(valid[0]!.c.date)} to ${formatDate(valid[valid.length - 1]!.c.date)}, drawn as ${modeName}${scale === 'linear' ? '' : ` on a ${scaleName} scale`}.`,
    `Last close ${formatPrice(lastClose)}${overall === null ? '' : `, ${words[cmp(lastClose, firstClose)]} ${Math.abs(overall).toFixed(2)}% over the period`}.`,
    ...placed.map((p) => {
      const at = lineAt(p.result, valid.length - 1);
      const vals = p.result.lines.filter((l) => at[l.key] !== null && at[l.key] !== undefined).map((l) => `${l.label} ${exactText(at[l.key]!, p.result.decimals ?? 2, p.result.decimals ?? 2)}`);
      const w = vals.length ? (p.ind.describe?.(at, inputs[valid.length - 1]!) ?? '') : '';
      return `${p.ind.label}${p.ind.placement === 'pane' ? ' pane' : ''}: ${vals.length ? `latest ${vals.join(', ')}${w ? `, ${w}` : ''}` : 'no values yet'}.`;
    }),
    compared.length > 0 ? `Compared with ${compared.map((s) => s.label).join(', ')}.` : '',
    placedEvents.length > 0 ? `${placedEvents.length} ${placedEvents.length === 1 ? 'event' : 'events'}.` : '',
    levels.length > 0 ? `${levels.length} reference ${levels.length === 1 ? 'level' : 'levels'}: ${levels.map((l) => `${l.label} ${formatPrice(l.price)}`).join(', ')}.` : '',
  ].filter(Boolean).join(' ');

  const baseHint = labels?.hint ?? 'Use the left and right arrow keys to move between candles, Home and End to jump to the first and last.';
  const hint = eventItems.length > 0 ? `${baseHint} ${labels?.eventsHint ?? 'Shift and the arrow keys jump between events.'}` : baseHint;

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
    if (mode === 'heikin-ashi') {
      for (const [k, name] of [['open', 'Open'], ['high', 'High'], ['low', 'Low'], ['close', 'Close']] as const) {
        heads.push(`Heikin Ashi ${(labels?.[k] ?? name).toLowerCase()}`);
        get.push((v) => exactText(drawn[v]![k], srcDecimals + 2, srcDecimals));
      }
    }
    if (scaled) {
      heads.push(`${L.close}: ${scaleName}`);
      get.push((v) => (scale === 'percent' ? signed(T(valid[v]!.c.close)) : exactText(T(valid[v]!.c.close), 2, 2)));
    }
    compared.forEach((s) => {
      heads.push(`${s.label}: ${scaleName}`);
      get.push((v) => {
        const x = s.all[v];
        return x === null || x === undefined ? none : scale === 'percent' ? signed(x) : exactText(x, 2, 2);
      });
    });
    for (const p of placed) {
      p.result.lines.forEach((l) => {
        heads.push(p.result.lines.length === 1 ? p.ind.label : `${p.ind.label}: ${l.label}`);
        const d = p.result.decimals ?? 2;
        get.push((v) => {
          const x = l.values[v];
          return isNum(x) ? exactText(x, d, d) : none;
        });
      });
    }
    return { heads, get };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- words and labels are read through their props; the derived values below are what change the cells
  }, [modeProp, mode, drawn, valid, scale, scaled, compared, placed, srcDecimals, labels, none, T, prevBased]);
  const extras = useMemo(() => {
    if (tableCols.heads.length === 0) return null;
    const at = new Map<number, number>();
    valid.forEach((x, v) => at.set(x.i, v));
    return { at, cells: valid.map((_, v) => tableCols.get.map((g) => g(v))) };
  }, [tableCols, valid]);

  const legend: LegendEntry[] = [
    ...(compared.length > 0 ? [{ label, tone: 'var(--pu-color-text)', dash: '' }] : []),
    ...lines.map((l) => ({ label: l.label, tone: l.tone, dash: '' })),
    ...compared.map((c, k) => ({ label: c.label, tone: compareTones[k]!, dash: c.dash })),
    ...overlays.map((o) => ({ label: o.ind.label, tone: o.tones[0] ?? SERIES_TONES[0]!, dash: '' })),
  ];

  const extraTables = (
    <>
      {placedEvents.length > 0 && (
        <table>
          <caption>{`${label}: ${labels?.eventsCaption ?? 'Events'}`}</caption>
          <thead>
            <tr>
              <th scope="col">{L.date}</th>
              <th scope="col">{labels?.kind ?? 'Kind'}</th>
              <th scope="col">{labels?.event ?? 'Event'}</th>
              <th scope="col">{labels?.detail ?? 'Detail'}</th>
            </tr>
          </thead>
          <tbody>
            {placedEvents.map((p) => (
              <tr key={p.n}>
                <th scope="row">{formatDate(p.e.date)}</th>
                <td>{eventKinds[p.e.kind]}</td>
                <td>{p.e.label}</td>
                <td>{p.e.detail ?? none}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {levels.length > 0 && (
        <table>
          <caption>{`${label}: ${labels?.levelsCaption ?? 'Levels'}`}</caption>
          <thead>
            <tr>
              <th scope="col">{labels?.level ?? 'Level'}</th>
              <th scope="col">{labels?.kind ?? 'Kind'}</th>
              <th scope="col">{labels?.price ?? 'Price'}</th>
              <th scope="col">{labels?.fromClose ?? 'From last close'}</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((l, n) => (
              <tr key={n}>
                <th scope="row">{l.label}</th>
                <td>{levelKinds[l.kind ?? 'custom']}</td>
                <td>{isNum(l.price) ? formatPrice(l.price) : none}</td>
                <td>{isNum(l.price) && lastClose !== 0 ? signed(((l.price - lastClose) / Math.abs(lastClose)) * 100) : none}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );

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
          {fellBack && <p className="kit-ct-note" role="note">{labels?.scaleFallback ?? 'This scale needs prices above zero; showing a linear scale.'}</p>}
          {compareMoved && <p className="kit-ct-note">{labels?.compareNote ?? 'Comparing: the axis shows percent change from the first close.'}</p>}
          {outsideEvents > 0 && <p className="kit-ct-note">{(labels?.eventsOutside ?? ((n: number) => `${n} ${n === 1 ? 'event' : 'events'} outside the sessions shown ${n === 1 ? 'is' : 'are'} listed in the table.`))(outsideEvents)}</p>}
          {outsideLevels > 0 && <p className="kit-ct-note">{(labels?.levelsOutside ?? ((n: number) => `${n} ${n === 1 ? 'level' : 'levels'} outside the price range shown ${n === 1 ? 'is' : 'are'} listed in the table.`))(outsideLevels)}</p>}
        </>
      )}
      table={(
        <>
          <DataTable candles={candles} label={label} labels={labels} formatPrice={formatPrice} formatVolume={formatVolume} formatDate={formatDate} checked={checked} tableLimit={tableLimit} extraHeads={tableCols.heads} extras={extras} />
          {extraTables}
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
          if (e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && eventItems.length > 0) {
            const at = ctx.index ?? (e.key === 'ArrowRight' ? -1 : items.length);
            const next = e.key === 'ArrowRight' ? eventItems.find((i) => i > at) : eventItems.findLast((i) => i < at);
            e.preventDefault();
            if (next !== undefined) ctx.moveTo(next);
            return;
          }
          plot.onKeyDown?.(e);
        };
        const activeEvents = active ? eventsAt(ctx.index!) : [];
        const activeInd = active ? indicatorAt(ctx.index!) : [];
        const activeDir = active ? dirAt(ctx.index!).dir : 'flat';
        const closeY = active ? py(active.candle.close) : 0;
        const pathOf = (vals: readonly (number | null)[], y: (v: number) => number) => vals.map((v, k) => (v === null ? '' : `${k === 0 || vals[k - 1] === null ? 'M' : 'L'}${cx(k).toFixed(1)},${y(v).toFixed(1)}`)).join(' ');
        const closePath = items.map((it, k) => `${k === 0 ? 'M' : 'L'}${cx(k).toFixed(1)},${py(it.candle.close).toFixed(1)}`).join(' ');
        const yBase = clamp(py(baselinePrice), top, top + plotH);
        const areaTo = (yTo: number) => `${closePath} L${cx(items.length - 1).toFixed(1)},${yTo.toFixed(1)} L${cx(0).toFixed(1)},${yTo.toFixed(1)} Z`;
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
                  {ticks.ticks.map((t, k) => (
                    <g key={t}>
                      <line className="kit-ct-grid" x1={x0} x2={x1} y1={yOf(tickT[k]!)} y2={yOf(tickT[k]!)} />
                      <text className="kit-ct-axis" x={x1 + 8} y={yOf(tickT[k]!)} dominantBaseline="middle">{tickText[k]}</text>
                    </g>
                  ))}
                  {showVolume && <line className="kit-ct-grid" x1={x0} x2={x1} y1={volTop + volH} y2={volTop + volH} />}
                  {overlays.map((o, n) => o.result.band && (() => {
                    const u = o.result.lines.findIndex((l) => l.key === o.result.band!.upper);
                    const d = o.result.lines.findIndex((l) => l.key === o.result.band!.lower);
                    if (u < 0 || d < 0) return null;
                    const up = overlayAt[n]![u]!;
                    const dn = overlayAt[n]![d]!;
                    const ks = up.map((_, k) => k).filter((k) => up[k] !== null && dn[k] !== null);
                    if (ks.length < 2) return null;
                    const path = `${ks.map((k, j) => `${j === 0 ? 'M' : 'L'}${cx(k).toFixed(1)},${yOf(up[k]!).toFixed(1)}`).join(' ')} ${ks.toReversed().map((k) => `L${cx(k).toFixed(1)},${yOf(dn[k]!).toFixed(1)}`).join(' ')} Z`;
                    return <path key={`band-${o.ind.id}`} className="pu-ct-band" d={path} />;
                  })())}
                  {mode === 'area' && <path className="pu-ct-fill" d={areaTo(top + plotH)} />}
                  {mode === 'baseline' && (
                    <g>
                      <clipPath id={`${uid}up`}><rect x={x0} y={top} width={Math.max(0, x1 - x0)} height={Math.max(0, yBase - top)} /></clipPath>
                      <clipPath id={`${uid}dn`}><rect x={x0} y={yBase} width={Math.max(0, x1 - x0)} height={Math.max(0, top + plotH - yBase)} /></clipPath>
                      <path className="pu-ct-fill gain" clipPath={`url(#${uid}up)`} d={areaTo(yBase)} />
                      <path className="pu-ct-fill loss" clipPath={`url(#${uid}dn)`} d={areaTo(yBase)} />
                      <line className="pu-ct-baseline" x1={x0} x2={x1} y1={yBase} y2={yBase} />
                    </g>
                  )}
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
                  {compared.map((c, k) => (
                    <path key={c.label} className="kit-ct-ma" stroke={compareTones[k]} strokeDasharray={c.dash || undefined} d={pathOf(c.values, yOf)} />
                  ))}
                  {overlays.map((o, n) => o.result.lines.map((l, j) => (
                    <path key={`${o.ind.id}-${l.key}`} className="kit-ct-ma" stroke={o.tones[j]} strokeDasharray={l.dash} d={pathOf(overlayAt[n]![j]!, yOf)} />
                  )))}
                  {lines.map((l) => (
                    <path key={l.label} className="kit-ct-ma" stroke={l.tone} d={l.values.map((v, k) => (v === null ? '' : `${k === 0 || l.values[k - 1] === null ? 'M' : 'L'}${cx(k).toFixed(1)},${yOf(v).toFixed(1)}`)).join(' ')} />
                  ))}
                  {drawnLevels.map((l, n) => (
                    <g key={n} className="pu-ct-level" data-kind={l.kind ?? 'custom'}>
                      <line x1={x0} x2={x1} y1={py(l.price)} y2={py(l.price)} strokeDasharray={LEVEL_DASH[l.kind ?? 'custom']} />
                      <text x={x1 - 6} y={levelY[n]!} textAnchor="end" dominantBaseline="middle">{`${l.label} ${formatPrice(l.price)}`}</text>
                    </g>
                  ))}
                  {mode === 'baseline' && <text className="pu-ct-baseline-label" x={x0 + 4} y={yBase - 5}>{formatPrice(baselinePrice)}</text>}
                  {panes.map((p) => {
                    const View = p.ind.view;
                    return View ? <View key={p.ind.id} id={p.ind.id} label={p.ind.label} result={p.result} tones={p.tones} top={p.top} height={PANE_H} items={items} cx={cx} body={body} x0={x0} x1={x1} axisX={x1 + 8} active={active ? ctx.index : null} /> : null;
                  })}
                  {eventH > 0 && inRange.map((p, j) => {
                    const sameItem = inRange.filter((q) => q.item === p.item);
                    const slotN = sameItem.indexOf(p);
                    const x = clamp(cx(p.item) + (slotN - (sameItem.length - 1) / 2) * 19, x0 + 8, x1 - 8);
                    return <EventMark key={`${p.n}-${j}`} kind={p.e.kind} x={x} y={plotBottom + 10} glyph={glyphOf(eventKinds[p.e.kind], p.e.kind)} active={ctx.index === p.item} />;
                  })}
                  {labelIdx.map((k) => (
                    <text key={k} className="kit-ct-axis" x={clamp(cx(k), x0 + 24, x1 - 24)} y={svgH - 6} textAnchor="middle">{formatDate(items[k]!.candle.date)}</text>
                  ))}
                  {active && (
                    <g className="kit-ct-cross">
                      <line x1={activeX} x2={activeX} y1={top} y2={plotBottom} />
                      <line x1={x0} x2={x1} y1={closeY} y2={closeY} />
                      <rect x={x1 + 2} y={closeY - 9} width={axisW - 4} height={18} rx={3} />
                      <text x={x1 + 8} y={closeY} dominantBaseline="middle">{scaled ? (scale === 'percent' ? signed(T(active.candle.close)) : exactText(T(active.candle.close), 2, 2)) : fmt(active.candle.close)}</text>
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
                      {mode === 'heikin-ashi' && (<><dt>{labels?.actualClose ?? 'Actual close'}</dt><dd>{formatPrice(active.realClose)}</dd></>)}
                      {hasVolume && (<><dt>{L.volume}</dt><dd>{isNum(active.candle.volume) ? formatVolume(active.candle.volume) : none}</dd></>)}
                      {scaled && (<><dt>{scale === 'percent' ? '%' : '100'}</dt><dd>{scaledText(active.realClose)}</dd></>)}
                      {compared.map((s) => {
                        const v = s.values[ctx.index!];
                        return <div key={s.label}><dt>{s.label}</dt><dd>{v === null || v === undefined ? none : scale === 'percent' ? signed(v) : exactText(v, 2, 2)}</dd></div>;
                      })}
                      {activeInd.map(({ p, at }) => p.result.lines.filter((l) => at[l.key] !== null && at[l.key] !== undefined).map((l) => (
                        <div key={`${p.ind.id}-${l.key}`}><dt>{p.result.lines.length === 1 ? p.ind.label : `${p.ind.label}: ${l.label}`}</dt><dd>{exactText(at[l.key]!, p.result.decimals ?? 2, p.result.decimals ?? 2)}</dd></div>
                      )))}
                      {activeEvents.map((e, n) => (
                        <div key={n}><dt>{eventKinds[e.kind]}</dt><dd>{e.label}</dd></div>
                      ))}
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


/** The value of each line of an indicator at one session. */
function lineAt(result: IndicatorResult, i: number): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const l of result.lines) {
    const v = l.values[i];
    out[l.key] = isNum(v) ? v : null;
  }
  return out;
}

/** The mark's letter: the first letter of the kind's word, upper case; a dot for your own events. */
const glyphOf = (word: string, kind: PriceEventKind) => (kind === 'custom' ? '•' : (word.trim()[0] ?? '•').toUpperCase());

/** One event on the time axis. The shape (circle, diamond, square, triangle) and the letter tell the kind, so colour is not needed. */
function EventMark({ kind, x, y, glyph, active }: { kind: PriceEventKind; x: number; y: number; glyph: string; active: boolean }) {
  const r = 7;
  return (
    <g className={`pu-ct-ev ${kind}${active ? ' active' : ''}`} data-kind={kind}>
      {kind === 'dividend' && <circle cx={x} cy={y} r={r} />}
      {kind === 'split' && <polygon points={`${x},${y - r - 1} ${x + r + 1},${y} ${x},${y + r + 1} ${x - r - 1},${y}`} />}
      {kind === 'earnings' && <rect x={x - r} y={y - r} width={r * 2} height={r * 2} rx={2} />}
      {kind === 'custom' && <polygon points={`${x},${y - r - 1} ${x + r + 1},${y + r} ${x - r - 1},${y + r}`} />}
      <text x={x} y={kind === 'custom' ? y + 3 : y} textAnchor="middle" dominantBaseline="central">{glyph}</text>
    </g>
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
