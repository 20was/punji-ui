'use client';

/**
 * PriceOnlyChart: the one renderer behind Renko, Kagi, Point and Figure, Line Break and Range bars. These charts drop
 * time and draw only the price moves that matter, so each drawn element covers a stretch of source bars. The chart
 * takes the bars (prices as decimal strings) and a `type` descriptor that builds and draws the elements; everything
 * else is shared on `ChartA11yShell`: one focus stop, Left, Right, Home, End and Escape through the elements, a
 * readout, a polite live region, a spoken summary and a hidden table that lists every element with the source dates
 * it covers. Up and down are never colour alone: the type gives them different shapes (hollow against solid, X against O,
 * thin against thick), said in words in the readout, live region and table.
 *
 * One renderer rather than one chart per type: the five differ only in how elements are built and drawn, and the
 * cursor, axis, readout, table and words are identical. Each type is its own subpath module, so a page that draws only
 * Renko ships only the Renko builder and drawing.
 *
 * Edge cases: no bars or no element yet prints `labels.empty`; a bad price or option prints the builder's message instead
 * of a plot (never a thrown render); more elements than fit at `minSlot` px each show the latest and say so (the cursor can
 * still reach every element and the table lists all).
 */
import { useId, useMemo, type HTMLAttributes, type PointerEvent } from 'react';

import { ChartA11yShell, ChartDataTable } from '../chart-a11y/ChartA11yShell.tsx';
import { niceTicks } from '../chart-math/chartMath.ts';
import type { PriceBar } from '../chart-math/priceOnly.ts';
import { ChartTooltip, clamp, isNum, shortDate, thinned, useMeasuredWidth } from '../internal/chartFrame.tsx';
import { datesText, type PriceOnlyBuilt, type PriceOnlyType } from './types.ts';

export type { PriceOnlyBuilt, PriceOnlyElement, PriceOnlyGeometry, PriceOnlyKey, PriceOnlyType } from './types.ts';
export { datesText } from './types.ts';

export interface PriceOnlyChartLabels {
  /** Shown when there is nothing to draw. Default "Not enough price movement to draw a chart." */
  empty: string;
  /** Shown instead of the plot when the bars or options are bad. Receives the reason. Default "Cannot draw this chart: {reason}". */
  error: (reason: string) => string;
  /** Table head of the source dates column. Default "Source dates". */
  dates: string;
  /** Table head of the direction column. Default "Direction". */
  direction: string;
  /** Joins two dates ("2025-11-04 to 2025-11-07"). Default "to". */
  to: string;
  /** The keyboard hint. Default "Use the left and right arrow keys to move between elements, Home and End to jump to the first and last." */
  hint: string;
  /** Under the plot when not all elements fit. Default "Showing 30 of 120. Move along the chart with the arrow keys; the table lists all." */
  showing: (shown: number, total: number) => string;
  /** The live region for one element. Default "3 of 12, 2025-11-04 to 2025-11-07: Up brick, from 100.00 to 105.00". */
  speak: (position: number, total: number, dates: string, direction: string, speech: string) => string;
  /** The readout's date row name. Default "Dates". */
  readoutDates: string;
}

const EN: PriceOnlyChartLabels = {
  empty: 'Not enough price movement to draw a chart.',
  error: (reason) => `Cannot draw this chart: ${reason}`,
  dates: 'Source dates',
  direction: 'Direction',
  to: 'to',
  hint: 'Use the left and right arrow keys to move between elements, Home and End to jump to the first and last.',
  showing: (shown, total) => `Showing ${shown} of ${total}. Move along the chart with the arrow keys; the table lists all.`,
  speak: (position, total, dates, direction, speech) => `${position} of ${total}, ${dates}: ${direction}${speech ? `, ${speech}` : ''}`,
  readoutDates: 'Dates',
};

export interface PriceOnlyChartProps {
  /** Names the chart and its data table ("NABIL, 5 rupee Renko"). */
  label: string;
  /** The source bars, oldest first. Prices are decimal strings. */
  bars: readonly PriceBar[];
  /** What to build and draw: `renkoType(...)`, `kagiType(...)`, `pointFigureType(...)`, `lineBreakType(...)` or `rangeBarsType(...)`. */
  type: PriceOnlyType;
  /** The plot's height in CSS px, clamped to 160..520. Default 280. */
  height?: number;
  /** Pass false when a parent hides the chart and gives the same figures another way. */
  interactive?: boolean;
  /** Words in the reader's language. */
  labels?: Partial<PriceOnlyChartLabels>;
  /** Becomes data-testid on the figure; the tooltip gets `${testId}-tip`. */
  testId?: string;
}

const TOP = 12;
const AXIS_H = 22;
const MAX_SLOT = 30;

type Attempt = { built: PriceOnlyBuilt; error?: undefined } | { built?: undefined; error: string };

