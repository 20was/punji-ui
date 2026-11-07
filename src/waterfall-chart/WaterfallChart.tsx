'use client';

/**
 * WaterfallChart (design.punji.app/components/waterfall-chart): a bridge from a start to an end. Each step floats from
 * the running total to the new one; a step marked `total` is a bar from zero to the running total (an opening or closing
 * figure, a subtotal). Amounts are exact `Money` (bigint minor units) in one currency; the running totals are summed
 * as bigint and printed from the bigint. The bars are drawn with plain numbers, nothing else is.
 *
 * Gain and loss are never colour alone: an increase is a solid bar with "+" and an up triangle, a decrease is a hatched
 * bar with a true minus and a down triangle, and a total has its own word. All three are in the legend, the tooltip,
 * the live region and the hidden data table.
 *
 * Accessible alternative: the drawing is `aria-hidden`, wrapped in ChartA11yShell (one focus stop, arrows/Home/End/Escape,
 * a polite live region, a spoken summary and a hidden table with step, change and running total).
 */
import type { ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable } from '../chart-a11y/ChartA11yShell.tsx';
import type { Money } from '../money/money.ts';
import { abs, BandPlot, big, directionOf, EmptyFigure, MoneyLegend, num, sharedCurrency, useMoneyText } from '../money-chart/shared.tsx';

export interface WaterfallStep {
  /** Stable key for the step. */
  key: string;
  /** Under the bar ("Revenue", "Tax"). */
  label: string;
  /** The change this step makes (negative to decrease). For a `total` step: a non-zero amount starts (or resets) the running total at that figure (an opening balance); zero shows the running total so far (a subtotal or closing figure). */
  amount: Money;
  /** A bar from zero to the running total: the opening balance, a subtotal, the closing figure. */
  total?: boolean;
}

export interface WaterfallChartLabels {
  empty?: ReactNode;
  /** Table head for the step column. Default "Step". */
  step?: string;
  /** Table head for the change column. Default "Change". */
  change?: string;
  /** Table head for the running total. Default "Running total". */
  running?: string;
  /** Table head for the direction word. Default "Direction". */
  direction?: string;
  increase?: string;
  decrease?: string;
  unchanged?: string;
  total?: string;
  hint?: string;
  /** The spoken summary of the whole chart. */
  summary?: (info: { count: number; end: string; net: string }) => string;
}

export interface WaterfallChartProps {
  /** The bridge, in order. */
  steps: readonly WaterfallStep[];
  /** Names the chart and its data table. */
  label: string;
  /** BCP 47 tag for the money format. Default "en-IN". */
  locale?: string;
  /** The plot's height in CSS px, clamped to 120..520. Default 260. */
  height?: number;
  /** Print the legend. Default true. */
  legend?: boolean;
  /** Pass false when a parent hides the chart and gives the same figures as a table. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: WaterfallChartLabels;
  /** Becomes data-testid on the figure; each item gets `${testId}-${key}`. */
  testId?: string;
}

export interface WaterfallRow {
  step: WaterfallStep;
  delta: bigint;
  from: bigint;
  to: bigint;
  kind: 'increase' | 'decrease' | 'unchanged' | 'total';
}

/** The running totals of a bridge, exact. A `total` step is a bar from zero to the running total and carries the total on. */
export function waterfallRows(steps: readonly WaterfallStep[]): WaterfallRow[] {
  let running = 0n;
  return steps.map((step): WaterfallRow => {
    const delta = big(step.amount);
    if (step.total) {
      if (delta !== 0n) running = delta;
      return { step, delta: 0n, from: 0n, to: running, kind: 'total' };
    }
    const from = running;
    running += delta;
    return { step, delta, from, to: running, kind: delta > 0n ? 'increase' : delta < 0n ? 'decrease' : 'unchanged' };
  });
}

const barWidth = (bw: number) => Math.min(64, Math.max(3, bw * 0.62));

/**
 * @stability beta
 */
export function WaterfallChart(props: WaterfallChartProps) {
  if (props.steps.length === 0) return <EmptyFigure label={props.label} testId={props.testId}>{props.labels?.empty ?? 'No data'}</EmptyFigure>;
  return <Waterfall {...props} />;
}

