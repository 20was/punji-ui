'use client';

/**
 * YieldCurveChart (design.punji.app/components/yield-curve-chart): yield by maturity (1M to 30Y), with comparison curves
 * (today against a month and a year ago). Where the first curve falls as maturity grows, the stretch is shaded with a
 * hatched band and named in words ("Inverted between 2Y and 10Y"), and the spread between two maturities is printed
 * ("10Y minus 2Y: −25 bp, inverted"): the words and signs say what the shading says. Comparison curves differ by dash
 * and by marker as well as colour. The same renderer draws a futures term structure (`mode="term-structure"`): maturities
 * are contract months or tenors in the order given, the values carry no percent sign, and a falling stretch is
 * "backwardation" while a rising curve is "contango".
 *
 * The yields come from the app (a central bank, a data vendor). They are plain numbers in percent, rounded to
 * `decimals` for display; this component does not fetch or smooth them.
 *
 * Accessible alternative: ChartA11yShell (one focus stop, arrows/Home/End/Escape across the maturities, live region,
 * spoken summary with the inversion and the spreads, hidden table of maturity by curve).
 */
import { useId, type PointerEvent, type ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable, type ChartA11yContext } from '../chart-a11y/ChartA11yShell.tsx';
import { curveSlopes, niceTicks, parseMaturity } from '../chart-math/chartMath.ts';
import { ChartTooltip, clamp, isNum, useMeasuredWidth } from '../internal/chartFrame.tsx';

export type CurveMode = 'yield' | 'term-structure';

export interface CurvePoint {
  /** The tenor: "1M", "2Y", "30Y" (D, W, M and Y units), a number of years, or any name in `term-structure` mode ("Dec 26"). */
  maturity: string | number;
  /** The yield in percent (or the price, in term-structure mode). `null` or missing: no figure, never zero. */
  value: number | null | undefined;
}

export interface YieldCurve {
  /** Stable key (test ids, React keys). */
  key: string;
  /** The curve's name: "Today", "1 month ago", "1 year ago". */
  label: string;
  /** The curve's points, in any order: they are placed on the shared maturity axis. */
  points: readonly CurvePoint[];
}

export interface YieldCurveChartLabels {
  empty?: ReactNode;
  maturity?: string;
  /** The words for the three shapes. Yield defaults: Normal, Flat, Inverted. Term-structure defaults: Contango, Flat, Backwardation. */
  rising?: string;
  flat?: string;
  falling?: string;
  /** "Inverted between 2Y and 10Y". */
  between?: (info: { word: string; from: string; to: string }) => string;
  /** "10Y minus 2Y: −25 bp, inverted". */
  spread?: (info: { long: string; short: string; bp: string; word: string }) => string;
  /** No falling stretch. Default "Normal: the curve does not fall with maturity" (or Contango / Flat). */
  none?: (info: { word: string }) => string;
  hint?: string;
  summary?: (info: { curve: string; from: string; to: string; shape: string; spreads: string; count: number }) => string;
}

export interface YieldCurveChartProps {
  /** One to four curves. The first is the main one: it is drawn heavier, and the inversion and spreads are read from it. */
  curves: readonly YieldCurve[];
  /** `yield` (default): yields in percent with Normal / Flat / Inverted. `term-structure`: a futures or volatility curve with Contango / Backwardation. */
  mode?: CurveMode;
  /** `category` (default): maturities equally spaced. `time`: spaced by length, which needs every maturity to parse as D, W, M or Y. */
  scale?: 'category' | 'time';
  /** Maturity pairs to print the spread of, short then long, in yield mode. Default [['2Y', '10Y']]. Pairs missing from the main curve are left out. */
  spreads?: readonly (readonly [string, string])[];
  /** A spread within this many basis points of zero is "flat". Default 5. */
  flatWithinBp?: number;
  /** Decimal places printed. Default 2. */
  decimals?: number;
  /** Printed after each value. Default "%" in yield mode, nothing in term-structure mode. */
  unit?: string;
  /** Names the chart and its data table. */
  label: string;
  /** The plot's height in CSS px, clamped to 180..480. Default 280. */
  height?: number;
  /** Pass false when a parent hides the chart and gives the same figures another way. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: YieldCurveChartLabels;
  /** Layout only (margin, grid placement). */
  className?: string;
  /** Becomes data-testid on the figure; the inversion note is `${testId}-shape` and each spread `${testId}-spread-${n}`. */
  testId?: string;
}

