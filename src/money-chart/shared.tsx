'use client';

/**
 * What the money charts (WaterfallChart, CashFlowChart, NetWorthChart) share: exact bigint arithmetic and
 * formatting through the money module, the signed "+"/"-" text, the value scale and the plot shell. Not exported
 * as its own subpath; each chart imports it.
 */
import { useId, useMemo, type CSSProperties, type PointerEvent, type ReactNode } from 'react';

import { niceTicks } from '../chart-math/chartMath.ts';
import { ChartA11yShell, type ChartA11yShellProps } from '../chart-a11y/ChartA11yShell.tsx';
import { ChartTooltip, clamp, isNum, thinned, useMeasuredWidth } from '../internal/chartFrame.tsx';
import { getMoneyFormatter, type Money } from '../money/money.ts';

export const AXIS_H = 22;
const TOP = 12;

/** All amounts must share one currency; returns it. Throws a TypeError otherwise, like the money module's own arithmetic. */
export function sharedCurrency(amounts: readonly Money[], fallback = 'NPR'): string {
  const first = amounts[0]?.currency ?? fallback;
  for (const m of amounts) if (m.currency.toUpperCase() !== first.toUpperCase()) throw new TypeError(`Cannot chart ${first} and ${m.currency} together: convert first`);
  return first.toUpperCase();
}

export const big = (m: Money | bigint | undefined | null): bigint => (typeof m === 'bigint' ? m : m && typeof m.minor === 'bigint' ? m.minor : 0n);
export const abs = (v: bigint): bigint => (v < 0n ? -v : v);
/** A bigint as a plot coordinate. Display only: the figures are always printed from the bigint. */
export const num = (v: bigint): number => Number(v);

export interface MoneyText {
  /** "NPR 12,345.00". */
  plain: (minor: bigint) => string;
  /** "+NPR 12,345.00", "-NPR 12,345.00" (a true minus sign) or "NPR 0.00". */
  signed: (minor: bigint) => string;
  /** Shortened and signed, for a label on a bar. */
  signedCompact: (minor: bigint) => string;
  /** For the axis: shortened (lakh and crore for en-IN). Display-rounded only. */
  compact: (minor: bigint) => string;
  /** For the live region: currency names spelled out. */
  spoken: (minor: bigint) => string;
}

export function useMoneyText(currency: string, locale = 'en-IN'): MoneyText {
  return useMemo(() => {
    const f = getMoneyFormatter({ currency, locale, display: 'code' });
    const plain = (m: bigint) => f.format(m);
    return {
      plain,
      signed: (m) => (m > 0n ? `+${plain(m)}` : m < 0n ? `−${plain(-m)}` : plain(0n)),
      compact: (m) => f.formatCompact(m),
      signedCompact: (m) => (m > 0n ? `+${f.formatCompact(m)}` : m < 0n ? `\u2212${f.formatCompact(-m)}` : f.formatCompact(0n)),
      spoken: (m) => f.formatSpoken(m),
    };
  }, [currency, locale]);
}

export interface Direction {
  /** The word that goes with a sign, so colour is never the only cue. */
  word: string;
  /** "▲", "▼" or "●". */
  glyph: string;
  tone: 'gain' | 'loss' | 'flat';
}
export const directionOf = (v: bigint, words: { up: string; down: string; even: string }): Direction =>
  v > 0n ? { word: words.up, glyph: '▲', tone: 'gain' } : v < 0n ? { word: words.down, glyph: '▼', tone: 'loss' } : { word: words.even, glyph: '●', tone: 'flat' };

export interface Extent { lo: number; hi: number }

/** A round value scale that includes zero. */
export function valueScale(extent: Extent, plotH: number) {
  const lo = Math.min(0, extent.lo);
  const hi = Math.max(0, extent.hi);
  const t = niceTicks(lo, hi === lo ? lo + 1 : hi, Math.max(3, Math.round(plotH / 56)));
  const span = t.hi - t.lo || 1;
  return { ticks: t.ticks, lo: t.lo, hi: t.hi, y: (v: number) => TOP + plotH - ((v - t.lo) / span) * plotH };
}