function Waterfall({ steps, label, locale, height = 260, legend = true, interactive = true, labels, testId }: WaterfallChartProps) {
  const currency = sharedCurrency(steps.map((s) => s.amount));
  const text = useMoneyText(currency, locale);
  const rows = waterfallRows(steps);
  const n = rows.length;
  const words = { up: labels?.increase ?? 'Increase', down: labels?.decrease ?? 'Decrease', even: labels?.unchanged ?? 'No change' };
  const totalWord = labels?.total ?? 'Total';
  const wordOf = (r: WaterfallRow) => (r.kind === 'total' ? totalWord : directionOf(r.delta, words).word);
  const glyphOf = (r: WaterfallRow) => (r.kind === 'total' ? '■' : directionOf(r.delta, words).glyph);
  const changeText = (r: WaterfallRow) => (r.kind === 'total' ? text.plain(r.to) : text.signed(r.delta));
  const lo = Math.min(...rows.map((r) => num(r.from < r.to ? r.from : r.to)));
  const hi = Math.max(...rows.map((r) => num(r.from > r.to ? r.from : r.to)));
  const net = rows[n - 1]!.to - (rows[0]!.kind === 'total' ? rows[0]!.to : 0n);
  const summary = (labels?.summary ?? ((i) => `Waterfall of ${i.count} steps ending at ${i.end}. Net change ${i.net}.`))({ count: n, end: text.spoken(rows[n - 1]!.to), net: text.spoken(net) });
  return (
    <ChartA11yShell
      className="kit-ct pu-mc"
      label={label}
      roleDescription="waterfall chart"
      count={n}
      testId={testId}
      interactive={interactive}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between steps, Home and End to jump to the first and last.'}
      summary={summary}
      speak={(i) => {
        const r = rows[i]!;
        return r.kind === 'total' ? `${r.step.label}: ${totalWord} ${text.spoken(r.to)}` : `${r.step.label}: ${wordOf(r)} ${text.spoken(abs(r.delta))}, running total ${text.spoken(r.to)}`;
      }}
      footer={legend ? <MoneyLegend items={[{ key: 'u', label: words.up, swatch: 'gain', glyph: '▲' }, { key: 'd', label: words.down, swatch: 'loss', glyph: '▼' }, { key: 't', label: totalWord, swatch: 'total' }]} /> : undefined}
      table={
        <ChartDataTable
          caption={label}
          head={[labels?.step ?? 'Step', labels?.change ?? 'Change', labels?.running ?? 'Running total', labels?.direction ?? 'Direction']}
          rows={rows.map((r) => ({ key: r.step.key, head: r.step.label, cells: [changeText(r), text.plain(r.to), wordOf(r)] }))}
        />
      }
    >
      {(ctx) => (
        <BandPlot
          ctx={ctx}
          n={n}
          height={height}
          extent={{ lo, hi }}
          tickText={(v) => (v === 0 ? '0' : text.compact(BigInt(Math.round(v))))}
          labelAt={(i) => rows[i]!.step.label}
          testId={testId}
          labelPx={72}
          renderTip={(i) => {
            const r = rows[i]!;
            return (
              <>
                <b>{r.step.label}</b>
                <dl>
                  <div><dt>{wordOf(r)}</dt><dd>{glyphOf(r)} {changeText(r)}</dd></div>
                  {r.kind !== 'total' && <div><dt>{labels?.running ?? 'Running total'}</dt><dd>{text.plain(r.to)}</dd></div>}
                </dl>
              </>
            );
          }}
          renderPlot={({ cx, bw, y, uid }) => {
            const w = barWidth(bw);
            return (
              <>
                <defs>
                  <pattern id={`${uid}h`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" className="pu-mc-hatch" /></pattern>
                </defs>
                {rows.map((r, i) => {
                  const a = y(num(r.from));
                  const b = y(num(r.to));
                  const top = Math.min(a, b);
                  const h = Math.max(2, Math.abs(a - b));
                  const tag = `${glyphOf(r)} ${r.kind === 'total' ? text.compact(r.to) : text.signedCompact(r.delta)}`;
                  return (
                    <g key={r.step.key} data-testid={testId ? `${testId}-${r.step.key}` : undefined}>
                      <rect className={`pu-mc-bar ${r.kind}`} x={cx(i) - w / 2} y={top} width={w} height={h} rx={3} />
                      {r.kind === 'decrease' && <rect className="pu-mc-bar-hatch" x={cx(i) - w / 2} y={top} width={w} height={h} rx={3} fill={`url(#${uid}h)`} />}
                      {i < n - 1 && <line className="pu-mc-link" x1={cx(i) + w / 2} x2={cx(i + 1) - w / 2} y1={y(num(r.to))} y2={y(num(r.to))} />}
                      {bw >= tag.length * 6.6 + 4 && (
                        <text className={`pu-mc-val ${r.kind}`} x={cx(i)} y={r.kind === 'decrease' ? top + h + 12 : top - 5} textAnchor="middle">
                          {tag}
                        </text>
                      )}
                    </g>
                  );
                })}
              </>
            );
          }}
        />
      )}
    </ChartA11yShell>
  );
}
