'use client';

/**
 * RollingReturnsChart (design.punji.app/components/rolling-returns-chart): the return over every trailing N periods
 * (every 3-year window of a fund's history, say), or the rolling drawdown (the fall from the highest value in the
 * trailing N periods), as a line with an emphasised zero baseline. You give the price or NAV levels; the chart works
 * the windows out with `rollingReturns` / `rollingDrawdown` from chart-math, so the maths is the tested pure one. With
 * one series the area between the line and zero is shaded; above zero and below it are also told apart by position,
 * the sign in every figure and the words in the summary, never by colour alone. Several series (a fund and its
 * benchmark) differ by dash as well as colour. The footer prints the latest figure, the best and worst window with their
 * dates, and the share of windows above zero.
 *
 * Figures are display maths on number levels (floats), rounded to one decimal; for exact money use the money module.
 *
 * Accessible alternative: ChartA11yShell (one focus stop, arrows/Home/End/Escape through every date that has a figure,
 * live region, spoken summary, hidden table of the latest 500 dates).
 */
import { useId, type PointerEvent, type ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable, type ChartA11yContext } from '../chart-a11y/ChartA11yShell.tsx';
import { downsampleIndices, niceTicks, rollingDrawdown, rollingReturns } from '../chart-math/chartMath.ts';
import { ChartTooltip, clamp, isNum, shortDate, thinned, useMeasuredWidth } from '../internal/chartFrame.tsx';
import { signedPercent } from '../internal/heat.ts';

export type RollingMetric = 'return' | 'drawdown';

export interface RollingSeries {
  /** Stable key (test ids, React keys). */
  key: string;
  /** The series name: "Fund", "Benchmark". */
  label: string;
  /** Price or NAV levels, one per date (not returns). `null` or missing: no figure, never zero. */
  values: readonly (number | null | undefined)[];
}

export interface RollingReturnsChartLabels {
  empty?: ReactNode;
  date?: string;
  /** The words for the window, given the number of periods: "12 periods". Default `${n} periods`. */
  window?: (periods: number) => string;
  /** The metric names. Defaults "Rolling return" and "Rolling drawdown". */
  returnName?: string;
  drawdownName?: string;
  latest?: string;
  best?: string;
  worst?: string;
  /** The share of windows above zero, for the return metric. */
  positive?: (info: { positive: number; windows: number; percent: string }) => string;
  /** Shown in the table and the tooltip for a date with no figure. */
  noFigure?: string;
  hint?: string;
  summary?: (info: { metric: string; window: string; series: string; from: string; to: string; latest: string; best: string; bestDate: string; worst: string; worstDate: string }) => string;
}

export interface RollingReturnsChartProps {
  /** "YYYY-MM-DD", oldest first, one per value. */
  dates: readonly string[];
  /** One to four series of levels. Further series are ignored. */
  series: readonly RollingSeries[];
  /** The window, in periods (dates), a whole number from 1. Default 12. */
  window?: number;
  /** `return` (default): the return over each trailing window. `drawdown`: the fall from the window's high. */
  metric?: RollingMetric;
  /** Annualise the return: pass the number of periods in a year (12 for monthly dates, 252 for daily). Ignored for drawdown. */
  periodsPerYear?: number;
  /** Names the chart and its data table. */
  label: string;
  /** The plot's height in CSS px, clamped to 160..480. Default 260. */
  height?: number;
  /** Pass false when a parent hides the chart and gives the same figures another way. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: RollingReturnsChartLabels;
  /** Layout only (margin, grid placement). */
  className?: string;
  /** Becomes data-testid on the figure; the footer figures are `${testId}-latest`, `-best` and `-worst`. */
  testId?: string;
}

const TABLE_MAX = 500;
const TOP = 12;
const AXIS_H = 22;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pct = (v: number): string => signedPercent(v, 1);
const tickPct = (v: number): string => `${v < 0 ? '−' : ''}${Math.abs(v)}%`;
const monthYear = (date: string): string => {
  const m = /^(\d{4})-(\d{2})/.exec(date);
  return m ? `${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}` : date;
};

export interface RollingReading {
  /** One array per series, aligned with the dates. */
  rolled: (number | null)[][];
  /** Date indexes where at least one series has a figure. */
  positions: number[];
  /** The first series: latest figure and its index, best and worst with indexes, and how many windows were above zero. */
  latest: { value: number; index: number } | null;
  best: { value: number; index: number } | null;
  worst: { value: number; index: number } | null;
  positive: number;
  windows: number;
}

