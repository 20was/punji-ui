'use client';

/**
 * PerformanceChart: a portfolio's value or return over time against one or
 * more benchmarks (the NEPSE index, a sector index), as SVG.
 *
 * The first series is the portfolio: drawn thickest, with a gain and loss
 * area between it and its starting level (green above, red below, per
 * `convention`). The others are benchmarks, told apart by colour and dash.
 * By default every series is normalised to percent change from its own first
 * real value, so a portfolio worth Rs 1.2 million and an index of 2,700
 * points share one scale; pass `normalize={false}` to plot raw values.
 *
 * Edge cases are decided, not accidents:
 *   empty        no dates, no series or no real value at all prints `labels.empty`.
 *   single       one date draws one dot per series, centred.
 *   gaps         a missing value breaks that series' line and area; it is "none"
 *                in the table, never zero. A benchmark that starts later starts later,
 *                level with the portfolio's percent change on its first date
 *                (rebaseOnto), not at 0%, so the two stay comparable.
 *   zero base    a first value of zero cannot be a base: that series is not drawn
 *                when normalised and is listed in the table as "none".
 *   flat         a constant series draws on a widened round scale.
 *   many points  a line with more points than the width has room for (2px each)
 *                is reduced to its extremes per bucket, first and last kept.
 *   hidden       a legend button hides a series (the last visible one cannot be
 *                hidden); the scale follows what is shown.
 *
 * Interaction: the pointer shows a crosshair and a readout; the plot is one
 * focus stop (Left, Right, Home, End, Escape) and the focused date's values are
 * announced in a polite live region. The legend is a row of toggle buttons
 * (`aria-pressed`), keyboard operable. A visually hidden table lists every
 * date and series. The period selector (1M, 3M, 1Y, All) is yours: pass it in
 * `periods` and slice `dates` and `series` to match.
 *
 * Optional layers, all off by default (the default drawing is unchanged):
 *   reference      a dashed, labelled horizontal line (a price alert, a target, a goal) in the portfolio's
 *                  own unit. A reference far outside the data is pinned to the edge and said so, so it
 *                  never flattens the line.
 *   drawdown       a band under the plot: the portfolio's fall from its running high, 0 at the top edge.
 *   contributions  a dotted "money put in" series on the same scale as the portfolio.
 *   endLabels      each visible series' last value printed at the right edge, spread so labels never overlap.
 *   rebase         `rebase={100}` plots every series as an index that starts at 100 (instead of percent change).
 *   axis="quiet"   three levels inside the plot and only the first and last dates: a compact chart.
 * Amounts stay plain numbers here (a chart of an index or a NAV is not exact money); format them with
 * `formatValue`. The money charts (`NetWorthChart`, `CashFlowChart`) take exact `Money`.
 */
