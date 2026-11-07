'use client';

/**
 * FanChart (design.punji.app/components/fan-chart): a projection as percentile bands. It starts from one known value
 * and fans out over equally spaced steps (years, months) into nested bands, 5th to 95th and 25th to 75th by default,
 * with the median as a solid line. Values are decimal strings or `Money`, held as bigint: every printed figure is
 * exact, only the plot coordinates are numbers. Each band edge is labelled at the right with its percentile in words
 * and its exact end value (labels spread apart so they never collide), the median line is the only solid thick one, and
 * the outer edges are dashed: colour is never the only cue. An optional goal line says where it falls among the
 * percentiles at the last step. The projection comes from the app (a Monte Carlo run, a bank forecast); this component
 * only draws it.
 *
 * Accessible alternative: ChartA11yShell (one focus stop, arrows/Home/End/Escape through the start and every step, live
 * region, spoken summary, hidden table of every percentile at every step).
 */
import type { PointerEvent, ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable, type ChartA11yContext } from '../chart-a11y/ChartA11yShell.tsx';
import { niceTicks, spreadLabels } from '../chart-math/chartMath.ts';
import { ChartTooltip, clamp, isNum, thinned, useMeasuredWidth } from '../internal/chartFrame.tsx';
import { alignScale, currencyOf, decimalText, plotValue, scaledOf, type PriceInput, type Scaled } from '../internal/decimal.ts';

export type { PriceInput } from '../internal/decimal.ts';

export interface FanStart {
  /** The first step's name: a date, "Today", "Age 40". */
  x: string;
  /** The known value at the start. */
  value: PriceInput;
}

export interface FanStep {
  /** The step's name: a date, "2030", "Year 5". Steps are equally spaced in the order given. */
  x: string;
  /** One value per level, in the order of `levels` (lowest percentile first). A step with the wrong count or an unparsable value is skipped. */
  values: readonly PriceInput[];
}

export interface FanChartLabels {
  empty?: ReactNode;
  /** The table's first column head. Default "Step". */
  step?: string;
  /** The median. Default "Median". */
  median?: string;
  /** A percentile in words: (5) => "5th". Default English ordinals. */
  percentile?: (level: number) => string;
  /** The goal line. Default "Goal". */
  goal?: string;
  /** Where the goal sits at the last step. Default words in English. */
  goalAt?: (info: { goal: string; where: 'below' | 'above' | 'between' | 'at'; low: string; high: string }) => string;
  /** The legend entries. Defaults "Median", "{lo} to {hi} percentile" for each band. */
  band?: (lo: string, hi: string) => string;
  hint?: string;
  summary?: (info: { start: string; from: string; to: string; steps: number; median: string; low: string; high: string; lowLevel: string; highLevel: string; goal: string }) => string;
}

export interface FanChartProps {
  /** Where the projection starts. */
  start: FanStart;
  /** The projected steps after the start, in order. */
  steps: readonly FanStep[];
  /** The percentiles each step's `values` are for, ascending. Default [5, 25, 50, 75, 95]. Bands pair the lowest with the highest, and so on inward. */
  levels?: readonly number[];
  /** An optional goal (a target balance). Drawn as a dashed line and placed among the percentiles at the last step. */
  goal?: PriceInput;
  /** Names the chart and its data table. */
  label: string;
  /** ISO 4217 code for decimal strings. Default "NPR"; ignored for values given as `Money`. */
  currency?: string;
  /** BCP 47 tag for number grouping. Default "en-IN". */
  locale?: string;
  /** The plot's height in CSS px, clamped to 180..520. Default 300. */
  height?: number;
  /** Pass false when a parent hides the chart and gives the same figures another way. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: FanChartLabels;
  /** Layout only (margin, grid placement). */
  className?: string;
  /** Becomes data-testid on the figure; the end labels are `${testId}-level-${level}`. */
  testId?: string;
}

const DEFAULT_LEVELS: readonly number[] = [5, 25, 50, 75, 95];
const TOP = 12;
const AXIS_H = 22;
const CHAR = 6.6;