export interface BandPlotProps {
  n: number;
  height: number;
  extent: Extent;
  /** Axis tick text for a tick value (a number in minor units). */
  tickText: (v: number) => string;
  labelAt: (i: number) => string;
  /** Pixels one x label needs; labels thin to fit. Default 64. */
  labelPx?: number;
  /** The drawing inside the svg. */
  renderPlot: (g: { x0: number; x1: number; bw: number; y: (v: number) => number; cx: (i: number) => number; zero: number; index: number | null; uid: string; width: number }) => ReactNode;
  /** The tooltip's content for the active position. */
  renderTip: (i: number) => ReactNode;
  testId?: string;
  ctx: Parameters<ChartA11yShellProps['children']>[0];
}

/** One band per position: the axis, grid, x labels, the focus stop, the cursor highlight and the tooltip. */
export function BandPlot({ n, height, extent, tickText, labelAt, labelPx = 64, renderPlot, renderTip, testId, ctx }: BandPlotProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { ref, width } = useMeasuredWidth(640);
  const plotH = clamp(isNum(height) ? height : 240, 120, 520);
  const svgH = TOP + plotH + AXIS_H;
  const sc = valueScale(extent, plotH);
  const texts = sc.ticks.map(tickText);
  const axisW = Math.min(110, Math.max(...texts.map((t) => t.length)) * 7 + 14);
  const x0 = 6;
  const x1 = Math.max(x0 + 40, width - axisW);
  const bw = (x1 - x0) / Math.max(1, n);
  const cx = (i: number) => x0 + (i + 0.5) * bw;
  const zero = sc.y(0);
  const labelled = thinned(n, bw, labelPx);
  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left - x0) / bw);
    ctx.pointerTo(i >= 0 && i < n ? i : null);
  };
  const style: CSSProperties = { height: svgH };
  const idx = ctx.index;
  return (
    <div ref={ref} className="kit-ct-area" style={style}>
      {/* The plot is the one focus stop: arrow keys move through the positions, the pointer reads one. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
      <div className="kit-ct-plot" {...ctx.plotProps(onPointer)}>
        <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false">
          {sc.ticks.map((t, k) => (
            <g key={t}>
              <line className={`kit-ct-grid${t === 0 ? ' base' : ''}`} x1={x0} x2={x1} y1={sc.y(t)} y2={sc.y(t)} />
              <text className="kit-ct-axis" x={x1 + 8} y={sc.y(t)} dominantBaseline="middle">{texts[k]}</text>
            </g>
          ))}
          {idx !== null && <rect className="pu-mc-lit" x={x0 + idx * bw} y={TOP} width={bw} height={plotH} />}
          {renderPlot({ x0, x1, bw, y: sc.y, cx, zero, index: idx, uid, width })}
          {labelled.map((i) => (
            <text key={i} className="kit-ct-axis" x={clamp(cx(i), x0 + 24, x1 - 24)} y={svgH - 6} textAnchor="middle">{labelAt(i)}</text>
          ))}
        </svg>
        {idx !== null && (
          <ChartTooltip x={cx(idx)} width={width} testId={testId ? `${testId}-tip` : undefined}>
            {renderTip(idx)}
          </ChartTooltip>
        )}
      </div>
    </div>
  );
}

export interface LegendItem { key: string; label: string; swatch: 'gain' | 'loss' | 'total' | 'assets' | 'liabilities' | 'net'; glyph?: string }

/** The legend: a swatch (each with its own shape or pattern) and the words. */
export function MoneyLegend({ items }: { items: readonly LegendItem[] }) {
  return (
    <ul className="kit-ct-legend pu-mc-legend" aria-hidden="true">
      {items.map((it) => (
        <li key={it.key}>
          <i className={`pu-mc-sw ${it.swatch}`} />
          {it.glyph ? `${it.glyph} ` : ''}{it.label}
        </li>
      ))}
    </ul>
  );
}

export function EmptyFigure({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return (
    <figure className="kit-ct" aria-label={label} data-testid={testId}>
      <p className="kit-ct-empty">{children}</p>
    </figure>
  );
}

export { ChartA11yShell };
