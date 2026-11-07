'use client';

/**
 * SeasonalityChart (design.punji.app/components/seasonality-chart): the average return of each calendar month across
 * years, with the lowest-to-highest range of that month as a whisker and how often it rose (the hit rate) printed under
 * the month. It takes the same year-by-month data as `MonthGrid` (`MonthGridYear`), and reads month names from the same
 * helper, so it works on the Gregorian (AD) calendar or Bikram Sambat (BS), where the year starts at Baisakh. A bar up
 * from the zero baseline is a rise and a bar down is a fall (position, not colour, carries the sign; the tooltip, table
 * and summary print it with its sign). A month with fewer than `minYears` years has no average and says so in words
 * rather than drawing a bar from a thin sample; its range and hit rate still show.
 *
 * Returns are percent numbers: display maths on floats, not exact money.
 *
 * Accessible alternative: ChartA11yShell (one focus stop, arrows/Home/End/Escape across the twelve months, live region,
 * spoken summary naming the best and weakest months, hidden table of average, lowest, highest and hit rate).
 */
import type { PointerEvent, ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable, type ChartA11yContext } from '../chart-a11y/ChartA11yShell.tsx';
import { niceTicks, seasonalityStats, type SeasonalityStat } from '../chart-math/chartMath.ts';
import { ChartTooltip, clamp, isNum, useMeasuredWidth } from '../internal/chartFrame.tsx';
import { signedPercent } from '../internal/heat.ts';
import { monthNames, type MonthGridCalendar, type MonthGridYear } from '../month-grid/MonthGrid.tsx';

export interface SeasonalityChartLabels {
  empty?: ReactNode;
  month?: string;
  average?: string;
  lowest?: string;
  highest?: string;
  /** The hit rate column and row title. Default "Rose". */
  hitRate?: string;
  years?: string;
  /** A month without enough years for an average. Default "Needs N years". */
  needs?: (minYears: number) => string;
  /** "4 of 7 years". */
  ofYears?: (positive: number, years: number) => string;
  hint?: string;
  summary?: (info: { calendar: string; years: number; first: string; last: string; best: string; bestAverage: string; worst: string; worstAverage: string }) => string;
}

export interface SeasonalityChartProps {
  /** One row per year: 12 monthly returns in percent (index 0 is January, or Baisakh on BS). Missing months are skipped, never zero. */
  years: readonly MonthGridYear[];
  /** `ad` (default) or `bs`: which month names head the chart. */
  calendar?: MonthGridCalendar;
  /** Month names when `months` is not given. Default 'en'. */
  language?: 'en' | 'ne';
  /** Twelve full names and twelve short ones. Default: from the calendar and `language`, the same as MonthGrid. */
  months?: { full: readonly string[]; short: readonly string[] };
  /** A month needs this many years before it has an average. Default 3. */
  minYears?: number;
  /** Prints a year (a BS year may print in Devanagari digits). Default the number. */
  formatYear?: (year: number) => string;
  /** Names the chart and its data table. */
  label: string;
  /** The plot's height in CSS px, clamped to 160..440. Default 240. */
  height?: number;
  /** Pass false when a parent hides the chart and gives the same figures another way. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: SeasonalityChartLabels;
  /** Layout only (margin, grid placement). */
  className?: string;
  /** Becomes data-testid on the figure; each month's bar is `${testId}-month-${n}` (1 to 12). */
  testId?: string;
}

const TOP = 14;
const BOTTOM = 52;
const pct = (v: number): string => signedPercent(v, 1);
const tick = (v: number): string => `${v < 0 ? '−' : ''}${Math.abs(v)}%`;

/**
 * @stability beta
 */
export function SeasonalityChart(props: SeasonalityChartProps) {
  const minYears = Math.max(1, Math.floor(isNum(props.minYears) ? props.minYears : 3));
  const stats = seasonalityStats(props.years, minYears);
  if (stats.every((s) => s.years === 0)) {
    return (
      <figure className={`kit-ct pu-sea${props.className ? ` ${props.className}` : ''}`} aria-label={props.label} data-testid={props.testId}>
        <p className="kit-ct-empty">{props.labels?.empty ?? 'No data'}</p>
      </figure>
    );
  }
  return <Chart {...props} stats={stats} minYears={minYears} />;
}