const ordinal = (n: number): string => {
  const t = n % 100;
  const s = t >= 11 && t <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${s}`;
};

interface Row {
  x: string;
  units: bigint[];
}

/** The levels used: finite, ascending and distinct, at least one; otherwise the default five. */
export function fanLevels(levels: readonly number[] | undefined): number[] {
  const ok = levels && levels.length > 0 && levels.every((l, i) => isNum(l) && l > 0 && l < 100 && (i === 0 || l > levels[i - 1]!));
  return [...(ok ? levels : DEFAULT_LEVELS)];
}

/**
 * Where `goal` sits among a step's values (ascending units, one scale): below the lowest, above the highest, at one
 * level exactly, or between two neighbouring levels. Exact. Returns the neighbouring level indexes.
 */
export function goalPosition(units: readonly bigint[], goal: bigint): { where: 'below' | 'above' | 'between' | 'at'; low: number; high: number } {
  const first = units[0]!;
  const last = units[units.length - 1]!;
  if (goal < first) return { where: 'below', low: 0, high: 0 };
  if (goal > last) return { where: 'above', low: units.length - 1, high: units.length - 1 };
  const at = units.findIndex((u) => u === goal);
  if (at >= 0) return { where: 'at', low: at, high: at };
  const high = units.findIndex((u) => u > goal);
  return { where: 'between', low: high - 1, high };
}

/**
 * @stability beta
 */
export function FanChart(props: FanChartProps) {
  const levels = fanLevels(props.levels);
  const code = currencyOf([props.start.value, props.goal, ...props.steps.flatMap((s) => s.values)], props.currency ?? 'NPR');
  const startScaled = scaledOf(props.start.value);
  const parsed: { x: string; v: Scaled[] }[] = [];
  for (const s of props.steps) {
    if (s.values.length !== levels.length) continue;
    const v = s.values.map(scaledOf);
    if (v.every((u): u is Scaled => u !== null)) parsed.push({ x: s.x, v });
  }
  if (!startScaled || parsed.length === 0) {
    return (
      <figure className={`kit-ct pu-fan${props.className ? ` ${props.className}` : ''}`} aria-label={props.label} data-testid={props.testId}>
        <p className="kit-ct-empty">{props.labels?.empty ?? 'No data'}</p>
      </figure>
    );
  }
  const goalScaled = scaledOf(props.goal);
  const all: Scaled[] = [startScaled, ...parsed.flatMap((p) => p.v), ...(goalScaled ? [goalScaled] : [])];
  const { units, scale } = alignScale(all);
  const rows: Row[] = [{ x: props.start.x, units: levels.map(() => units[0]!) }];
  let at = 1;
  for (const p of parsed) {
    rows.push({ x: p.x, units: units.slice(at, at + levels.length) });
    at += levels.length;
  }
  const goalU = goalScaled ? units[at]! : null;
  return <Chart {...props} code={code} levels={levels} rows={rows} scale={scale} goalU={goalU} />;
}

function Chart({ rows, levels, scale, goalU, code, label, locale, height = 300, interactive = true, labels, className, testId }: FanChartProps & { code: string; levels: number[]; rows: Row[]; scale: number; goalU: bigint | null }) {
  const text = decimalText(code, locale);
  const n = levels.length;
  const last = rows[rows.length - 1]!;
  const medianAt = levels.indexOf(50) >= 0 ? levels.indexOf(50) : n % 2 === 1 ? (n - 1) / 2 : -1;
  const L = {
    step: labels?.step ?? 'Step',
    median: labels?.median ?? 'Median',
    goal: labels?.goal ?? 'Goal',
    pct: labels?.percentile ?? ordinal,
    band: labels?.band ?? ((lo: string, hi: string) => `${lo} to ${hi} percentile`),
  };
  const levelName = (k: number) => (k === medianAt && levels[k] === 50 ? L.median : L.pct(levels[k]!));
  const goalWhere = goalU !== null ? goalPosition(last.units, goalU) : null;
  const goalText =
    goalU !== null && goalWhere
      ? (labels?.goalAt ??
          ((i) =>
            i.where === 'below'
              ? `${i.goal} is below the ${i.low} percentile`
              : i.where === 'above'
                ? `${i.goal} is above the ${i.high} percentile`
                : i.where === 'at'
                  ? `${i.goal} is at the ${i.low} percentile`
                  : `${i.goal} is between the ${i.low} and ${i.high} percentiles`))({
          goal: text.plain(goalU, scale),
          where: goalWhere.where,
          low: L.pct(levels[goalWhere.low]!),
          high: L.pct(levels[goalWhere.high]!),
        })
      : '';
  const first = rows[0]!;
  const summary = (
    labels?.summary ??
    ((i) =>
      `${label}: from ${i.start} at ${i.from} over ${i.steps} steps to ${i.to}. At ${i.to} the median is ${i.median}; the ${i.lowLevel} percentile is ${i.low} and the ${i.highLevel} percentile is ${i.high}.${i.goal ? ` ${i.goal}.` : ''}`)
  )({
    start: text.plain(first.units[0]!, scale),
    from: first.x,
    to: last.x,
    steps: rows.length - 1,
    median: medianAt >= 0 ? text.plain(last.units[medianAt]!, scale) : '',
    low: text.plain(last.units[0]!, scale),
    high: text.plain(last.units[n - 1]!, scale),
    lowLevel: L.pct(levels[0]!),
    highLevel: L.pct(levels[n - 1]!),
    goal: goalText,
  });
  const { ref, width } = useMeasuredWidth(640);
  const speakRow = (i: number) =>
    `${rows[i]!.x}: ${levels.map((_, k) => `${levelName(k)} ${text.plain(rows[i]!.units[k]!, scale)}`).join(', ')}`;
  const renderPlot = (ctx: ChartA11yContext) => {
    const plotH = clamp(isNum(height) ? height : 300, 180, 520);
    const svgH = TOP + plotH + AXIS_H;
    const nums = [...rows.flatMap((r) => r.units), ...(goalU !== null ? [goalU] : [])].map((u) => plotValue(u, scale));
    const ticks = niceTicks(Math.min(...nums), Math.max(...nums), Math.max(3, Math.round(plotH / 56)));
    const span = ticks.hi - ticks.lo || 1;
    const y = (v: number) => TOP + plotH - ((v - ticks.lo) / span) * plotH;
    const yU = (u: bigint) => y(plotValue(u, scale));
    const tickText = ticks.ticks.map((v) => text.tick(v, scale));
    const axisW = Math.min(88, Math.max(...tickText.map((s) => s.length)) * CHAR + 12);
    const endText = (k: number) => `${levelName(k)} ${text.bare(last.units[k]!, scale)}`;
    const labelChars = Math.max(...levels.map((_, k) => endText(k).length));
    const gutter = Math.min(width * 0.46, Math.max(92, labelChars * CHAR + 16));
    const x0 = axisW;
    const x1 = Math.max(x0 + 60, width - gutter);
    const m = rows.length;
    const x = (i: number) => x0 + (m === 1 ? 0 : (i / (m - 1)) * (x1 - x0));
    const edge = (k: number) => rows.map((r, i) => `${x(i).toFixed(1)},${yU(r.units[k]!).toFixed(1)}`);
    const tipY = levels.map((_, k) => yU(last.units[k]!));
    const labelY = spreadLabels(tipY, 15, TOP + 8, TOP + plotH - 6);
    const xTicks = thinned(m, (x1 - x0) / Math.max(1, m - 1), 64);
    if (!xTicks.includes(0) && x(xTicks[0] ?? 0) - x0 > 64) xTicks.unshift(0);
    const idx = ctx.index;
    const onPointer = (e: PointerEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - r.left;
      ctx.pointerTo(px < x0 - 4 || px > x1 + 4 ? null : clamp(Math.round(((px - x0) / (x1 - x0 || 1)) * (m - 1)), 0, m - 1));
    };
    const pairs = Math.floor(n / 2);
    return (
      <div ref={ref} className="kit-ct-area" style={{ height: svgH }}>
        {/* The plot is the one focus stop: arrow keys move through the start and every step. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div className="kit-ct-plot" {...ctx.plotProps(onPointer)}>
          <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false">
            {ticks.ticks.map((t, k) => (
              <g key={t}>
                <line className="kit-ct-grid" x1={x0} x2={x1} y1={y(t)} y2={y(t)} />
                <text className="kit-ct-axis" x={x0 - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">{tickText[k]}</text>
              </g>
            ))}
            {xTicks.map((i) => (
              <text key={i} className="kit-ct-axis" x={x(i)} y={svgH - 6} textAnchor={i === 0 ? 'start' : i === m - 1 ? 'end' : 'middle'}>{rows[i]!.x}</text>
            ))}
            {Array.from({ length: pairs }, (_, k) => {
              const lo = edge(k);
              const hi = edge(n - 1 - k);
              return <polygon key={k} className={`pu-fan-band ${k === 0 ? 'out' : 'in'}`} points={`${hi.join(' ')} ${lo.toReversed().join(' ')}`} />;
            })}
            {levels.map((lv, k) => (
              <polyline key={lv} className={`pu-fan-line ${k === medianAt ? 'median' : k === 0 || k === n - 1 ? 'edge' : 'mid'}`} points={edge(k).join(' ')} fill="none" />
            ))}
            {goalU !== null && (
              <g>
                <line className="pu-fan-goal" x1={x0} x2={x1} y1={yU(goalU)} y2={yU(goalU)} />
                <text className="pu-fan-goal-label" x={x0 + 4} y={yU(goalU) - 5}>{`${L.goal} ${text.bare(goalU, scale)}`}</text>
              </g>
            )}
            {levels.map((lv, k) => (
              <g key={lv} data-testid={testId ? `${testId}-level-${lv}` : undefined}>
                {Math.abs(labelY[k]! - tipY[k]!) > 1 && <line className="pu-fan-lead" x1={x1 + 2} y1={tipY[k]!} x2={x1 + 8} y2={labelY[k]!} />}
                <text className={`pu-fan-tl${k === medianAt ? ' median' : ''}`} x={x1 + 10} y={labelY[k]!} dominantBaseline="middle">
                  <tspan className="pu-fan-tw">{levelName(k)}</tspan>
                  <tspan className="pu-fan-tn" dx={5}>{text.bare(last.units[k]!, scale)}</tspan>
                </text>
              </g>
            ))}
            {idx !== null && (
              <>
                <line className="pu-fan-cross" x1={x(idx)} x2={x(idx)} y1={TOP} y2={TOP + plotH} />
                {levels.map((lv, k) => (
                  <circle key={lv} className={`pu-fan-dot${k === medianAt ? ' median' : ''}`} cx={x(idx)} cy={yU(rows[idx]!.units[k]!)} r={k === medianAt ? 5 : 3.5} />
                ))}
              </>
            )}
          </svg>
          {idx !== null && (
            <ChartTooltip x={x(idx)} width={width} testId={testId ? `${testId}-tip` : undefined}>
              <b>{rows[idx]!.x}</b>
              <dl>
                {levels.map((_, k) => levels.length - 1 - k).map((k) => (
                  <div key={k}><dt>{levelName(k)}</dt><dd>{text.bare(rows[idx]!.units[k]!, scale)}</dd></div>
                ))}
              </dl>
            </ChartTooltip>
          )}
        </div>
      </div>
    );
  };
  return (
    <ChartA11yShell
      className={`kit-ct pu-fan${className ? ` ${className}` : ''}`}
      label={label}
      roleDescription="fan chart"
      count={rows.length}
      testId={testId}
      interactive={interactive}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between steps, Home and End to jump to the start and the last step.'}
      summary={summary}
      speak={speakRow}
      footer={
        <>
          <ul className="kit-ct-legend pu-fan-legend" aria-hidden="true">
            {medianAt >= 0 && <li><svg width="22" height="10" aria-hidden="true"><line className="pu-fan-sw median" x1="1" x2="21" y1="5" y2="5" /></svg>{L.median}</li>}
            {Array.from({ length: Math.floor(n / 2) }, (_, k) => (
              <li key={k}>
                <svg width="22" height="10" aria-hidden="true"><rect className={`pu-fan-band ${k === 0 ? 'out' : 'in'}`} x="1" y="1" width="20" height="8" rx="2" /></svg>
                {L.band(L.pct(levels[k]!), L.pct(levels[n - 1 - k]!))}
              </li>
            ))}
            {goalU !== null && <li><svg width="22" height="10" aria-hidden="true"><line className="pu-fan-sw goal" x1="1" x2="21" y1="5" y2="5" /></svg>{L.goal}</li>}
          </ul>
          {goalText && <p className="pu-fan-goal-note">{goalText}</p>}
        </>
      }
      table={
        <ChartDataTable
          caption={label}
          head={[L.step, ...levels.map((_, k) => levelName(k))]}
          rows={rows.map((r, i) => ({ key: `${r.x}-${i}`, head: r.x, cells: levels.map((_, k) => text.plain(r.units[k]!, scale)) }))}
          note={goalText ? <p>{goalText}</p> : undefined}
        />
      }
    >
      {renderPlot}
    </ChartA11yShell>
  );
}