/** The windows and the readings the chart prints. Pure. */
export function rollingReading(series: readonly RollingSeries[], dateCount: number, window: number, metric: RollingMetric, periodsPerYear?: number): RollingReading {
  const rolled = series.map((s) => {
    const values = Array.from({ length: dateCount }, (_, i) => s.values[i]);
    return metric === 'drawdown' ? rollingDrawdown(values, window) : rollingReturns(values, window, periodsPerYear);
  });
  const positions: number[] = [];
  for (let i = 0; i < dateCount; i += 1) if (rolled.some((r) => isNum(r[i]))) positions.push(i);
  let latest: RollingReading['latest'] = null;
  let best: RollingReading['best'] = null;
  let worst: RollingReading['worst'] = null;
  let positive = 0;
  let windows = 0;
  const primary = rolled[0] ?? [];
  for (let i = 0; i < primary.length; i += 1) {
    const v = primary[i];
    if (!isNum(v)) continue;
    windows += 1;
    if (v > 0) positive += 1;
    latest = { value: v, index: i };
    if (best === null || v > best.value) best = { value: v, index: i };
    if (worst === null || v < worst.value) worst = { value: v, index: i };
  }
  return { rolled, positions, latest, best, worst, positive, windows };
}

/** A line with breaks where a value is missing. */
const pathOf = (values: readonly (number | null)[], idxs: readonly number[], x: (i: number) => number, y: (v: number) => number): string => {
  let d = '';
  let pen = false;
  for (const i of idxs) {
    const v = values[i];
    if (!isNum(v)) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  }
  return d;
};

/**
 * @stability beta
 */
export function RollingReturnsChart(props: RollingReturnsChartProps) {
  const series = props.series.slice(0, 4);
  const window = Math.max(1, Math.floor(isNum(props.window) ? props.window : 12));
  const metric: RollingMetric = props.metric === 'drawdown' ? 'drawdown' : 'return';
  const read = rollingReading(series, props.dates.length, window, metric, props.periodsPerYear);
  if (props.dates.length === 0 || series.length === 0 || read.positions.length === 0) {
    return (
      <figure className={`kit-ct pu-rr${props.className ? ` ${props.className}` : ''}`} aria-label={props.label} data-testid={props.testId}>
        <p className="kit-ct-empty">{props.labels?.empty ?? `Not enough history: a ${window}-period window needs at least ${window + 1} dates with a value`}</p>
      </figure>
    );
  }
  return <Chart {...props} series={series} window={window} metric={metric} read={read} />;
}