const TOP = 22;
const AXIS_H = 22;

export interface CurveGrid {
  /** The maturities on the axis, as printed. */
  names: string[];
  /** Years per maturity, or null when any maturity does not parse. */
  years: (number | null)[];
  /** One row per curve: the value at each maturity, or null. */
  values: (number | null)[][];
}

const keyOf = (m: string | number): string => String(m).trim().toUpperCase();

/**
 * Puts every curve on one maturity axis. Maturities that all parse are sorted by length; otherwise they keep the order
 * they first appear in. A curve missing a maturity has no value there. Pure.
 */
export function curveGrid(curves: readonly YieldCurve[]): CurveGrid {
  const seen = new Map<string, { name: string; years: number | null }>();
  for (const c of curves) {
    for (const p of c.points) {
      const k = keyOf(p.maturity);
      if (!seen.has(k)) seen.set(k, { name: String(p.maturity).trim(), years: parseMaturity(p.maturity) });
    }
  }
  let entries = [...seen.entries()];
  if (entries.length > 0 && entries.every(([, v]) => v.years !== null)) entries = entries.toSorted((a, b) => a[1].years! - b[1].years!);
  const values = curves.map((c) => {
    const byKey = new Map(c.points.map((p) => [keyOf(p.maturity), isNum(p.value) ? p.value : null] as const));
    return entries.map(([k]) => byKey.get(k) ?? null);
  });
  return { names: entries.map(([, v]) => v.name), years: entries.map(([, v]) => v.years), values };
}

/** The spread between two maturities of one curve, in basis points rounded to one decimal; null when either is missing. */
export function spreadBp(grid: CurveGrid, curve: number, short: string, long: string): number | null {
  const s = grid.names.findIndex((n) => keyOf(n) === keyOf(short));
  const l = grid.names.findIndex((n) => keyOf(n) === keyOf(long));
  const a = s >= 0 ? grid.values[curve]?.[s] : null;
  const b = l >= 0 ? grid.values[curve]?.[l] : null;
  return isNum(a) && isNum(b) ? Math.round((b - a) * 1000) / 10 : null;
}

const bpText = (bp: number): string => `${bp > 0 ? '+' : bp < 0 ? '−' : ''}${Math.abs(bp)} bp`;
const MARKS = ['circle', 'square', 'triangle', 'diamond'] as const;

/**
 * @stability beta
 */
export function YieldCurveChart(props: YieldCurveChartProps) {
  const curves = props.curves.slice(0, 4);
  const grid = curveGrid(curves);
  if (curves.length === 0 || grid.names.length === 0 || !grid.values.some((r) => r.some(isNum))) {
    return (
      <figure className={`kit-ct pu-yc${props.className ? ` ${props.className}` : ''}`} aria-label={props.label} data-testid={props.testId}>
        <p className="kit-ct-empty">{props.labels?.empty ?? 'No data'}</p>
      </figure>
    );
  }
  return <Chart {...props} curves={curves} grid={grid} />;
}

function Mark({ shape, x, y, r, className }: { shape: (typeof MARKS)[number]; x: number; y: number; r: number; className: string }) {
  if (shape === 'circle') return <circle className={className} cx={x} cy={y} r={r} />;
  if (shape === 'square') return <rect className={className} x={x - r} y={y - r} width={2 * r} height={2 * r} />;
  if (shape === 'triangle') return <polygon className={className} points={`${x},${y - r - 1} ${x + r + 1},${y + r} ${x - r - 1},${y + r}`} />;
  return <polygon className={className} points={`${x},${y - r - 1} ${x + r + 1},${y} ${x},${y + r + 1} ${x - r - 1},${y}`} />;
}