function Chart({ years, stats, minYears, calendar = 'ad', language = 'en', months, formatYear = String, label, height = 240, interactive = true, labels, className, testId }: SeasonalityChartProps & { stats: SeasonalityStat[]; minYears: number }) {
  const names = months ?? monthNames(calendar, language);
  const L = {
    month: labels?.month ?? 'Month',
    average: labels?.average ?? 'Average',
    lowest: labels?.lowest ?? 'Lowest',
    highest: labels?.highest ?? 'Highest',
    rose: labels?.hitRate ?? 'Rose',
    yearsWord: labels?.years ?? 'Years',
    needs: labels?.needs ?? ((n: number) => `Needs ${n} years`),
    of: labels?.ofYears ?? ((p: number, y: number) => `${p} of ${y}`),
  };
  const withMean = stats.filter((s): s is SeasonalityStat & { mean: number } => s.mean !== null);
  const best = withMean.reduce<(typeof withMean)[number] | null>((a, s) => (a === null || s.mean > a.mean ? s : a), null);
  const worst = withMean.reduce<(typeof withMean)[number] | null>((a, s) => (a === null || s.mean < a.mean ? s : a), null);
  const yearNums = years.map((y) => y.year).filter(isNum).toSorted((a, b) => a - b);
  const summary = (
    labels?.summary ??
    ((i) =>
      `${label}: average return by month over ${i.years} years, ${i.first} to ${i.last}.${i.best ? ` Strongest ${i.best} at ${i.bestAverage}; weakest ${i.worst} at ${i.worstAverage}.` : ` No month has ${minYears} years yet.`}`)
  )({
    calendar,
    years: yearNums.length,
    first: yearNums.length ? formatYear(yearNums[0]!) : '',
    last: yearNums.length ? formatYear(yearNums[yearNums.length - 1]!) : '',
    best: best ? names.full[best.month - 1]! : '',
    bestAverage: best ? pct(best.mean) : '',
    worst: worst ? names.full[worst.month - 1]! : '',
    worstAverage: worst ? pct(worst.mean) : '',
  });
  const cellWords = (s: SeasonalityStat) =>
    s.years === 0
      ? `${L.needs(minYears)}`
      : `${s.mean !== null ? `${L.average.toLowerCase()} ${pct(s.mean)}` : L.needs(minYears)}, ${L.lowest.toLowerCase()} ${pct(s.min!)} (${formatYear(s.minYear!)}), ${L.highest.toLowerCase()} ${pct(s.max!)} (${formatYear(s.maxYear!)}), ${L.rose.toLowerCase()} ${L.of(s.positive, s.years)}`;
  const { ref, width } = useMeasuredWidth(640);
  const renderPlot = (ctx: ChartA11yContext) => {
    const plotH = clamp(isNum(height) ? height : 240, 160, 440);
    const svgH = TOP + plotH + BOTTOM;
    const los = stats.filter((s) => s.min !== null).map((s) => s.min!);
    const his = stats.filter((s) => s.max !== null).map((s) => s.max!);
    const ticks = niceTicks(Math.min(0, ...los), Math.max(0, ...his), Math.max(3, Math.round(plotH / 52)));
    const span = ticks.hi - ticks.lo || 1;
    const y = (v: number) => TOP + plotH - ((v - ticks.lo) / span) * plotH;
    const axisW = Math.min(56, Math.max(...ticks.ticks.map((t) => tick(t).length)) * 6.6 + 10);
    const x0 = axisW;
    const x1 = width - 4;
    const band = (x1 - x0) / 12;
    const cx = (k: number) => x0 + band * (k + 0.5);
    const barW = clamp(band * 0.5, 6, 28);
    const narrow = band < 34;
    const idx = ctx.index;
    const onPointer = (e: PointerEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - r.left;
      ctx.pointerTo(px < x0 || px > x1 ? null : clamp(Math.floor((px - x0) / band), 0, 11));
    };
    const zero = y(0);
    return (
      <div ref={ref} className="kit-ct-area" style={{ height: svgH }}>
        {/* The plot is the one focus stop: arrow keys move through the twelve months. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div className="kit-ct-plot" {...ctx.plotProps(onPointer)}>
          <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false">
            {ticks.ticks.map((t) => (
              <g key={t}>
                <line className={`kit-ct-grid${t === 0 ? ' base' : ''}`} x1={x0} x2={x1} y1={y(t)} y2={y(t)} />
                <text className="kit-ct-axis" x={x0 - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">{tick(t)}</text>
              </g>
            ))}
            <line className="pu-sea-base" x1={x0} x2={x1} y1={zero} y2={zero} />
            {stats.map((s, k) => {
              const lit = idx === k;
              return (
                <g key={s.month} className={`pu-sea-m${lit ? ' lit' : ''}`} data-testid={testId ? `${testId}-month-${s.month}` : undefined} data-tone={s.mean === null ? 'none' : s.mean > 0 ? 'gain' : s.mean < 0 ? 'loss' : 'flat'}>
                  {lit && <rect className="pu-sea-hi" x={x0 + band * k} y={TOP} width={band} height={plotH} />}
                  {s.min !== null && s.max !== null && s.years > 1 && (
                    <>
                      <line className="pu-sea-whisker" x1={cx(k)} x2={cx(k)} y1={y(s.min)} y2={y(s.max)} />
                      <line className="pu-sea-cap" x1={cx(k) - 4} x2={cx(k) + 4} y1={y(s.min)} y2={y(s.min)} />
                      <line className="pu-sea-cap" x1={cx(k) - 4} x2={cx(k) + 4} y1={y(s.max)} y2={y(s.max)} />
                    </>
                  )}
                  {s.mean !== null ? (
                    <rect className={`pu-sea-bar ${s.mean > 0 ? 'gain' : s.mean < 0 ? 'loss' : 'flat'}`} x={cx(k) - barW / 2} y={Math.min(zero, y(s.mean))} width={barW} height={Math.max(2, Math.abs(zero - y(s.mean)))} rx={2} />
                  ) : (
                    <text className="pu-sea-none" x={cx(k)} y={zero - 6} textAnchor="middle">·</text>
                  )}
                  <text className={`kit-ct-axis pu-sea-month${lit ? ' lit' : ''}`} x={cx(k)} y={TOP + plotH + 15} textAnchor="middle">{names.short[k]}</text>
                  <text className="pu-sea-rate" x={cx(k)} y={TOP + plotH + 33} textAnchor="middle">{s.hitRate === null ? '—' : `${Math.round(s.hitRate)}${narrow ? '' : '%'}`}</text>
                  <text className="pu-sea-of" x={cx(k)} y={TOP + plotH + 46} textAnchor="middle">{s.years === 0 ? '' : narrow ? `${s.positive}/${s.years}` : L.of(s.positive, s.years)}</text>
                </g>
              );
            })}
            <text className="kit-ct-axis pu-sea-rowtitle" x={x0} y={TOP + plotH + 33} textAnchor="end" dx={-6}>{narrow ? `${L.rose} %` : L.rose}</text>
          </svg>
          {idx !== null && (
            <ChartTooltip x={cx(idx)} width={width} testId={testId ? `${testId}-tip` : undefined}>
              <b>{names.full[idx]}</b>
              <dl>
                <div><dt>{L.average}</dt><dd>{stats[idx]!.mean !== null ? pct(stats[idx]!.mean!) : L.needs(minYears)}</dd></div>
                {stats[idx]!.years > 0 && (
                  <>
                    <div><dt>{L.highest}</dt><dd>{pct(stats[idx]!.max!)}</dd></div>
                    <div><dt>{L.lowest}</dt><dd>{pct(stats[idx]!.min!)}</dd></div>
                    <div><dt>{L.rose}</dt><dd>{L.of(stats[idx]!.positive, stats[idx]!.years)}</dd></div>
                  </>
                )}
              </dl>
            </ChartTooltip>
          )}
        </div>
      </div>
    );
  };
  return (
    <ChartA11yShell
      className={`kit-ct pu-sea${className ? ` ${className}` : ''}`}
      label={label}
      roleDescription="bar chart"
      count={12}
      testId={testId}
      interactive={interactive}
      dataAttrs={{ 'data-calendar': calendar }}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between months, Home and End to jump to the first and last month.'}
      summary={summary}
      speak={(k) => `${names.full[k]}: ${cellWords(stats[k]!)}`}
      footer={
        <ul className="kit-ct-legend pu-sea-legend" aria-hidden="true">
          <li><svg width="22" height="14" aria-hidden="true"><rect className="pu-sea-bar gain" x="3" y="2" width="6" height="10" rx="1" /><rect className="pu-sea-bar loss" x="13" y="6" width="6" height="6" rx="1" /></svg>{L.average}</li>
          <li><svg width="14" height="14" aria-hidden="true"><line className="pu-sea-whisker" x1="7" x2="7" y1="2" y2="12" /><line className="pu-sea-cap" x1="3" x2="11" y1="2" y2="2" /><line className="pu-sea-cap" x1="3" x2="11" y1="12" y2="12" /></svg>{L.lowest} to {L.highest.toLowerCase()}</li>
        </ul>
      }
      table={
        <ChartDataTable
          caption={label}
          head={[L.month, L.average, L.lowest, L.highest, L.rose, L.yearsWord]}
          rows={stats.map((s, k) => ({
            key: String(s.month),
            head: names.full[k]!,
            cells: [
              s.mean !== null ? pct(s.mean) : L.needs(minYears),
              s.min !== null ? `${pct(s.min)} (${formatYear(s.minYear!)})` : '—',
              s.max !== null ? `${pct(s.max)} (${formatYear(s.maxYear!)})` : '—',
              s.hitRate !== null ? `${Math.round(s.hitRate)}% (${L.of(s.positive, s.years)})` : '—',
              String(s.years),
            ],
          }))}
        />
      }
    >
      {renderPlot}
    </ChartA11yShell>
  );
}
