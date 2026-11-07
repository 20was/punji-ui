'use client';

/**
 * BreadthChart: how many stocks take part in a move, over days. Two modes on one chart, both on `ChartA11yShell`
 * (one focus stop, Left, Right, Home, End and Escape through the days, a readout, a polite live region, a spoken
 * summary and a hidden table with every day):
 *   mode="advance-decline"   the advance-decline line, the running total of advances minus declines
 *                            (`advanceDeclineLine`); days come in as the counts `MarketBreadth` shows (`BreadthDay`).
 *   mode="percent-above-ma"  the share of constituents above their own N-day simple moving average
 *                            (`percentAboveMA`), on a 0 to 100 axis with the 50 percent line dashed and labelled.
 * Direction is said in words (and a triangle in the readout), never by colour alone; the line is one series.
 * Both helpers are pure and importable from `@punji/ui/chart-breadth`.
 *
 * Edge cases: no days (or no day with a share yet) prints `labels.empty`; a bad close prints the reason; a day with no
 * eligible constituent has no share, breaks the line and reads "none" in the table.
 */
import { useId, useMemo, type HTMLAttributes, type PointerEvent } from 'react';

import { ChartA11yShell, ChartDataTable } from '../chart-a11y/ChartA11yShell.tsx';
import { advanceDeclineLine, percentAboveMA, type BreadthConstituent, type BreadthDay } from '../chart-math/breadth.ts';
import { niceTicks } from '../chart-math/chartMath.ts';
import { ChartTooltip, clamp, isNum, shortDate, thinned, useMeasuredWidth } from '../internal/chartFrame.tsx';

export interface BreadthChartLabels {
  /** Default "No breadth data to draw." */
  empty: string;
  /** Default "Cannot draw this chart: {reason}". */
  error: (reason: string) => string;
  date: string;
  advances: string;
  declines: string;
  net: string;
  /** Table head of the running total. Default "A/D line". */
  line: string;
  direction: string;
  /** Words for the day's direction. Defaults "Advances led", "Declines led", "Even". */
  advancesLed: string;
  declinesLed: string;
  even: string;
  /** Table heads of the percent mode. Defaults "Above", "Of", "Share above". */
  above: string;
  of: string;
  /** Between two counts in a sentence. Default "of". */
  outOf: string;
  share: string;
  /** Default "Change". */
  change: string;
  /** Words for the share's move against the previous day. Defaults "Up", "Down", "No change", "First day". */
  up: string;
  down: string;
  unchanged: string;
  first: string;
  /** Default "none". */
  none: string;
  /** The dashed line's label. Default "50%". */
  reference: string;
  /** Names the share in the readout and table. Receives the period. Default "Above 200-day average". */
  shareName: (period: number) => string;
  hint: string;
  /** Spoken summary of the whole chart. */
  summaryAD: (info: { days: number; from: string; to: string; first: string; last: string; net: string }) => string;
  summaryPct: (info: { period: number; from: string; to: string; first: string; last: string }) => string;
}

const grouped = (n: number) => n.toLocaleString('en-IN');
const signed = (n: number) => (n > 0 ? `+${grouped(n)}` : n < 0 ? `−${grouped(-n)}` : '0');

const EN: BreadthChartLabels = {
  empty: 'No breadth data to draw.',
  error: (reason) => `Cannot draw this chart: ${reason}`,
  date: 'Date',
  advances: 'Advances',
  declines: 'Declines',
  net: 'Net',
  line: 'A/D line',
  direction: 'Direction',
  advancesLed: 'Advances led',
  declinesLed: 'Declines led',
  even: 'Even',
  above: 'Above',
  of: 'Of',
  outOf: 'of',
  share: 'Share above',
  change: 'Change',
  up: 'Up',
  down: 'Down',
  unchanged: 'No change',
  first: 'First day',
  none: 'none',
  reference: '50%',
  shareName: (period) => `Above ${period}-day average`,
  hint: 'Use the left and right arrow keys to move between days, Home and End to jump to the first and last.',
  summaryAD: ({ days, from, to, first, last, net }) => `Advance-decline line over ${days} ${days === 1 ? 'day' : 'days'}, ${from} to ${to}: from ${first} to ${last}, a net of ${net}.`,
  summaryPct: ({ period, from, to, first, last }) => `Share of stocks above their ${period}-day average, ${from} to ${to}: from ${first} percent to ${last} percent.`,
};

