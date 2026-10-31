'use client';

/**
 * ColumnChart (design.punji.app/components/column-chart): one column per
 * period, its parts stacked from the baseline (the first series nearest it),
 * the column's total printed over it and its label under it. Real values on a
 * round, labelled scale that includes zero; never smoothed, never 3D.
 *
 * Edge cases are decided, not accidents:
 *   empty        no columns (or no series) prints `labels.empty`, no axes.
 *   single value one column among `minSlots` slots, centred, at normal width.
 *   all zero     the baseline and a printed zero over each column; no scale.
 *   negative     a negative part stacks below the baseline on its own scale
 *                (a reversal is shown, not hidden); the printed total is the
 *                net. Positives stack up, negatives down, the first series
 *                nearest the baseline.
 *   constant     equal columns on a round scale; they fill most of the plot.
 *   outlier      the scale is honest: one huge column makes the others
 *                short, but every non-zero part keeps at least 2px and every
 *                figure is printed and in the data table.
 *   bad values   missing, null, NaN and +-Infinity are "no value": drawn as
 *                nothing, and written `labels.none` in the table (never 0).
 *
 * Sizing is bounded: the plot is as wide as its container, `height` is
 * clamped to 96..480px, a column is at most 92px wide, a long record
 * shortens its labels, thins them (the latest always shows) and drops the
 * printed totals before anything overlaps.
 *
 * Accessible alternative: the chart is drawn `aria-hidden`; a visually hidden
 * table (period, each series, total) follows it, so a screen reader reads
 * every figure by row. Series are told apart by the legend and the table, not
 * by colour alone.
 */
import type { ReactNode } from 'react';

import { clamp, isNum, useMeasuredWidth } from '../internal/chartFrame.tsx';

export type ColumnTone = 'chart' | 'series2' | 'series3' | 'series4' | 'neutral' | 'gain' | 'loss';

export interface ColumnSeries {
  /** Stable key for the series (the React key). */
  key: string;
  /** The series' name in the legend and the data table. */
  label: string;
  /** The colour of its parts (see ColumnTone). */
  tone: ColumnTone;
}

export interface ColumnDatum {
  /** Stable key for the column (the React key). */
  key: string;
  /** Under the column ("2081/82"). */
  label: string;
  /** A shorter label for a narrow column ("81/82"); the label when omitted. */
  short?: string;
  /** One value per series, in the series' order (nearest the baseline first). Missing, null and non-finite count as no value. */
  values: readonly (number | null | undefined)[];
}

export interface ColumnChartLabels {
  /** Printed when there is nothing to draw. Default "No data". */
  empty?: ReactNode;
  /** The data table's first column head. Default "Period". */
  period?: string;
  /** The data table's total column head. Default "Total". */
  total?: string;
  /** A value a column did not have, in the data table. Default "none". */
  none?: string;
}

export interface ColumnChartProps {
  /** The series to stack; the first one sits nearest the baseline. */
  series: readonly ColumnSeries[];
  /** Oldest first, left to right. */
  columns: readonly ColumnDatum[];
  /** Names the chart and its data table for screen readers. */
  label: string;
  /** How a value and a total are printed ("Rs 1,24,500"). Gets a negative number for a net loss. */
  format?: (v: number) => string;
  /** How the scale's ticks are printed; default `format`. Pass a compact one ("1.2L") on narrow charts. */
  formatAxis?: (v: number) => string;
  /** The plot's height in CSS px, clamped to 96..480 (the labels sit under it). */
  height?: number;
  /** Slots the plot always has room for, so two years are two columns, not two slabs. Default 6. */
  minSlots?: number;
  /** Print the legend under the chart (off when a card header carries a ColumnLegend). */
  legend?: boolean;
  /** Print the labelled scale on the left. Default true. */
  axis?: boolean;
  /** Overrides for the printed words: the empty message, the data table's heads and the missing-value text. */
  labels?: ColumnChartLabels;
  /** Test id on the figure; each column gets `${testId}-${key}`. */
  testId?: string;
}