import { memo, useEffect, useId, useMemo, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';

import { downsampleIndices, niceTicks, rebase, rebaseOnto } from '../chart-math/chartMath.ts';
import { ChartA11yShell } from '../chart-a11y/ChartA11yShell.tsx';
import { ChartTooltip, clamp, isNum, shortDate, thinned, useMeasuredWidth } from '../internal/chartFrame.tsx';

export interface PerformanceSeries {
  /** Stable key (the React key and the legend's identity). */
  key: string;
  /** Name in the legend, readout and table ("Portfolio", "NEPSE"). */
  label: string;
  /** One value per date, in the order of `dates`. Missing, null and non-finite are gaps. */
  values: readonly (number | null | undefined)[];
  /** How this series' raw value is printed when not normalised and in the table. Default `formatValue`. */
  format?: (value: number) => string;
}

export interface PerformanceChartLabels {
  /** Printed when there is nothing to draw. Default "No data". */
  empty?: ReactNode;
  /** The data table's first column head. Default "Date". */
  date?: string;
  /** A value a series did not have. Default "none". */
  none?: string;
  /** The keyboard hint read with the chart's name. */
  hint?: string;
  /** Name of the legend group. Default "Series". */
  legend?: string;
  /** Said when the table is cut to the latest dates. Default "Showing the latest N of M dates". */
  truncated?: (shown: number, total: number) => string;
  /** The dotted contributions series' name. Default "Money put in". */
  contributions?: string;
  /** The drawdown band's name. Default "Drawdown". */
  drawdown?: string;
  /** Appended to the reference label when it is pinned above the plot. Default "above the range". */
  referenceAbove?: string;
  /** Appended to the reference label when it is pinned below the plot. Default "below the range". */
  referenceBelow?: string;
}

export interface PerformanceReference {
  /** Where the line sits, in the portfolio's own unit (a price, not a percent). Converted when the chart is normalised or rebased. */
  value: number;
  /** Printed beside the line ("Target", "Alert at"). */
  label: string;
  /** Prints the value after the label. Default the portfolio's `format`, then `formatValue`. */
  format?: (value: number) => string;
}

export interface PerformanceChartProps {
  /** The dates as "YYYY-MM-DD", oldest first. Every series has one value per date. */
  dates: readonly string[];
  /** The portfolio first, then benchmarks. */
  series: readonly PerformanceSeries[];
  /** Names the chart and its table. */
  label: string;
  /** Percent change from each series' first real value (default true). False plots raw values. */
  normalize?: boolean;
  /** Fill between the portfolio and its start. Default true. */
  area?: boolean;
  /** Per-instance override of which hue means up: 'green-up' or 'red-up' (absolute, never a second swap on top of the theme). Default: follow the theme's gain and loss colours (`createTheme({ finance })`), which is the one place to set the convention. */
  convention?: 'green-up' | 'red-up';
  /** Plot height in CSS px, clamped to 140..520. Default 260. */
  height?: number;
  /** Prints a raw value (when not normalised, and in the table). Default: Intl en-IN, two decimals with lakh grouping (no currency mark). */
  formatValue?: (value: number) => string;
  /** Prints a percent change. Default signed, two decimals ("+4.20%"). */
  formatPercent?: (percent: number) => string;
  /** Prints a date on the axis and in the readout. Default "14 Nov". */
  formatDate?: (date: string) => string;
  /** A dashed, labelled horizontal line across the plot: a target, an alert level, a goal. In the portfolio's own unit. */
  reference?: PerformanceReference;
  /** A band under the plot showing the portfolio's fall from its running high (0 at its top edge, the worst fall at its bottom). Default false. */
  drawdown?: boolean;
  /** The money put in, one value per date in the portfolio's unit, drawn dotted on the same scale ("what you put in" against "what it is worth"). Gaps are `null`. */
  contributions?: readonly (number | null | undefined)[];
  /** Print each visible series' last value at the right edge, spread apart so labels never overlap. Default false. */
  endLabels?: boolean;
  /** Plot every series as an index that starts at this value (100) at its own first real value, instead of percent change. Overrides `normalize`. */
  rebase?: number;
  /** Prints an index level when `rebase` is set. Default one decimal. */
  formatIndex?: (value: number) => string;
  /** 'quiet': three levels inside the plot and only the first and last dates, for a small chart. Default 'full'. */
  axis?: 'full' | 'quiet';
  /** Called with the active date's index while the pointer or keyboard is on the plot, and null when it leaves. Use it to show the date's figures elsewhere. */
  onActiveChange?: (index: number | null) => void;
  /** Your period selector (1M, 3M, 1Y, All), shown above the chart. */
  periods?: ReactNode;
  /** The latest dates listed in the hidden table (the chart always uses all). Default 500, as CandlestickChart. */
  tableLimit?: number;
  /** Overrides for the printed words. */
  labels?: PerformanceChartLabels;
  /** Test id on the figure. */
  testId?: string;
}

const TONES = ['var(--pu-color-text)', 'var(--pu-color-series-nepse)', 'var(--pu-color-series-3)', 'var(--pu-color-series-4)', 'var(--pu-color-series-5)'];
const DASH = [undefined, '6 3', '2 3', '8 3 2 3', '1 3'];
const AXIS_H = 22;
const DD_GAP = 14;
const DD_H = 44;
const CONTRIB_KEY = '__contributions';
const MUTED = 'var(--pu-color-text-muted)';

// One formatter, built once: a new Intl.NumberFormat per table cell was most of a live update's cost.
const VALUE = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const defaultValue = (v: number) => VALUE.format(v);
const defaultPercent = (p: number) => `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(2)}%`;
const defaultIndex = (v: number) => v.toFixed(1);

/**
 * The fall from the running high, in percent (0 or negative), one value per input. A gap carries the high and
 * stays `null`; a high of zero or below cannot be a base, so the point is `null`.
 */
export function drawdownOf(values: readonly (number | null | undefined)[]): (number | null)[] {
  let peak = -Infinity;
  return values.map((v) => {
    if (!isNum(v)) return null;
    peak = Math.max(peak, v);
    return peak > 0 ? Math.min(0, (v / peak - 1) * 100) : null;
  });
}

/**
 * Moves label positions apart so no two are closer than `gap`, keeping their order and staying inside
 * `[min, max]`. Returns the new positions in the input order. Pure; it never moves a lone label.
 */
export function spreadLabels(positions: readonly number[], gap: number, min: number, max: number): number[] {
  const order = positions.map((_, i) => i).toSorted((a, b) => positions[a]! - positions[b]! || a - b);
  const placed = order.map((i) => clamp(positions[i]!, min, max));
  for (let k = 1; k < placed.length; k += 1) placed[k] = Math.max(placed[k]!, placed[k - 1]! + gap);
  // Pushed past the bottom: shift the stack back up, keeping the gaps.
  for (let k = placed.length - 1; k >= 0; k -= 1) {
    const limit = k === placed.length - 1 ? max : placed[k + 1]! - gap;
    if (placed[k]! > limit) placed[k] = limit;
  }
  const out = positions.map(() => 0);
  order.forEach((i, k) => { out[i] = placed[k]!; });
  return out;
}

/**
 * @stability beta
 */
export function PerformanceChart(props: PerformanceChartProps) {
  const { dates, series, label, labels, testId } = props;
  const real = series.some((s) => s.values.some(isNum));
  if (dates.length === 0 || series.length === 0 || !real) {
    return (
      <figure className="kit-ct empty" aria-label={label} data-testid={testId}>
        {props.periods && <div className="kit-ct-periods">{props.periods}</div>}
        <p className="kit-ct-empty">{labels?.empty ?? 'No data'}</p>
      </figure>
    );
  }
  return <Plot {...props} />;
}

/** Runs of real neighbours, reduced by extremes to at most about `cap` points; a gap breaks a run. */
function runsFor(y: readonly (number | null)[], cap: number): { i: number; v: number }[][] {
  const keep = downsampleIndices(y, cap);
  const runs: { i: number; v: number }[][] = [];
  let run: { i: number; v: number }[] = [];
  let prev = -2;
  // A run continues only across real neighbours in the original order (a gap breaks it).
  for (const i of keep) {
    const v = y[i];
    if (v === null || v === undefined) { if (run.length) runs.push(run); run = []; prev = -2; continue; }
    let gapBetween = false;
    if (prev >= 0) for (let j = prev + 1; j < i && !gapBetween; j += 1) gapBetween = y[j] === null;
    if (gapBetween && run.length) { runs.push(run); run = []; }
    run.push({ i, v });
    prev = i;
  }
  if (run.length) runs.push(run);
  return runs;
}

function Plot({ dates, series, label, normalize = true, area = true, convention, height = 260, formatValue = defaultValue, formatPercent = defaultPercent, formatIndex = defaultIndex, formatDate = shortDate, periods, labels, testId, tableLimit = 500, reference, drawdown = false, contributions, endLabels = false, rebase: rebaseTo, axis = 'full', onActiveChange }: PerformanceChartProps) {
  const { ref, width } = useMeasuredWidth(640);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const none = labels?.none ?? 'none';
  const contribWord = labels?.contributions ?? 'Money put in';
  const ddWord = labels?.drawdown ?? 'Drawdown';
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const n = dates.length;
  const quiet = axis === 'quiet';
  const index = isNum(rebaseTo) && rebaseTo > 0 ? rebaseTo : null;
  // Percent change (default) and an index that starts at `rebase` both anchor every series at its own start.
  const anchored = index !== null || normalize;
  const plotH = clamp(isNum(height) ? height : 260, 140, 520);
  const top = 8;
  const ddBlock = drawdown ? DD_GAP + DD_H : 0;
  const svgH = top + plotH + ddBlock + AXIS_H;

  const shown = useMemo<Shown[]>(
    () => {
      const raws = series.map((s) => Array.from({ length: n }, (_, i) => (isNum(s.values[i]) ? (s.values[i] as number) : null)));
      const lead = rebase(raws[0]!);
      const level = (p: number | null) => (p === null || index === null ? p : index * (1 + p / 100));
      // A benchmark that starts later continues from the portfolio's level on its first date (see rebaseOnto).
      const list: Shown[] = series.map((s, k) => ({ s, raw: raws[k]!, y: anchored ? (k === 0 ? lead : rebaseOnto(raws[k]!, lead)).map(level) : raws[k]! }));
      if (contributions) {
        const raw = Array.from({ length: n }, (_, i) => (isNum(contributions[i]) ? (contributions[i] as number) : null));
        const base = raws[0]!.find(isNum);
        // The money put in is read against the portfolio's own start, so "put in" and "worth" share one scale.
        const y = anchored ? raw.map((v) => (v === null || !isNum(base) || base === 0 ? null : level(((v - base) / Math.abs(base)) * 100))) : raw;
        list.push({ s: { key: CONTRIB_KEY, label: contribWord, values: raw, format: series[0]?.format }, raw, y });
      }
      return list;
    },
    [series, contributions, contribWord, n, anchored, index],
  );
  const visible = shown.filter((x) => !hidden.has(x.s.key));
  const drawn = visible.length ? visible : shown;
  const baseLevel = anchored ? (index ?? 0) : (shown[0]!.raw.find(isNum) ?? 0);

  let lo = Infinity;
  let hi = -Infinity;
  for (const x of drawn) for (const v of x.y) if (v !== null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
  if (anchored || area) { lo = Math.min(lo, baseLevel); hi = Math.max(hi, baseLevel); }

  // The reference line, in the portfolio's unit, converted to the plotted level. Near the data it widens the scale;
  // far from it (more than 1.5 spans or 15% of the high) it is pinned to the edge so it cannot flatten the line.
  const leadBase = shown[0]!.raw.find(isNum);
  let refLevel: number | null = null;
  if (reference && isNum(reference.value)) {
    if (!anchored) refLevel = reference.value;
    else if (isNum(leadBase) && leadBase !== 0) {
      const p = ((reference.value - leadBase) / Math.abs(leadBase)) * 100;
      refLevel = index === null ? p : index * (1 + p / 100);
    }
  }
  let refPin: -1 | 0 | 1 = 0;
  if (refLevel !== null) {
    const far = Math.max((hi - lo) * 1.5, Math.abs(hi) * 0.15);
    if (refLevel > hi + far) refPin = 1;
    else if (refLevel < lo - far) refPin = -1;
    else { lo = Math.min(lo, refLevel); hi = Math.max(hi, refLevel); }
  }

  const ticks = niceTicks(lo, hi, Math.max(3, Math.round(plotH / 56)));
  // A quiet axis keeps three levels: the ends and the middle of the rounded scale.
  const levels = quiet ? [ticks.lo, (ticks.lo + ticks.hi) / 2, ticks.hi] : ticks.ticks;
  const fmtLevel = index !== null ? formatIndex : formatPercent;
  const fmtTick = (v: number) => (anchored ? fmtLevel(v) : (series[0]?.format ?? formatValue)(v));
  const tickText = levels.map(fmtTick);
  const axisW = quiet ? 0 : Math.min(120, Math.max(...tickText.map((t) => t.length)) * 7 + 12);

  const words = labels?.legend ?? 'Series';
  const upTone = 'gain';
  const downTone = 'loss';
  const valueText = useMemo(() => (x: Shown, i: number) => {
    const v = x.y[i];
    const r = x.raw[i];
    if (v === null || v === undefined || r === null || r === undefined) return none;
    return anchored ? `${fmtLevel(v)} (${(x.s.format ?? formatValue)(r)})` : (x.s.format ?? formatValue)(r);
  }, [none, anchored, fmtLevel, formatValue]);
  const latest = (x: Shown) => {
    for (let i = n - 1; i >= 0; i -= 1) if (x.y[i] !== null) return anchored ? fmtLevel(x.y[i] as number) : (x.s.format ?? formatValue)(x.raw[i] as number);
    return none;
  };
  const lastReal = (x: Shown) => {
    for (let i = n - 1; i >= 0; i -= 1) if (x.y[i] !== null) return i;
    return -1;
  };
  const endTexts = endLabels ? drawn.map(latest) : [];
  const endW = endLabels ? Math.ceil(Math.max(...endTexts.map((t) => t.length)) * 7) + 22 : 0;
  const x0 = 6;
  const gutter = axisW + endW;
  const x1 = Math.max(x0 + 20, width - gutter - (gutter === 0 ? 6 : 0));
  const yOf = (v: number) => top + plotH - ((v - ticks.lo) / (ticks.hi - ticks.lo || 1)) * plotH;
  const cx = (i: number) => (n === 1 ? (x0 + x1) / 2 : x0 + (i / (n - 1)) * (x1 - x0));
  const step = n > 1 ? (x1 - x0) / (n - 1) : x1 - x0;
  const labelIdx = quiet ? (n > 1 ? [0, n - 1] : [0]) : thinned(n, step, 76);
  const cap = Math.max(8, Math.floor((x1 - x0) / 2));
  const baseY = yOf(baseLevel);

  // Paths: runs of real values joined; reduced by extremes when there are more points than room.
  const geometry = useMemo(() => shown.map(({ y }) => runsFor(y, cap)), [shown, cap]);

  // The fall from the running high, drawn as a band under the plot.
  const dd = useMemo(() => (drawdown ? drawdownOf(shown[0]!.raw) : null), [drawdown, shown]);
  const worst = dd ? Math.min(0, ...dd.filter(isNum)) : 0;
  const ddTop = top + plotH + DD_GAP;
  const ddY = (v: number) => ddTop + (worst < 0 ? (v / worst) * DD_H : 0);
  const ddRuns = useMemo(() => (dd ? runsFor(dd, cap) : []), [dd, cap]);

  const refFormat = reference?.format ?? series[0]?.format ?? formatValue;
  const refY = refLevel === null ? null : refPin > 0 ? top + 2 : refPin < 0 ? top + plotH - 2 : yOf(refLevel);
  const refText = reference && refY !== null
    ? `${reference.label} ${refFormat(reference.value)}${refPin > 0 ? ` (${labels?.referenceAbove ?? 'above the range'})` : refPin < 0 ? ` (${labels?.referenceBelow ?? 'below the range'})` : ''}`
    : null;

  // The end values at the right edge, pushed apart where lines finish close together.
  const ends = endLabels
    ? (() => {
        const real = drawn.map((x) => {
          const i = lastReal(x);
          return i < 0 ? null : yOf(x.y[i] as number);
        });
        const at = spreadLabels(real.map((y) => y ?? 0), 14, top + 7, top + plotH - 3);
        return drawn.flatMap((x, j) => (real[j] === null ? [] : [{ x, text: endTexts[j]!, from: real[j]!, to: at[j]! }]));
      })()
    : [];

  // The hidden table lists the latest `tableLimit` dates: 100,000 rows of DOM would cost seconds on every update.
  const firstRow = Math.max(0, n - Math.max(1, Math.floor(isNum(tableLimit) ? tableLimit : 500)));
  const ddText = (i: number) => (dd && isNum(dd[i]) ? formatPercent(dd[i] as number) : none);
  const spoken = (i: number) => `${formatDate(dates[i]!)}: ${drawn.map((x) => `${x.s.label} ${valueText(x, i)}`).join(', ')}${dd ? `, ${ddWord} ${ddText(i)}` : ''}`;
  const lookOf = (k: number) => (contributions && k === series.length
    ? { color: MUTED, dash: '0.1 5', width: 2.25, cap: 'round' as const }
    : { color: TONES[k % TONES.length]!, dash: DASH[k % DASH.length], width: k === 0 ? 2.5 : 1.75, cap: undefined });
  const indexAt = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    return n === 1 ? 0 : clamp(Math.round(((px - x0) / (x1 - x0)) * (n - 1)), 0, n - 1);
  };
  const toggle = (key: string) => setHidden((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else if (shown.length - next.size > 1) next.add(key);
    return next;
  });
  const style: CSSProperties = { height: svgH };
  const onlyOne = shown.length - hidden.size <= 1;
  const summary = reference || dd
    ? [refText, dd ? `${ddWord}: worst ${formatPercent(worst)}` : null].filter(Boolean).join('. ')
    : undefined;
  return (
    <ChartA11yShell
      className="kit-ct"
      dataAttrs={{ 'data-convention': convention }}
      testId={testId}
      label={label}
      roleDescription="line chart"
      count={n}
      speak={spoken}
      summary={summary}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between dates, Home and End to jump to the first and last.'}
      table={
        <>
          <table>
            <caption>{label}</caption>
            <thead>
              <tr>
                <th scope="col">{labels?.date ?? 'Date'}</th>
                {shown.map((x) => <th key={x.s.key} scope="col">{x.s.label}</th>)}
                {dd && <th scope="col">{ddWord}</th>}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n - firstRow }, (_, j) => {
                const i = firstRow + j;
                return <TableRow key={`${dates[i]}-${i}`} i={i} date={dates[i]!} shown={shown} formatDate={formatDate} valueText={valueText} extra={dd ? ddText(i) : undefined} />;
              })}
            </tbody>
          </table>
          {firstRow > 0 && <p>{(labels?.truncated ?? ((s: number, t: number) => `Showing the latest ${s} of ${t} dates`))(n - firstRow, n)}</p>}
        </>
      }
    >
      {({ index: idx, pointerTo, plotProps }) => (
    <>
      {onActiveChange && <ActiveReport index={idx} onChange={onActiveChange} />}
      <div className="kit-ct-head">
        <div className="kit-ct-legend-row" role="group" aria-label={words}>
          {shown.map((x, k) => {
            const off = hidden.has(x.s.key);
            const look = lookOf(k);
            return (
              <button key={x.s.key} type="button" className="kit-ct-toggle" aria-pressed={!off} aria-disabled={!off && onlyOne ? true : undefined} onClick={() => toggle(x.s.key)} data-testid={testId ? `${testId}-toggle-${x.s.key}` : undefined}>
                <svg width="20" height="8" viewBox="0 0 20 8" aria-hidden="true"><line x1="0" x2="20" y1="4" y2="4" stroke={look.color} strokeWidth={k === 0 ? 3 : 2} strokeDasharray={look.dash} strokeLinecap={look.cap} /></svg>
                <span>{x.s.label}</span>
                <b>{latest(x)}</b>
              </button>
            );
          })}
        </div>
        {periods && <div className="kit-ct-periods">{periods}</div>}
      </div>
      <div ref={ref} className="kit-ct-area" style={style}>
        {/* The plot is the one focus stop: arrow keys move through the data, the pointer reads it. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div className="kit-ct-plot" {...plotProps((e) => pointerTo(indexAt(e)))}>
          <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false">
            <defs>
              <clipPath id={`${uid}u`}><rect x={0} y={0} width={width} height={Math.max(0, baseY)} /></clipPath>
              <clipPath id={`${uid}d`}><rect x={0} y={baseY} width={width} height={Math.max(0, svgH - baseY)} /></clipPath>
            </defs>
            {levels.map((t, k) => (
              <g key={t}>
                <line className={`kit-ct-grid${t === baseLevel && anchored ? ' base' : ''}`} x1={x0} x2={x1} y1={yOf(t)} y2={yOf(t)} />
                {quiet
                  ? <text className="kit-ct-axis pu-ct-axis-in" x={x1 - 2} y={yOf(t) - 5} textAnchor="end">{tickText[k]}</text>
                  : <text className="kit-ct-axis" x={x1 + 8 + endW} y={yOf(t)} dominantBaseline="middle">{tickText[k]}</text>}
              </g>
            ))}
            {!anchored && area && <line className="kit-ct-grid base" x1={x0} x2={x1} y1={baseY} y2={baseY} />}
            {area && !hidden.has(shown[0]!.s.key) && geometry[0]!.map((runPts, r) => {
              if (runPts.length < 2) return null;
              const d = `M${cx(runPts[0]!.i).toFixed(1)},${baseY.toFixed(1)} ${runPts.map((p) => `L${cx(p.i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')} L${cx(runPts[runPts.length - 1]!.i).toFixed(1)},${baseY.toFixed(1)} Z`;
              return (
                <g key={r}>
                  <path className={`kit-ct-area-${upTone}`} d={d} clipPath={`url(#${uid}u)`} />
                  <path className={`kit-ct-area-${downTone}`} d={d} clipPath={`url(#${uid}d)`} />
                </g>
              );
            })}
            {refY !== null && refText && (
              <g className="pu-ct-ref" data-pin={refPin || undefined} data-testid={testId ? `${testId}-reference` : undefined}>
                <line x1={x0} x2={x1} y1={refY} y2={refY} />
                <text x={x1 - 4} y={refPin > 0 ? refY + 14 : refY - 5} textAnchor="end">{refText}</text>
              </g>
            )}
            {shown.map((x, k) => {
              if (hidden.has(x.s.key)) return null;
              const look = lookOf(k);
              return (
                <g key={x.s.key} className="kit-ct-line" style={{ color: look.color }}>
                  {geometry[k]!.map((runPts, r) =>
                    runPts.length === 1 ? (
                      <circle key={r} cx={cx(runPts[0]!.i)} cy={yOf(runPts[0]!.v)} r={k === 0 ? 3 : 2.5} />
                    ) : (
                      <path key={r} d={runPts.map((p, j) => `${j === 0 ? 'M' : 'L'}${cx(p.i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')} strokeWidth={look.width} strokeDasharray={look.dash} />
                    ),
                  )}
                </g>
              );
            })}
            {dd && (
              <g className="pu-ct-dd" data-testid={testId ? `${testId}-drawdown` : undefined}>
                <line className="kit-ct-grid base" x1={x0} x2={x1} y1={ddTop} y2={ddTop} />
                {ddRuns.map((run, r) => run.length > 1 && (
                  <path key={r} className="pu-ct-dd-area" d={`M${cx(run[0]!.i).toFixed(1)},${ddTop} ${run.map((p) => `L${cx(p.i).toFixed(1)},${ddY(p.v).toFixed(1)}`).join(' ')} L${cx(run[run.length - 1]!.i).toFixed(1)},${ddTop} Z`} />
                ))}
                {ddRuns.map((run, r) => run.length > 1 && (
                  <path key={`l${r}`} className="pu-ct-dd-line" d={run.map((p, j) => `${j === 0 ? 'M' : 'L'}${cx(p.i).toFixed(1)},${ddY(p.v).toFixed(1)}`).join(' ')} />
                ))}
                <text className="kit-ct-axis pu-ct-axis-in" x={x0 + 2} y={ddTop + 11}>{ddWord}</text>
                <text className="kit-ct-axis" x={x1 + 8 + endW} y={ddTop + DD_H} dominantBaseline="middle">{formatPercent(worst)}</text>
              </g>
            )}
            {ends.map((e) => {
              const look = lookOf(shown.indexOf(e.x));
              return (
                <g key={e.x.s.key} className="pu-ct-end" style={{ color: look.color }}>
                  <path d={`M${x1 + 1},${e.from.toFixed(1)} L${x1 + 5},${e.to.toFixed(1)}`} />
                  <line x1={x1 + 6} x2={x1 + 14} y1={e.to} y2={e.to} strokeDasharray={look.dash && look.dash !== '0.1 5' ? '3 2' : undefined} />
                  <text x={x1 + 18} y={e.to} dominantBaseline="middle">{e.text}</text>
                </g>
              );
            })}
            {labelIdx.map((i) => (
              <text key={i} className="kit-ct-axis" x={quiet ? (i === 0 && n > 1 ? x0 : n > 1 ? x1 : cx(i)) : clamp(cx(i), x0 + 24, x1 - 24)} y={svgH - 6} textAnchor={quiet && n > 1 ? (i === 0 ? 'start' : 'end') : 'middle'}>{formatDate(dates[i]!)}</text>
            ))}
            {idx !== null && (
              <g className="kit-ct-cross">
                <line x1={cx(idx)} x2={cx(idx)} y1={top} y2={top + plotH + ddBlock} />
                {shown.map((x, k) => {
                  const v = x.y[idx];
                  return v === null || v === undefined || hidden.has(x.s.key) ? null : <circle key={x.s.key} cx={cx(idx)} cy={yOf(v)} r={4} style={{ color: lookOf(k).color }} />;
                })}
              </g>
            )}
          </svg>
          {idx !== null && (
            <ChartTooltip x={cx(idx)} width={width} testId={testId ? `${testId}-tip` : undefined}>
              <b>{formatDate(dates[idx]!)}</b>
              <dl>
                {drawn.map((x) => (
                  <div key={x.s.key}><dt>{x.s.label}</dt><dd>{valueText(x, idx)}</dd></div>
                ))}
                {dd && <div><dt>{ddWord}</dt><dd>{ddText(idx)}</dd></div>}
              </dl>
            </ChartTooltip>
          )}
        </div>
      </div>
    </>
      )}
    </ChartA11yShell>
  );
}

/** Tells the owner which date is active; rendered inside the shell so it follows the pointer and the keyboard cursor alike. */
function ActiveReport({ index, onChange }: { index: number | null; onChange: (index: number | null) => void }) {
  useEffect(() => { onChange(index); }, [index, onChange]);
  return null;
}

interface Shown { s: PerformanceSeries; raw: (number | null)[]; y: (number | null)[] }

interface RowProps {
  i: number;
  date: string;
  shown: Shown[];
  formatDate: (date: string) => string;
  valueText: (x: Shown, i: number) => string;
  /** The drawdown cell, when the band is on. */
  extra?: string;
}

/** A table row re-renders only when one of its values (or a formatter) changed: a live tick on the latest date reformats one row. */
const TableRow = memo(function TableRow({ i, date, shown, formatDate, valueText, extra }: RowProps) {
  return (
    <tr>
      <th scope="row">{formatDate(date)}</th>
      {shown.map((x) => <td key={x.s.key}>{valueText(x, i)}</td>)}
      {extra !== undefined && <td>{extra}</td>}
    </tr>
  );
}, (a, b) => a.i === b.i && a.date === b.date && a.formatDate === b.formatDate && a.extra === b.extra && a.valueText === b.valueText && a.shown.length === b.shown.length
  && a.shown.every((x, k) => {
    const y = b.shown[k]!;
    return x.s.key === y.s.key && x.s.format === y.s.format && x.y[a.i] === y.y[a.i] && x.raw[a.i] === y.raw[a.i];
  }));