interface Common {
  /** Names the chart and its data table ("NEPSE advance-decline line"). */
  label: string;
  /** The plot's height in CSS px, clamped to 140..480. Default 240. */
  height?: number;
  /** Pass false when a parent hides the chart and gives the same figures another way. */
  interactive?: boolean;
  /** Words in the reader's language. */
  labels?: Partial<BreadthChartLabels>;
  /** Becomes data-testid on the figure; the tooltip gets `${testId}-tip`. */
  testId?: string;
}

export interface AdvanceDeclineChartProps extends Common {
  mode: 'advance-decline';
  /** Daily counts, oldest first (the fields of `Breadth` of `MarketBreadth`, plus the date). */
  days: readonly BreadthDay[];
  /** The line's level before the first day. Default 0. */
  start?: number;
}

export interface PercentAboveMAChartProps extends Common {
  mode: 'percent-above-ma';
  /** Each constituent's closes (decimal strings), oldest first. */
  constituents: readonly BreadthConstituent[];
  /** The moving average's length in days, such as 50 or 200. */
  period: number;
  /** Decimals of the share. Default 1. */
  decimals?: number;
}

export type BreadthChartProps = AdvanceDeclineChartProps | PercentAboveMAChartProps;

interface Row {
  key: string;
  date: string;
  /** Plotted value, or null for a gap. */
  value: number | null;
  /** Table cells after the date. */
  cells: readonly string[];
  rows: readonly (readonly [string, string])[];
  word: string;
  glyph: string;
  speech: string;
}

interface Model {
  rows: Row[];
  heads: string[];
  summary: string;
  roleDescription: string;
  /** Axis ticks and text, and the fixed domain when there is one. */
  domain: { lo: number; hi: number; ticks: number[] } | null;
  tick: (v: number) => string;
  reference: number | null;
}

function modelOf(p: BreadthChartProps, L: BreadthChartLabels): Model {
  if (p.mode === 'advance-decline') {
    const pts = advanceDeclineLine(p.days, { start: p.start });
    const rows = pts.map((d): Row => {
      const word = d.net > 0 ? L.advancesLed : d.net < 0 ? L.declinesLed : L.even;
      const glyph = d.net > 0 ? '▲' : d.net < 0 ? '▼' : '●';
      return {
        key: d.date,
        date: d.date,
        value: d.line,
        cells: [grouped(d.advances), grouped(d.declines), signed(d.net), grouped(d.line), word],
        rows: [[L.advances, grouped(d.advances)], [L.declines, grouped(d.declines)], [L.net, `${glyph} ${signed(d.net)}`], [L.line, grouped(d.line)]],
        word,
        glyph,
        speech: `${L.advances} ${grouped(d.advances)}, ${L.declines} ${grouped(d.declines)}, ${L.net} ${signed(d.net)}, ${L.line} ${grouped(d.line)}, ${word}`,
      };
    });
    const first = pts[0];
    const last = pts[pts.length - 1];
    return {
      rows,
      heads: [L.advances, L.declines, L.net, L.line, L.direction],
      summary: first && last ? L.summaryAD({ days: pts.length, from: first.date, to: last.date, first: grouped(first.line - first.net), last: grouped(last.line), net: signed(last.line - (first.line - first.net)) }) : '',
      roleDescription: 'advance-decline line chart',
      domain: null,
      tick: (v) => grouped(Math.round(v)),
      reference: null,
    };
  }
  const decimals = p.decimals ?? 1;
  const pts = percentAboveMA(p.constituents, { period: p.period, decimals });
  const name = L.shareName(p.period);
  let prev: number | null = null;
  const rows = pts.map((d): Row => {
    const v = d.percent === null ? null : Number(d.percent);
    let word = L.first;
    let glyph = '●';
    let change = L.none;
    if (v === null) word = L.none;
    else if (prev !== null) {
      const diff = v - prev;
      word = diff > 0 ? L.up : diff < 0 ? L.down : L.unchanged;
      glyph = diff > 0 ? '▲' : diff < 0 ? '▼' : '●';
      change = `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff).toFixed(decimals)}`;
    }
    if (v !== null) prev = v;
    const share = d.percent === null ? L.none : `${d.percent}%`;
    return {
      key: d.date,
      date: d.date,
      value: v,
      cells: [String(d.above), String(d.eligible), share, change, word],
      rows: [[L.above, `${d.above} ${L.outOf} ${d.eligible}`], [name, share], [L.change, v === null ? L.none : `${glyph} ${change}`]],
      word,
      glyph,
      speech: `${d.above} ${L.outOf} ${d.eligible}, ${name} ${share}, ${word}`,
    };
  });
  const have = rows.filter((r) => r.value !== null);
  const first = pts.find((d) => d.percent !== null);
  const last = pts.findLast((d) => d.percent !== null);
  return {
    rows,
    heads: [L.above, L.of, L.share, L.change, L.direction],
    summary: have.length && first && last ? L.summaryPct({ period: p.period, from: first.date, to: last.date, first: first.percent!, last: last.percent! }) : '',
    roleDescription: 'percent above moving average chart',
    domain: { lo: 0, hi: 100, ticks: [0, 25, 50, 75, 100] },
    tick: (v) => `${v}%`,
    reference: 50,
  };
}