function attempt(type: PriceOnlyType, bars: readonly PriceBar[]): Attempt {
  try {
    return { built: type.build(bars) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * @stability beta
 */
export function PriceOnlyChart({ label, bars, type, height = 280, interactive = true, labels, testId }: PriceOnlyChartProps) {
  const L = { ...EN, ...labels };
  const result = useMemo(() => attempt(type, bars), [type, bars]);
  if (result.error !== undefined || result.built.elements.length === 0) {
    return (
      <figure className="kit-ct pu-po" aria-label={label} data-testid={testId} data-type={type.id}>
        <p className="kit-ct-empty" role="status">{result.error !== undefined ? L.error(result.error) : L.empty}</p>
      </figure>
    );
  }
  const built = result.built;
  const els = built.elements;
  const n = els.length;
  const dates = (i: number) => datesText(els[i]!.fromDate, els[i]!.toDate, L.to);
  return (
    <ChartA11yShell
      className="kit-ct pu-po"
      label={label}
      roleDescription={built.roleDescription}
      count={n}
      testId={testId}
      interactive={interactive}
      dataAttrs={{ 'data-type': type.id }}
      hint={L.hint}
      summary={`${built.summary} ${built.note}`}
      speak={(i) => L.speak(i + 1, n, dates(i), els[i]!.directionWord, els[i]!.speech)}
      footer={
        <>
          <ul className="kit-ct-legend pu-po-keys" aria-hidden="true">
            {built.keys.map((k) => (
              <li key={k.key}>
                <i className={`pu-po-sw ${k.className}`} />
                {k.label}
              </li>
            ))}
          </ul>
          <p className="pu-po-note">{built.note}</p>
        </>
      }
      table={
        <ChartDataTable
          caption={label}
          head={[L.dates, L.direction, ...built.heads]}
          rows={els.map((e, i) => ({ key: e.key, head: dates(i), cells: [e.directionWord, ...e.cells] }))}
        />
      }
    >
      {(ctx) => <Plot built={built} height={height} L={L} testId={testId} active={ctx.index} plotProps={ctx.plotProps} pointerTo={ctx.pointerTo} />}
    </ChartA11yShell>
  );
}

function Plot({ built, height, L, testId, active, plotProps, pointerTo }: {
  built: PriceOnlyBuilt;
  height: number;
  L: PriceOnlyChartLabels;
  testId?: string;
  active: number | null;
  plotProps: (onPointer?: (event: PointerEvent<HTMLDivElement>) => void) => HTMLAttributes<HTMLDivElement>;
  pointerTo: (index: number | null) => void;
}) {
  const uid = useId();
  const { ref, width } = useMeasuredWidth(640);
  const els = built.elements;
  const n = els.length;
  const plotH = clamp(isNum(height) ? height : 280, 160, 520);
  const svgH = TOP + plotH + AXIS_H;
  const bottom = TOP + plotH;
  // Window: the latest elements that fit, moved left when the cursor goes further back.
  const probeAxisW = 56;
  const fit = Math.max(1, Math.floor((width - 6 - probeAxisW) / built.minSlot));
  const visible = Math.min(n, fit);
  let offset = n - visible;
  if (active !== null && active < offset) offset = active;
  const shown = els.slice(offset, offset + visible);
  const ext = niceTicks(Math.min(...shown.map((e) => e.low)), Math.max(...shown.map((e) => e.high)), Math.max(3, Math.round(plotH / 56)));
  const step = ext.ticks.length > 1 ? Math.abs(ext.ticks[1]! - ext.ticks[0]!) : 1;
  const stepDecimals = Math.min(6, Math.max(0, -Math.floor(Math.log10(step) + 1e-9)));
  const dd = Math.max(built.decimals, stepDecimals);
  const texts = ext.ticks.map((t) => t.toFixed(dd));
  const axisW = Math.min(100, Math.max(...texts.map((t) => t.length)) * 7 + 14);
  const x0 = 6;
  const x1 = Math.max(x0 + 40, width - axisW);
  const slot = Math.min(MAX_SLOT, (x1 - x0) / visible);
  const span = ext.hi - ext.lo || 1;
  const y = (v: number) => bottom - ((v - ext.lo) / span) * plotH;
  const cx = (i: number) => x0 + (i - offset + 0.5) * slot;
  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const k = Math.floor((e.clientX - r.left - x0) / slot);
    pointerTo(k >= 0 && k < visible ? offset + k : null);
  };
  const labelled = thinned(visible, slot, 64);
  const el = active !== null ? els[active] : undefined;
  return (
    <>
      <div ref={ref} className="kit-ct-area" style={{ height: svgH }}>
        {/* The plot is the one focus stop: arrow keys move through the elements, the pointer reads one. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div className="kit-ct-plot" {...plotProps(onPointer)}>
          <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false" data-uid={uid}>
            {ext.ticks.map((t, k) => (
              <g key={t}>
                <line className="kit-ct-grid" x1={x0} x2={x1} y1={y(t)} y2={y(t)} />
                <text className="kit-ct-axis" x={x1 + 8} y={y(t)} dominantBaseline="middle">{texts[k]}</text>
              </g>
            ))}
            {active !== null && active >= offset && active < offset + visible && <rect className="pu-po-lit" x={x0 + (active - offset) * slot} y={TOP} width={slot} height={plotH} />}
            {built.draw({ x0, x1, slot, offset, visible, cx, y, top: TOP, bottom, active })}
            {labelled.map((k) => (
              <text key={k} className="kit-ct-axis" x={clamp(cx(offset + k), x0 + 24, x1 - 24)} y={svgH - 6} textAnchor="middle">{shortDate(els[offset + k]!.toDate)}</text>
            ))}
          </svg>
          {el && active !== null && active >= offset && (
            <ChartTooltip x={cx(active)} width={width} testId={testId ? `${testId}-tip` : undefined}>
              <b>{el.directionWord}</b>
              <dl>
                <div><dt>{L.readoutDates}</dt><dd>{datesText(el.fromDate, el.toDate, L.to)}</dd></div>
                {el.rows.map(([name, value]) => (
                  <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
                ))}
              </dl>
            </ChartTooltip>
          )}
        </div>
      </div>
      {visible < n && <p className="pu-po-note">{L.showing(visible, n)}</p>}
    </>
  );
}
