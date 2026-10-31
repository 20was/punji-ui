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
 */
import { useId, useMemo, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';

import { downsampleIndices, niceTicks, rebase, rebaseOnto } from '../chart-math/chartMath.ts';
import { ChartTooltip, clamp, isNum, shortDate, thinned, useChartCursor, useMeasuredWidth } from '../internal/chartFrame.tsx';

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
  /** Which colour means up. 'green-up' (default) or 'red-up'. */
  convention?: 'green-up' | 'red-up';
  /** Plot height in CSS px, clamped to 140..520. Default 260. */
  height?: number;
  /** Prints a raw value (when not normalised, and in the table). Default two decimals with lakh grouping. */
  formatValue?: (value: number) => string;
  /** Prints a percent change. Default signed, two decimals ("+4.20%"). */
  formatPercent?: (percent: number) => string;
  /** Prints a date on the axis and in the readout. Default "14 Nov". */
  formatDate?: (date: string) => string;
  /** Your period selector (1M, 3M, 1Y, All), shown above the chart. */
  periods?: ReactNode;
  /** Overrides for the printed words. */
  labels?: PerformanceChartLabels;
  /** Test id on the figure. */
  testId?: string;
}

const TONES = ['var(--pu-color-text)', 'var(--pu-color-series-nepse)', 'var(--pu-color-series-3)', 'var(--pu-color-series-4)', 'var(--pu-color-series-5)'];
const DASH = [undefined, '6 3', '2 3', '8 3 2 3', '1 3'];
const AXIS_H = 22;