type Attempt = { model: Model; error?: undefined } | { model?: undefined; error: string };

/**
 * @stability beta
 */
export function BreadthChart(props: BreadthChartProps) {
  const { label, height = 240, interactive = true, labels, testId } = props;
  const L = { ...EN, ...labels };
  const input = props.mode === 'advance-decline' ? props.days : props.constituents;
  const extra = props.mode === 'advance-decline' ? props.start : `${props.period}/${props.decimals}`;
  const result = useMemo<Attempt>(() => {
    try {
      return { model: modelOf(props, { ...EN, ...labels }) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode, input, extra, labels]);
  if (result.error !== undefined || !result.model.rows.some((r) => r.value !== null)) {
    return (
      <figure className="kit-ct pu-po pu-br" aria-label={label} data-testid={testId} data-mode={props.mode}>
        <p className="kit-ct-empty" role="status">{result.error !== undefined ? L.error(result.error) : L.empty}</p>
      </figure>
    );
  }
  const m = result.model;
  const n = m.rows.length;
  return (
    <ChartA11yShell
      className="kit-ct pu-po pu-br"
      label={label}
      roleDescription={m.roleDescription}
      count={n}
      testId={testId}
      interactive={interactive}
      dataAttrs={{ 'data-mode': props.mode }}
      hint={L.hint}
      summary={m.summary}
      speak={(i) => `${m.rows[i]!.date}: ${m.rows[i]!.speech}`}
      table={<ChartDataTable caption={label} head={[L.date, ...m.heads]} rows={m.rows.map((r) => ({ key: r.key, head: r.date, cells: r.cells }))} />}
    >
      {(ctx) => <LinePlot m={m} height={height} L={L} testId={testId} active={ctx.index} plotProps={ctx.plotProps} pointerTo={ctx.pointerTo} />}
    </ChartA11yShell>
  );
}

const TOP = 12;
const AXIS_H = 22;

function LinePlot({ m, height, L, testId, active, plotProps, pointerTo }: {
  m: Model;
  height: number;
  L: BreadthChartLabels;
  testId?: string;
  active: number | null;
  plotProps: (onPointer?: (event: PointerEvent<HTMLDivElement>) => void) => HTMLAttributes<HTMLDivElement>;
  pointerTo: (index: number | null) => void;
}) {
  const uid = useId();
  const { ref, width } = useMeasuredWidth(640);
  const n = m.rows.length;
  const plotH = clamp(isNum(height) ? height : 240, 140, 480);
  const svgH = TOP + plotH + AXIS_H;
  const bottom = TOP + plotH;
  const vals = m.rows.map((r) => r.value).filter((v): v is number => v !== null);
  const ext = m.domain ?? niceTicks(Math.min(...vals), Math.max(...vals), Math.max(3, Math.round(plotH / 56)));
  const span = ext.hi - ext.lo || 1;
  const y = (v: number) => bottom - ((v - ext.lo) / span) * plotH;
  const texts = ext.ticks.map(m.tick);
  const axisW = Math.min(100, Math.max(...texts.map((t) => t.length)) * 7 + 14);
  const x0 = 10;
  const x1 = Math.max(x0 + 40, width - axisW);
  const step = n > 1 ? (x1 - x0 - 8) / (n - 1) : 0;
  const cx = (i: number) => (n > 1 ? x0 + 4 + i * step : (x0 + x1) / 2);
  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = n > 1 ? Math.round((e.clientX - r.left - x0 - 4) / step) : 0;
    pointerTo(i >= 0 && i < n ? i : null);
  };
  let d = '';
  m.rows.forEach((r, i) => {
    if (r.value === null) return;
    d += `${i > 0 && m.rows[i - 1]!.value !== null ? 'L' : 'M'}${cx(i).toFixed(1)},${y(r.value).toFixed(1)}`;
  });
  const labelled = thinned(n, Math.max(step, 1), 72);
  const row = active !== null ? m.rows[active] : undefined;
  return (
    <div ref={ref} className="kit-ct-area" style={{ height: svgH }}>
      {/* The plot is the one focus stop: arrow keys move through the days, the pointer reads one. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
      <div className="kit-ct-plot" {...plotProps(onPointer)}>
        <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false" data-uid={uid}>
          {ext.ticks.map((t, k) => (
            <g key={t}>
              <line className="kit-ct-grid" x1={x0} x2={x1} y1={y(t)} y2={y(t)} />
              <text className="kit-ct-axis" x={x1 + 8} y={y(t)} dominantBaseline="middle">{texts[k]}</text>
            </g>
          ))}
          {m.reference !== null && (
            <g className="pu-br-ref">
              <line x1={x0} x2={x1} y1={y(m.reference)} y2={y(m.reference)} />
              <text x={x0 + 4} y={y(m.reference) - 5}>{L.reference}</text>
            </g>
          )}
          {m.reference === null && ext.lo < 0 && ext.hi > 0 && <line className="kit-ct-grid base" x1={x0} x2={x1} y1={y(0)} y2={y(0)} />}
          {active !== null && <line className="pu-br-cursor" x1={cx(active)} x2={cx(active)} y1={TOP} y2={bottom} />}
          <path className="pu-br-line" d={d} />
          {n <= 80 && m.rows.map((r, i) => (r.value === null ? null : <circle key={r.key} className="pu-br-dot" cx={cx(i)} cy={y(r.value)} r={2.5} />))}
          {row && row.value !== null && <circle className="pu-br-dot active" cx={cx(active!)} cy={y(row.value)} r={5} />}
          {labelled.map((i) => (
            <text key={i} className="kit-ct-axis" x={clamp(cx(i), x0 + 24, x1 - 24)} y={svgH - 6} textAnchor="middle">{shortDate(m.rows[i]!.date)}</text>
          ))}
        </svg>
        {row && active !== null && (
          <ChartTooltip x={cx(active)} width={width} testId={testId ? `${testId}-tip` : undefined}>
            <b>{row.date}</b>
            <dl>
              {row.rows.map(([name, value]) => (
                <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
              ))}
              <div><dt>{L.direction}</dt><dd>{row.glyph} {row.word}</dd></div>
            </dl>
          </ChartTooltip>
        )}
      </div>
    </div>
  );
}