function Chart({ curves, grid, mode = 'yield', scale = 'category', spreads, flatWithinBp = 5, decimals = 2, unit, label, height = 280, interactive = true, labels, className, testId }: YieldCurveChartProps & { curves: readonly YieldCurve[]; grid: CurveGrid }) {
  const hatch = useId();
  const term = mode === 'term-structure';
  const u = unit ?? (term ? '' : '%');
  const d = clamp(Math.floor(isNum(decimals) ? decimals : 2), 0, 6);
  const val = (v: number | null): string => (v === null ? '—' : `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}${u}`);
  const W = {
    rising: labels?.rising ?? (term ? 'Contango' : 'Normal'),
    flat: labels?.flat ?? 'Flat',
    falling: labels?.falling ?? (term ? 'Backwardation' : 'Inverted'),
    maturity: labels?.maturity ?? (term ? 'Contract' : 'Maturity'),
  };
  const primary = grid.values[0]!;
  const slopes = curveSlopes(primary);
  // Adjacent falling segments make one run: "between 2Y and 10Y".
  const runs: { from: number; to: number }[] = [];
  for (const s of slopes) {
    const last = runs[runs.length - 1];
    if (last && last.to === s.from) last.to = s.to;
    else runs.push({ from: s.from, to: s.to });
  }
  const between = labels?.between ?? ((i: { word: string; from: string; to: string }) => `${i.word} between ${i.from} and ${i.to}`);
  const runText = runs.map((r) => between({ word: W.falling, from: grid.names[r.from]!, to: grid.names[r.to]! }));
  const reals = primary.filter(isNum);
  const rises = reals.length > 1 && reals[reals.length - 1]! > reals[0]!;
  const shapeText =
    runs.length > 0
      ? runText.join('; ')
      : (labels?.none ?? ((i: { word: string }) => (reals.length > 1 && reals.every((v) => v === reals[0]) ? `${W.flat}: no change with maturity` : `${i.word}: the curve does not fall with maturity`)))({ word: rises ? W.rising : W.flat });
  const pairs = term ? [] : (spreads ?? [['2Y', '10Y']]);
  const spreadLines = pairs
    .map((p) => ({ p, bp: spreadBp(grid, 0, p[0], p[1]) }))
    .filter((x): x is { p: readonly [string, string]; bp: number } => x.bp !== null)
    .map(({ p, bp }) => {
      const word = Math.abs(bp) <= flatWithinBp ? W.flat : bp < 0 ? W.falling : W.rising;
      return { bp, word, text: (labels?.spread ?? ((i: { long: string; short: string; bp: string; word: string }) => `${i.long} minus ${i.short}: ${i.bp}, ${i.word.toLowerCase()}`))({ long: p[1], short: p[0], bp: bpText(bp), word }) };
    });
  const m = grid.names.length;
  const main = curves[0]!;
  const summary = (
    labels?.summary ??
    ((i) => `${label}: ${i.count} maturities from ${i.from} to ${i.to}, ${i.curve} first. ${i.shape}.${i.spreads ? ` ${i.spreads}.` : ''}`)
  )({
    curve: main.label,
    from: grid.names[0]!,
    to: grid.names[m - 1]!,
    shape: shapeText,
    spreads: spreadLines.map((s) => s.text).join('; '),
    count: m,
  });
  const { ref, width } = useMeasuredWidth(640);
  const speakAt = (k: number) => `${grid.names[k]}: ${curves.map((c, ci) => `${c.label} ${val(grid.values[ci]![k]!)}`).join(', ')}`;
  const renderPlot = (ctx: ChartA11yContext) => {
    const plotH = clamp(isNum(height) ? height : 280, 180, 480);
    const svgH = TOP + plotH + AXIS_H;
    const nums = grid.values.flatMap((r) => r.filter(isNum));
    const lo = Math.min(...nums);
    const hi = Math.max(...nums);
    const ticks = niceTicks(lo, hi === lo ? lo + 1 : hi, Math.max(3, Math.round(plotH / 56)));
    const span = ticks.hi - ticks.lo || 1;
    const y = (v: number) => TOP + plotH - ((v - ticks.lo) / span) * plotH;
    const tickText = ticks.ticks.map((t) => `${t < 0 ? '−' : ''}${Math.abs(t)}${u}`);
    const axisW = Math.min(72, Math.max(...tickText.map((s) => s.length)) * 6.6 + 12);
    const x0 = axisW + 4;
    const x1 = width - 14;
    const byTime = scale === 'time' && grid.years.every((v) => v !== null);
    const maxY = byTime ? Math.max(...(grid.years as number[])) : 1;
    const x = (k: number) => (byTime ? x0 + ((grid.years[k] as number) / maxY) * (x1 - x0) : x0 + (m === 1 ? (x1 - x0) / 2 : (k / (m - 1)) * (x1 - x0)));
    // Labels are kept at least 44px apart; the last always shows, so an earlier one is dropped if it would touch it.
    const shown: number[] = [];
    for (let k = 0; k < m; k += 1) if (shown.length === 0 || x(k) - x(shown[shown.length - 1]!) >= 44) shown.push(k);
    if (shown[shown.length - 1] !== m - 1) {
      while (shown.length > 1 && x(m - 1) - x(shown[shown.length - 1]!) < 44) shown.pop();
      shown.push(m - 1);
    }
    const showTick = (k: number) => shown.includes(k);
    const idx = ctx.index;
    const onPointer = (e: PointerEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - r.left;
      if (px < x0 - 12 || px > x1 + 12) return ctx.pointerTo(null);
      let best = 0;
      for (let k = 1; k < m; k += 1) if (Math.abs(x(k) - px) < Math.abs(x(best) - px)) best = k;
      ctx.pointerTo(best);
    };
    const pathFor = (row: (number | null)[]) => {
      let dpath = '';
      let pen = false;
      row.forEach((v, k) => {
        if (v === null) {
          pen = false;
          return;
        }
        dpath += `${pen ? 'L' : 'M'}${x(k).toFixed(1)},${y(v).toFixed(1)}`;
        pen = true;
      });
      return dpath;
    };
    return (
      <div ref={ref} className="kit-ct-area" style={{ height: svgH }}>
        {/* The plot is the one focus stop: arrow keys move through the maturities. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div className="kit-ct-plot" {...ctx.plotProps(onPointer)}>
          <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false">
            <defs>
              <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" className="pu-yc-hatch-line" />
              </pattern>
            </defs>
            {ticks.ticks.map((t, k) => (
              <g key={t}>
                <line className="kit-ct-grid" x1={x0} x2={x1} y1={y(t)} y2={y(t)} />
                <text className="kit-ct-axis" x={x0 - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">{tickText[k]}</text>
              </g>
            ))}
            {runs.map((r) => (
              <g key={`${r.from}-${r.to}`} className="pu-yc-inv" data-testid={testId ? `${testId}-inverted-${r.from}-${r.to}` : undefined}>
                <rect className="pu-yc-inv-fill" x={x(r.from)} y={TOP} width={Math.max(2, x(r.to) - x(r.from))} height={plotH} fill={`url(#${hatch})`} />
                <text className="pu-yc-inv-word" x={(x(r.from) + x(r.to)) / 2} y={TOP - 7} textAnchor="middle">{W.falling}</text>
              </g>
            ))}
            {grid.names.map((n, k) =>
              showTick(k) ? (
                <text key={k} className="kit-ct-axis" x={x(k)} y={svgH - 6} textAnchor={k === 0 ? 'start' : k === m - 1 ? 'end' : 'middle'}>{n}</text>
              ) : null,
            )}
            {curves.map((c, ci) => (
              <g key={c.key} data-testid={testId ? `${testId}-curve-${c.key}` : undefined}>
                <path className={`pu-yc-line s${ci}`} d={pathFor(grid.values[ci]!)} fill="none" />
                {grid.values[ci]!.map((v, k) => (v === null ? null : <Mark key={k} shape={MARKS[ci % MARKS.length]!} x={x(k)} y={y(v)} r={ci === 0 ? 3.5 : 3} className={`pu-yc-pt s${ci}`} />))}
              </g>
            ))}
            {idx !== null && (
              <>
                <line className="pu-yc-cross" x1={x(idx)} x2={x(idx)} y1={TOP} y2={TOP + plotH} />
                {curves.map((c, ci) => (grid.values[ci]![idx] === null ? null : <circle key={c.key} className={`pu-yc-dot s${ci}`} cx={x(idx)} cy={y(grid.values[ci]![idx] as number)} r={5} />))}
              </>
            )}
          </svg>
          {idx !== null && (
            <ChartTooltip x={x(idx)} width={width} testId={testId ? `${testId}-tip` : undefined}>
              <b>{grid.names[idx]}</b>
              <dl>
                {curves.map((c, ci) => (
                  <div key={c.key}><dt>{c.label}</dt><dd>{val(grid.values[ci]![idx]!)}</dd></div>
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
      className={`kit-ct pu-yc${className ? ` ${className}` : ''}`}
      label={label}
      roleDescription="line chart"
      count={m}
      testId={testId}
      interactive={interactive}
      dataAttrs={{ 'data-shape': runs.length > 0 ? 'falling' : rises ? 'rising' : 'flat' }}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between maturities, Home and End to jump to the shortest and longest.'}
      summary={summary}
      speak={speakAt}
      footer={
        <>
          <ul className="kit-ct-legend pu-yc-legend" aria-hidden="true">
            {curves.map((c, ci) => (
              <li key={c.key}>
                <svg width="26" height="12" aria-hidden="true">
                  <line className={`pu-yc-sw s${ci}`} x1="1" x2="25" y1="6" y2="6" />
                  <Mark shape={MARKS[ci % MARKS.length]!} x={13} y={6} r={3} className={`pu-yc-pt s${ci}`} />
                </svg>
                {c.label}
              </li>
            ))}
            {runs.length > 0 && <li><svg width="14" height="12" aria-hidden="true"><rect x="0" y="1" width="14" height="10" className="pu-yc-inv-fill" fill={`url(#${hatch})`} /></svg>{W.falling}</li>}
          </ul>
          <p className={`pu-yc-shape ${runs.length > 0 ? 'falling' : 'normal'}`} data-testid={testId ? `${testId}-shape` : undefined}>
            <b>{runs.length > 0 ? '▼' : '▲'}</b> {shapeText}
          </p>
          {spreadLines.length > 0 && (
            <ul className="pu-yc-spreads">
              {spreadLines.map((s, n) => (
                <li key={n} className={s.bp < -flatWithinBp ? 'falling' : undefined} data-testid={testId ? `${testId}-spread-${n}` : undefined}>{s.text}</li>
              ))}
            </ul>
          )}
        </>
      }
      table={
        <ChartDataTable
          caption={label}
          head={[W.maturity, ...curves.map((c) => c.label)]}
          rows={grid.names.map((n, k) => ({ key: `${n}-${k}`, head: n, cells: curves.map((_, ci) => val(grid.values[ci]![k]!)) }))}
          note={<p>{[shapeText, ...spreadLines.map((s) => s.text)].join('. ')}</p>}
        />
      }
    >
      {renderPlot}
    </ChartA11yShell>
  );
}