function Chart({ dates, series, window, metric, label, height = 260, interactive = true, labels, className, testId, read }: RollingReturnsChartProps & { series: readonly RollingSeries[]; window: number; metric: RollingMetric; read: RollingReading }) {
  const clipId = useId();
  const L = {
    date: labels?.date ?? 'Date',
    noFigure: labels?.noFigure ?? 'No figure yet',
    latest: labels?.latest ?? 'Latest',
    best: labels?.best ?? (metric === 'drawdown' ? 'Shallowest' : 'Best'),
    worst: labels?.worst ?? (metric === 'drawdown' ? 'Deepest' : 'Worst'),
    win: (labels?.window ?? ((n: number) => `${n} ${n === 1 ? 'period' : 'periods'}`))(window),
    metric: metric === 'drawdown' ? (labels?.drawdownName ?? 'Rolling drawdown') : (labels?.returnName ?? 'Rolling return'),
  };
  const { positions, rolled, latest, best, worst } = read;
  const n = positions.length;
  const dateAt = (i: number) => dates[i] ?? '';
  const first = dateAt(positions[0]!);
  const lastDate = dateAt(positions[n - 1]!);
  const cell = (s: number, i: number) => (isNum(rolled[s]![i]) ? pct(rolled[s]![i] as number) : L.noFigure);
  const summary = (
    labels?.summary ??
    ((i) =>
      `${i.series}: ${i.metric} over ${i.window}, from ${i.from} to ${i.to}. Latest ${i.latest}; ${i.best.length ? `${i.best} on ${i.bestDate}` : ''}${i.worst.length ? `, ${i.worst} on ${i.worstDate}` : ''}.`)
  )({
    metric: L.metric.toLowerCase(),
    window: L.win,
    series: series[0]!.label,
    from: first,
    to: lastDate,
    latest: latest ? pct(latest.value) : L.noFigure,
    best: best ? `${L.best.toLowerCase()} ${pct(best.value)}` : '',
    bestDate: best ? dateAt(best.index) : '',
    worst: worst ? `${L.worst.toLowerCase()} ${pct(worst.value)}` : '',
    worstDate: worst ? dateAt(worst.index) : '',
  });
  const { ref, width } = useMeasuredWidth(640);
  const shown = n > TABLE_MAX ? positions.slice(-TABLE_MAX) : positions;
  const share = read.windows ? (read.positive / read.windows) * 100 : 0;
  const renderPlot = (ctx: ChartA11yContext) => {
    const plotH = clamp(isNum(height) ? height : 260, 160, 480);
    const svgH = TOP + plotH + AXIS_H;
    const nums = rolled.flatMap((r) => r.filter(isNum));
    const lo = Math.min(0, ...nums);
    const hi = Math.max(0, ...nums);
    const ticks = niceTicks(lo, hi === lo ? lo + 1 : hi, Math.max(3, Math.round(plotH / 56)));
    const span = ticks.hi - ticks.lo || 1;
    const y = (v: number) => TOP + plotH - ((v - ticks.lo) / span) * plotH;
    const axisW = Math.min(64, Math.max(...ticks.ticks.map((t) => tickPct(t).length)) * 6.6 + 12);
    const x0 = axisW;
    const x1 = width - 8;
    const total = dates.length;
    const x = (i: number) => x0 + (total === 1 ? 0 : (i / (total - 1)) * (x1 - x0));
    const step = (x1 - x0) / Math.max(1, total - 1);
    const per = positions[positions.length - 1]! - positions[0]!;
    const years = per * step > 0 && dateAt(positions[0]!).slice(0, 4) !== lastDate.slice(0, 4);
    const tickIdx = thinned(n, (x1 - x0) / Math.max(1, n - 1), 100).map((k) => positions[k]!);
    const lines = series.map((_, s) => {
      const idxs = downsampleIndices(rolled[s]!.map((v, i) => (i >= positions[0]! ? v : null)), Math.max(60, Math.round(x1 - x0))).filter((i) => i >= positions[0]!);
      return pathOf(rolled[s]!, idxs, x, y);
    });
    const area = series.length === 1 && lines[0] ? `${lines[0]}L${x(positions[n - 1]!).toFixed(1)},${y(0).toFixed(1)}L${x(positions[0]!).toFixed(1)},${y(0).toFixed(1)}Z` : '';
    const idxN = ctx.index;
    const idx = idxN === null ? null : positions[idxN]!;
    const onPointer = (e: PointerEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - r.left;
      if (px < x0 - 4 || px > x1 + 4) return ctx.pointerTo(null);
      const guess = Math.round(((px - x0) / (x1 - x0 || 1)) * (total - 1));
      let bestK = 0;
      for (let k = 0; k < n; k += 1) if (Math.abs(positions[k]! - guess) < Math.abs(positions[bestK]! - guess)) bestK = k;
      ctx.pointerTo(bestK);
    };
    return (
      <div ref={ref} className="kit-ct-area" style={{ height: svgH }}>
        {/* The plot is the one focus stop: arrow keys move through the dates that have a figure. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div className="kit-ct-plot" {...ctx.plotProps(onPointer)}>
          <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false">
            {area && metric === 'return' && (
              <>
                <clipPath id={`${clipId}-up`}><rect x={x0} y={TOP} width={x1 - x0} height={Math.max(0, y(0) - TOP)} /></clipPath>
                <clipPath id={`${clipId}-down`}><rect x={x0} y={y(0)} width={x1 - x0} height={Math.max(0, TOP + plotH - y(0))} /></clipPath>
                <path className="kit-ct-area-gain" d={area} clipPath={`url(#${clipId}-up)`} />
                <path className="kit-ct-area-loss" d={area} clipPath={`url(#${clipId}-down)`} />
              </>
            )}
            {area && metric === 'drawdown' && <path className="kit-ct-area-loss" d={area} />}
            {ticks.ticks.map((t) => (
              <g key={t}>
                <line className={`kit-ct-grid${t === 0 ? ' base' : ''}`} x1={x0} x2={x1} y1={y(t)} y2={y(t)} />
                <text className={`kit-ct-axis${t === 0 ? ' pu-rr-zero' : ''}`} x={x0 - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">{tickPct(t)}</text>
              </g>
            ))}
            <line className="pu-rr-base" x1={x0} x2={x1} y1={y(0)} y2={y(0)} />
            {tickIdx.map((i, k) => (
              <text key={i} className="kit-ct-axis" x={x(i)} y={svgH - 6} textAnchor={k === 0 ? 'start' : k === tickIdx.length - 1 ? 'end' : 'middle'}>{years ? monthYear(dateAt(i)) : shortDate(dateAt(i))}</text>
            ))}
            {lines.map((d, s) => (
              <path key={series[s]!.key} className={`pu-rr-line s${s}`} d={d} fill="none" data-testid={testId ? `${testId}-line-${series[s]!.key}` : undefined} />
            ))}
            {idx !== null && (
              <>
                <line className="pu-rr-cross" x1={x(idx)} x2={x(idx)} y1={TOP} y2={TOP + plotH} />
                {series.map((s, k) => (isNum(rolled[k]![idx]) ? <circle key={s.key} className={`pu-rr-dot s${k}`} cx={x(idx)} cy={y(rolled[k]![idx] as number)} r={4.5} /> : null))}
              </>
            )}
          </svg>
          {idx !== null && (
            <ChartTooltip x={x(idx)} width={width} testId={testId ? `${testId}-tip` : undefined}>
              <b>{dateAt(idx)}</b>
              <dl>
                {series.map((s, k) => (
                  <div key={s.key}><dt>{s.label}</dt><dd>{cell(k, idx)}</dd></div>
                ))}
              </dl>
            </ChartTooltip>
          )}
        </div>
      </div>
    );
  };
  const stat = (name: string, key: string, f: { value: number; index: number } | null) =>
    f ? (
      <div data-testid={testId ? `${testId}-${key}` : undefined}>
        <dt>{name}</dt>
        <dd>
          <b className={f.value > 0 ? 'gain' : f.value < 0 ? 'loss' : undefined}>{pct(f.value)}</b>
          <span>{dateAt(f.index)}</span>
        </dd>
      </div>
    ) : null;
  return (
    <ChartA11yShell
      className={`kit-ct pu-rr${className ? ` ${className}` : ''}`}
      label={label}
      roleDescription="line chart"
      count={n}
      testId={testId}
      interactive={interactive}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between dates, Home and End to jump to the first and latest.'}
      summary={summary}
      speak={(k) => `${dateAt(positions[k]!)}: ${series.map((s, si) => `${series.length > 1 ? `${s.label} ` : ''}${cell(si, positions[k]!)}`).join(', ')}`}
      footer={
        <>
          <ul className="kit-ct-legend pu-rr-legend" aria-hidden="true">
            {series.map((s, k) => (
              <li key={s.key}><svg width="22" height="10" aria-hidden="true"><line className={`pu-rr-sw s${k}`} x1="1" x2="21" y1="5" y2="5" /></svg>{s.label}</li>
            ))}
            <li className="pu-rr-win">{L.metric}, {L.win}</li>
          </ul>
          <dl className="pu-rr-stats">
            {stat(L.latest, 'latest', latest)}
            {stat(L.best, 'best', best)}
            {stat(L.worst, 'worst', worst)}
            {metric === 'return' && read.windows > 0 && (
              <div>
                <dt>{labels?.positive?.({ positive: read.positive, windows: read.windows, percent: `${Math.round(share)}%` }) ?? `Above zero`}</dt>
                <dd><b>{Math.round(share)}%</b><span>{read.positive} of {read.windows}</span></dd>
              </div>
            )}
          </dl>
        </>
      }
      table={
        <ChartDataTable
          caption={label}
          head={[L.date, ...series.map((s) => `${s.label}, ${L.metric.toLowerCase()} ${L.win}`)]}
          rows={shown.map((i) => ({ key: dateAt(i) + i, head: dateAt(i), cells: series.map((_, s) => cell(s, i)) }))}
          note={shown.length < n ? <p>{`Showing the latest ${shown.length} of ${n} dates`}</p> : undefined}
        />
      }
    >
      {renderPlot}
    </ChartA11yShell>
  );
}