/** Columns narrower than this (CSS px) print the short label. */
const SHORT_BELOW = 60;
/** Columns narrower than this print no total over them, nor narrower than their widest total. */
const TOTALS_BELOW = 46;
/** Room one label needs, long and short. */
const LABEL_PX = 72;
const SHORT_LABEL_PX = 48;
/** Printed width of one character of a total (12px, tabular), plus a gap between neighbours. */
const TOTAL_CHAR_PX = 7;

const pct = (v: number, of: number) => (of > 0 && Number.isFinite(v) ? clamp((v / of) * 100, 0, 100) : 0);

/** A round scale top at or above `v`: 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 times a power of ten, so the tallest column fills most of the plot. */
export function columnScaleTop(v: number): number {
  if (!(v > 0) || !Number.isFinite(v)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v - 1e-9) return m * p;
  return 10 * p;
}

/** The labels that print under `n` columns that each get `perCol` px: every k-th counted back from the last, so the latest period always shows. */
export function labelledColumns(n: number, perCol: number, need: number): Set<number> {
  const step = perCol > 0 && Number.isFinite(perCol) ? Math.max(1, Math.ceil(need / perCol)) : 1;
  const out = new Set<number>();
  for (let i = n - 1; i >= 0; i -= step) out.add(i);
  return out;
}

const value = (c: ColumnDatum, i: number): number | undefined => (isNum(c.values[i]) ? c.values[i] : undefined);