const defaultValue = (v: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const defaultPercent = (p: number) => `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(2)}%`;

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

function Plot({ dates, series, label, normalize = true, area = true, convention = 'green-up', height = 260, formatValue = defaultValue, formatPercent = defaultPercent, formatDate = shortDate, periods, labels, testId }: PerformanceChartProps) {
  const { ref, width } = useMeasuredWidth(640);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const hintId = `${uid}h`;
  const none = labels?.none ?? 'none';
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const n = dates.length;
  const plotH = clamp(isNum(height) ? height : 260, 140, 520);
  const top = 8;
  const svgH = top + plotH + AXIS_H;

  const shown = useMemo(
    () => {
      const raws = series.map((s) => Array.from({ length: n }, (_, i) => (isNum(s.values[i]) ? (s.values[i] as number) : null)));
      const lead = normalize ? rebase(raws[0]!) : raws[0]!;
      // A benchmark that starts later continues from the portfolio's level on its first date (see rebaseOnto).
      return series.map((s, k) => ({ s, raw: raws[k]!, y: normalize ? (k === 0 ? lead : rebaseOnto(raws[k]!, lead)) : raws[k]! }));
    },
    [series, n, normalize],
  );
  const visible = shown.filter((x) => !hidden.has(x.s.key));
  const drawn = visible.length ? visible : shown;
  const baseLevel = normalize ? 0 : (shown[0]!.raw.find(isNum) ?? 0);

  let lo = Infinity;
  let hi = -Infinity;
  for (const x of drawn) for (const v of x.y) if (v !== null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
  if (normalize || area) { lo = Math.min(lo, baseLevel); hi = Math.max(hi, baseLevel); }
  const ticks = niceTicks(lo, hi, Math.max(3, Math.round(plotH / 56)));
  const fmtTick = (v: number) => (normalize ? formatPercent(v) : (series[0]?.format ?? formatValue)(v));
  const tickText = ticks.ticks.map(fmtTick);
  const axisW = Math.min(120, Math.max(...tickText.map((t) => t.length)) * 7 + 12);
  const x0 = 6;
  const x1 = Math.max(x0 + 20, width - axisW);
  const yOf = (v: number) => top + plotH - ((v - ticks.lo) / (ticks.hi - ticks.lo || 1)) * plotH;
  const cx = (i: number) => (n === 1 ? (x0 + x1) / 2 : x0 + (i / (n - 1)) * (x1 - x0));
  const step = n > 1 ? (x1 - x0) / (n - 1) : x1 - x0;
  const labelIdx = thinned(n, step, 76);
  const cap = Math.max(8, Math.floor((x1 - x0) / 2));

  // Paths: runs of real values joined; reduced by extremes when there are more points than room.
  const geometry = useMemo(() => shown.map(({ y }) => {
    const keep = downsampleIndices(y, cap);
    const runs: { i: number; v: number }[][] = [];
    let run: { i: number; v: number }[] = [];
    let prev = -2;
    // A run continues only across real neighbours in the original order (a gap breaks it).
    for (const i of keep) {
      const v = y[i];
      if (v === null || v === undefined) { if (run.length) runs.push(run); run = []; prev = -2; continue; }
      const gapBetween = prev >= 0 && y.slice(prev + 1, i).some((u) => u === null);
      if (gapBetween && run.length) { runs.push(run); run = []; }
      run.push({ i, v });
      prev = i;
    }
    if (run.length) runs.push(run);
    return runs;
  }), [shown, cap]);

  const cursor = useChartCursor(n);
  const idx = cursor.index;
  const words = labels?.legend ?? 'Series';
  const upTone = convention === 'red-up' ? 'loss' : 'gain';
  const downTone = convention === 'red-up' ? 'gain' : 'loss';
  const baseY = yOf(baseLevel);
  const valueText = (x: (typeof shown)[number], i: number) => {
    const v = x.y[i];
    const r = x.raw[i];
    if (v === null || v === undefined || r === null || r === undefined) return none;
    return normalize ? `${formatPercent(v)} (${(x.s.format ?? formatValue)(r)})` : (x.s.format ?? formatValue)(r);
  };
  const spoken = (i: number) => `${formatDate(dates[i]!)}: ${drawn.map((x) => `${x.s.label} ${valueText(x, i)}`).join(', ')}`;
  const latest = (x: (typeof shown)[number]) => {
    for (let i = n - 1; i >= 0; i -= 1) if (x.y[i] !== null) return normalize ? formatPercent(x.y[i] as number) : (x.s.format ?? formatValue)(x.raw[i] as number);
    return none;
  };
  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    cursor.pointerTo(n === 1 ? 0 : clamp(Math.round(((px - x0) / (x1 - x0)) * (n - 1)), 0, n - 1));
  };
  const toggle = (key: string) => setHidden((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else if (shown.length - next.size > 1) next.add(key);
    return next;
  });
  const style: CSSProperties = { height: svgH };
  const onlyOne = shown.length - hidden.size <= 1;
  return (
    <figure className="kit-ct" data-convention={convention} data-testid={testId} aria-label={label}>
      <div className="kit-ct-head">
        <div className="kit-ct-legend-row" role="group" aria-label={words}>
          {shown.map((x, k) => {
            const off = hidden.has(x.s.key);
            return (
              <button key={x.s.key} type="button" className="kit-ct-toggle" aria-pressed={!off} aria-disabled={!off && onlyOne ? true : undefined} onClick={() => toggle(x.s.key)} data-testid={testId ? `${testId}-toggle-${x.s.key}` : undefined}>
                <svg width="20" height="8" viewBox="0 0 20 8" aria-hidden="true"><line x1="0" x2="20" y1="4" y2="4" stroke={TONES[k % TONES.length]} strokeWidth={k === 0 ? 3 : 2} strokeDasharray={DASH[k % DASH.length]} /></svg>
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
        <div className="kit-ct-plot" tabIndex={0}
          role="group"
          aria-label={label}
          aria-roledescription="line chart"
          aria-describedby={hintId}
          onKeyDown={cursor.onKeyDown}
          onFocus={cursor.onFocus}
          onBlur={cursor.clear}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => cursor.pointerTo(null)}
        >
          <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false">
            <defs>
              <clipPath id={`${uid}u`}><rect x={0} y={0} width={width} height={Math.max(0, baseY)} /></clipPath>
              <clipPath id={`${uid}d`}><rect x={0} y={baseY} width={width} height={Math.max(0, svgH - baseY)} /></clipPath>
            </defs>
            {ticks.ticks.map((t, k) => (
              <g key={t}>
                <line className={`kit-ct-grid${t === baseLevel && normalize ? ' base' : ''}`} x1={x0} x2={x1} y1={yOf(t)} y2={yOf(t)} />
                <text className="kit-ct-axis" x={x1 + 8} y={yOf(t)} dominantBaseline="middle">{tickText[k]}</text>
              </g>
            ))}
            {!normalize && area && <line className="kit-ct-grid base" x1={x0} x2={x1} y1={baseY} y2={baseY} />}
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
            {shown.map((x, k) => {
              if (hidden.has(x.s.key)) return null;
              return (
                <g key={x.s.key} className="kit-ct-line" style={{ color: TONES[k % TONES.length] }}>
                  {geometry[k]!.map((runPts, r) =>
                    runPts.length === 1 ? (
                      <circle key={r} cx={cx(runPts[0]!.i)} cy={yOf(runPts[0]!.v)} r={k === 0 ? 3 : 2.5} />
                    ) : (
                      <path key={r} d={runPts.map((p, j) => `${j === 0 ? 'M' : 'L'}${cx(p.i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')} strokeWidth={k === 0 ? 2.5 : 1.75} strokeDasharray={DASH[k % DASH.length]} />
                    ),
                  )}
                </g>
              );
            })}
            {labelIdx.map((i) => (
              <text key={i} className="kit-ct-axis" x={clamp(cx(i), x0 + 24, x1 - 24)} y={svgH - 6} textAnchor="middle">{formatDate(dates[i]!)}</text>
            ))}
            {idx !== null && (
              <g className="kit-ct-cross">
                <line x1={cx(idx)} x2={cx(idx)} y1={top} y2={top + plotH} />
                {shown.map((x, k) => {
                  const v = x.y[idx];
                  return v === null || v === undefined || hidden.has(x.s.key) ? null : <circle key={x.s.key} cx={cx(idx)} cy={yOf(v)} r={4} style={{ color: TONES[k % TONES.length] }} />;
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
              </dl>
            </ChartTooltip>
          )}
        </div>
      </div>
      <p className="kit-sr" id={hintId}>{labels?.hint ?? 'Use the left and right arrow keys to move between dates, Home and End to jump to the first and last.'}</p>
      <div className="kit-sr" role="status" aria-live="polite" aria-atomic="true">{idx === null ? '' : spoken(idx)}</div>
      <div className="kit-sr">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">{labels?.date ?? 'Date'}</th>
              {shown.map((x) => <th key={x.s.key} scope="col">{x.s.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {dates.map((d, i) => (
              <tr key={`${d}-${i}`}>
                <th scope="row">{formatDate(d)}</th>
                {shown.map((x) => <td key={x.s.key}>{valueText(x, i)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