export function ColumnLegend({ series, testId }: { series: readonly ColumnSeries[]; testId?: string }) {
  return (
    <ul className="kit-col-legend" aria-hidden="true" data-testid={testId}>
      {series.map((s) => (
        <li key={s.key}>
          <i className={`kit-col-t-${s.tone}`} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

export function ColumnChart(props: ColumnChartProps) {
  if (props.columns.length === 0 || props.series.length === 0) {
    return (
      <figure className="kit-col empty" aria-label={props.label} data-testid={props.testId}>
        <p className="kit-col-empty">{props.labels?.empty ?? 'No data'}</p>
      </figure>
    );
  }
  return <ColumnPlot {...props} />;
}

function ColumnPlot({ series, columns, label, format = String, formatAxis, height = 200, minSlots = 6, legend = false, axis = true, labels, testId }: ColumnChartProps) {
  // 0 until the first measurement: the columns then lay out at their natural size, with every label shown.
  const { ref: area, width } = useMeasuredWidth(0);

  const none = labels?.none ?? 'none';
  const n = columns.length;
  const plotH = clamp(isNum(height) ? height : 200, 96, 480);
  const slots = Math.max(n, Math.max(1, Math.floor(minSlots) || 1));
  const lead = Math.floor((slots - n) / 2);
  const sums = columns.map((c) => {
    let up = 0;
    let down = 0;
    series.forEach((_, i) => {
      const v = value(c, i);
      if (v === undefined) return;
      if (v > 0) up += v;
      else if (v < 0) down -= v;
    });
    return { up, down, net: up - down };
  });
  const maxUp = Math.max(...sums.map((s) => s.up));
  const maxDown = Math.max(...sums.map((s) => s.down));
  const topScale = maxUp > 0 ? columnScaleTop(maxUp) : 0;
  const bottomScale = maxDown > 0 ? columnScaleTop(maxDown) : 0;
  const hasScale = topScale + bottomScale > 0;
  const span = hasScale ? topScale + bottomScale : 1;
  const base = pct(bottomScale, span); // the baseline's height above the plot's foot, in %
  const perCol = width > 0 ? width / slots : Infinity;
  const short = perCol < SHORT_BELOW;
  const widestTotal = Math.max(...sums.map((s) => format(s.net).length));
  const showTotals = perCol >= Math.max(TOTALS_BELOW, widestTotal * TOTAL_CHAR_PX + 6);
  const shown = labelledColumns(n, perCol, short ? SHORT_LABEL_PX : LABEL_PX);
  const fmtAxis = formatAxis ?? format;
  const grid = { gridTemplateColumns: `repeat(${slots}, minmax(0, 1fr))` };
  const at = (ci: number) => (ci === 0 && lead > 0 ? { gridColumnStart: lead + 1 } : undefined);
  const ticks: { v: number; at: number }[] = [{ v: 0, at: base }];
  if (topScale > 0) ticks.push({ v: topScale, at: 100 }, { v: topScale / 2, at: base + pct(topScale / 2, span) });
  if (bottomScale > 0) ticks.push({ v: -bottomScale, at: 0 }, { v: -bottomScale / 2, at: pct(bottomScale / 2, span) });
  const tickText = ticks.map((t) => (t.v === 0 ? '0' : fmtAxis(t.v)));
  const spoken = (c: ColumnDatum) => `${c.label}: ${series.map((s, i) => `${s.label} ${value(c, i) === undefined ? none : format(value(c, i)!)}`).join(', ')}`;
  return (
    <figure className="kit-col" aria-label={label} data-testid={testId}>
      <div className="kit-col-frame" style={{ gridTemplateRows: `${plotH + 22}px auto`, gridTemplateColumns: axis ? 'auto minmax(0, 1fr)' : 'minmax(0, 1fr)' }} aria-hidden="true">
        {axis && (
          <div className="kit-col-y">
            <div className="kit-col-y-in">
              <span className="kit-col-y-w">{tickText.reduce((a, b) => (b.length > a.length ? b : a), '')}</span>
              {ticks.map((t) => (
                <span key={t.v} style={{ bottom: `${t.at}%` }}>{tickText[ticks.indexOf(t)]}</span>
              ))}
            </div>
          </div>
        )}
        <div className="kit-col-plot">
          <div ref={area} className="kit-col-area">
            {hasScale && ticks.filter((t) => t.v !== 0).map((t) => <span key={t.v} className="kit-col-grid" style={{ bottom: `${t.at}%` }} />)}
            <span className="kit-col-zero" style={{ bottom: `${base}%` }} />
            <div className="kit-col-cols" style={grid}>
              {columns.map((c, ci) => {
                const s = sums[ci]!;
                return (
                  <div key={c.key} className="kit-col-c" style={at(ci)} title={spoken(c)} data-testid={testId ? `${testId}-${c.key}` : undefined}>
                    <span className="kit-col-up" style={{ bottom: `${base}%`, height: `${pct(s.up, span)}%` }}>
                      {showTotals && <b className="kit-col-v">{format(s.net)}</b>}
                      {series.map((sr, i) => {
                        const v = value(c, i);
                        return v !== undefined && v > 0 ? <i key={sr.key} className={`kit-col-t-${sr.tone}`} style={{ flexGrow: v }} /> : null;
                      })}
                    </span>
                    {s.down > 0 && (
                      <span className="kit-col-dn" style={{ top: `${100 - base}%`, height: `${pct(s.down, span)}%` }}>
                        {series.map((sr, i) => {
                          const v = value(c, i);
                          return v !== undefined && v < 0 ? <i key={sr.key} className={`kit-col-t-${sr.tone}`} style={{ flexGrow: -v }} /> : null;
                        })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="kit-col-x" style={grid}>
            {columns.map((c, ci) => (
              <span key={c.key} style={at(ci)} className={perCol < (short ? SHORT_LABEL_PX : LABEL_PX) && lead === 0 ? (ci === 0 ? 'first' : ci === n - 1 ? 'last' : undefined) : undefined}>
                {shown.has(ci) ? (short ? (c.short ?? c.label) : c.label) : ''}
              </span>
            ))}
        </div>
      </div>
      {legend && (
        <figcaption>
          <ColumnLegend series={series} />
        </figcaption>
      )}
      <div className="kit-sr">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">{labels?.period ?? 'Period'}</th>
              {series.map((s) => (
                <th key={s.key} scope="col">{s.label}</th>
              ))}
              {series.length > 1 && <th scope="col">{labels?.total ?? 'Total'}</th>}
            </tr>
          </thead>
          <tbody>
            {columns.map((c, ci) => (
              <tr key={c.key}>
                <th scope="row">{c.label}</th>
                {series.map((s, i) => (
                  <td key={s.key}>{value(c, i) === undefined ? none : format(value(c, i)!)}</td>
                ))}
                {series.length > 1 && <td>{format(sums[ci]!.net)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
