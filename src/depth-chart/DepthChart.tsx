'use client';

/**
 * DepthChart: the order book as two cumulative step areas. Left of the mid
 * price, the bids: at each price, the quantity waiting to buy at that price or
 * higher. Right of it, the asks: the quantity waiting to sell at that price or
 * lower. A steep wall is a lot of size at one price; the gap in the middle is
 * the spread. Drawn as SVG, display only.
 *
 * Takes the same `BookLevel`s as OrderBookDepth, in any order: levels are
 * sorted best first and equal prices merged. A level whose price is not a
 * positive number or whose quantity is negative or not a number is dropped.
 *
 * Edge cases are decided, not accidents:
 *   empty       no valid level on either side prints `labels.empty`.
 *   one side    the side present draws, the other is empty; no mid price.
 *   crossed     best bid at or above best ask is a data fault: both sides draw,
 *               no mid price is claimed and `labels.crossed` is shown.
 *   one level   a side with one level is one block.
 *
 * Interaction: the pointer shows a crosshair and the level under it; the plot
 * is a focus stop and Left and Right move one price level at a time, Home and
 * End to the lowest and highest price. The level is announced politely
 * ("Bid 546.50, quantity 920, cumulative 2,760"). A visually hidden table lists
 * every level with its running total.
 */
import { useId, useMemo, type CSSProperties, type PointerEvent, type ReactNode } from 'react';

import { cumulativeDepth, niceTicks } from '../chart-math/chartMath.ts';
import { ChartTooltip, clamp, isNum, nprPrice, quantity, useChartCursor, useMeasuredWidth } from '../internal/chartFrame.tsx';
import type { BookLevel } from '../order-book/OrderBookDepth.tsx';

export interface DepthChartLabels {
  /** Printed when there is nothing to draw. Default "No data". */
  empty?: ReactNode;
  /** Side names. Default "Bid" and "Ask". */
  bid?: string;
  ask?: string;
  /** Table heads. */
  side?: string;
  price?: string;
  quantity?: string;
  cumulative?: string;
  /** Name of the mid price marker. Default "Mid". */
  mid?: string;
  /** Name of the gap between best bid and best ask. Default "Spread". */
  spread?: string;
  /** Shown when the best bid is not below the best ask. */
  crossed?: string;
  /** The keyboard hint read with the chart's name. */
  hint?: string;
}

export interface DepthChartProps {
  /** Buy levels, any order. */
  bids: readonly BookLevel[];
  /** Sell levels, any order. */
  asks: readonly BookLevel[];
  /** Names the chart and its table. */
  label: string;
  /** Plot height in CSS px, clamped to 140..520. Default 240. */
  height?: number;
  /** Prints a price. Default NPR with two decimals. */
  formatPrice?: (price: number) => string;
  /** Prints a quantity. Default grouped whole shares. */
  formatQuantity?: (quantity: number) => string;
  /** Overrides for the printed words. */
  labels?: DepthChartLabels;
  /** Test id on the figure. */
  testId?: string;
}

const AXIS_H = 22;

interface Row {
  side: 'bid' | 'ask';
  price: number;
  quantity: number;
  cumulative: number;
}

export function DepthChart(props: DepthChartProps) {
  const bids = useMemo(() => cumulativeDepth(props.bids, 'bid'), [props.bids]);
  const asks = useMemo(() => cumulativeDepth(props.asks, 'ask'), [props.asks]);
  if (bids.length + asks.length === 0) {
    return (
      <figure className="kit-ct empty" aria-label={props.label} data-testid={props.testId}>
        <p className="kit-ct-empty">{props.labels?.empty ?? 'No data'}</p>
      </figure>
    );
  }
  return <Plot {...props} bids={bids} asks={asks} />;
}

function Plot({ bids, asks, label, height = 240, formatPrice = nprPrice, formatQuantity = quantity, labels, testId }: Omit<DepthChartProps, 'bids' | 'asks'> & { bids: ReturnType<typeof cumulativeDepth>; asks: ReturnType<typeof cumulativeDepth> }) {
  const { ref, width } = useMeasuredWidth(640);
  const hintId = useId();
  const plotH = clamp(isNum(height) ? height : 240, 140, 520);
  const top = 8;
  const svgH = top + plotH + AXIS_H;
  const L = { bid: labels?.bid ?? 'Bid', ask: labels?.ask ?? 'Ask', side: labels?.side ?? 'Side', price: labels?.price ?? 'Price', quantity: labels?.quantity ?? 'Quantity', cumulative: labels?.cumulative ?? 'Cumulative' };

  const rows: Row[] = useMemo(
    () => [...bids.toReversed().map((b): Row => ({ side: 'bid', ...b })), ...asks.map((a): Row => ({ side: 'ask', ...a }))],
    [bids, asks],
  );
  const bestBid = bids[0]?.price;
  const bestAsk = asks[0]?.price;
  const crossed = bestBid !== undefined && bestAsk !== undefined && bestBid >= bestAsk;
  const mid = bestBid !== undefined && bestAsk !== undefined && !crossed ? (bestBid + bestAsk) / 2 : null;

  const pLo = Math.min(...rows.map((r) => r.price));
  const pHi = Math.max(...rows.map((r) => r.price));
  const maxCum = Math.max(1, bids.at(-1)?.cumulative ?? 0, asks.at(-1)?.cumulative ?? 0);
  const yTicks = niceTicks(0, maxCum, Math.max(3, Math.round(plotH / 56)));
  const yText = yTicks.ticks.map(formatQuantity);
  const axisW = Math.min(110, Math.max(...yText.map((t) => t.length)) * 7 + 12);
  const x0 = 6;
  const x1 = Math.max(x0 + 40, width - axisW);
  // Room beyond the outer levels so each outermost level is a block, not a line; labels no closer than about 110px.
  const pad = (pHi - pLo) * 0.04 || pHi * 0.004;
  const xTicks = niceTicks(pLo - pad, pHi + pad, Math.max(2, Math.min(5, Math.floor((x1 - x0) / 110))));
  const xOf = (p: number) => x0 + ((p - xTicks.lo) / (xTicks.hi - xTicks.lo || 1)) * (x1 - x0);
  const yOf = (q: number) => top + plotH - (q / (yTicks.hi || 1)) * plotH;
  const baseY = top + plotH;

  // Step area: the best level's quantity extends outward to the next level's price.
  const stepPath = (pts: ReturnType<typeof cumulativeDepth>, edge: number) => {
    const first = pts[0];
    if (!first) return '';
    let d = `M${xOf(first.price).toFixed(1)},${baseY} L${xOf(first.price).toFixed(1)},${yOf(first.cumulative).toFixed(1)}`;
    for (let i = 1; i < pts.length; i += 1) d += ` L${xOf(pts[i]!.price).toFixed(1)},${yOf(pts[i - 1]!.cumulative).toFixed(1)} L${xOf(pts[i]!.price).toFixed(1)},${yOf(pts[i]!.cumulative).toFixed(1)}`;
    return `${d} L${edge.toFixed(1)},${yOf(pts.at(-1)!.cumulative).toFixed(1)} L${edge.toFixed(1)},${baseY} Z`;
  };

  const cursor = useChartCursor(rows.length);
  const active = cursor.index === null ? null : rows[cursor.index]!;
  const sideName = (r: Row) => (r.side === 'bid' ? L.bid : L.ask);
  const spoken = (r: Row) => `${sideName(r)} ${formatPrice(r.price)}, ${L.quantity.toLowerCase()} ${formatQuantity(r.quantity)}, ${L.cumulative.toLowerCase()} ${formatQuantity(r.cumulative)}`;
  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = 0;
    let dist = Infinity;
    rows.forEach((row, i) => {
      const dd = Math.abs(xOf(row.price) - px);
      if (dd < dist) { dist = dd; best = i; }
    });
    cursor.pointerTo(best);
  };
  const style: CSSProperties = { height: svgH };
  const spread = bestBid !== undefined && bestAsk !== undefined ? bestAsk - bestBid : null;
  return (
    <figure className="kit-ct" data-testid={testId} aria-label={label}>
      <div ref={ref} className="kit-ct-area" style={style}>
        {/* The plot is the one focus stop: arrow keys move through the data, the pointer reads it. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div className="kit-ct-plot" tabIndex={0}
          role="group"
          aria-label={label}
          aria-roledescription="depth chart"
          aria-describedby={hintId}
          onKeyDown={cursor.onKeyDown}
          onFocus={cursor.onFocus}
          onBlur={cursor.clear}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => cursor.pointerTo(null)}
        >
          <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false">
            {yTicks.ticks.map((t, k) => (
              <g key={t}>
                <line className="kit-ct-grid" x1={x0} x2={x1} y1={yOf(t)} y2={yOf(t)} />
                <text className="kit-ct-axis" x={x1 + 8} y={yOf(t)} dominantBaseline="middle">{yText[k]}</text>
              </g>
            ))}
            <path className="kit-ct-depth bid" d={stepPath(bids, x0)} />
            <path className="kit-ct-depth ask" d={stepPath(asks, x1)} />
            {xTicks.ticks.map((t) => (
              <text key={t} className="kit-ct-axis" x={clamp(xOf(t), x0 + 24, x1 - 24)} y={svgH - 6} textAnchor="middle">{formatPrice(t)}</text>
            ))}
            {mid !== null && (
              <g className="kit-ct-mid">
                <line x1={xOf(mid)} x2={xOf(mid)} y1={top} y2={baseY} />
                <text x={xOf(mid)} y={top + 10} textAnchor="middle">{`${labels?.mid ?? 'Mid'} ${formatPrice(mid)}`}</text>
              </g>
            )}
            {active && (
              <g className="kit-ct-cross">
                <line x1={xOf(active.price)} x2={xOf(active.price)} y1={top} y2={baseY} />
                <circle cx={xOf(active.price)} cy={yOf(active.cumulative)} r={4} />
              </g>
            )}
          </svg>
          {active && (
            <ChartTooltip x={xOf(active.price)} width={width} testId={testId ? `${testId}-tip` : undefined}>
              <b>{sideName(active)} {formatPrice(active.price)}</b>
              <dl>
                <dt>{L.quantity}</dt><dd>{formatQuantity(active.quantity)}</dd>
                <dt>{L.cumulative}</dt><dd>{formatQuantity(active.cumulative)}</dd>
              </dl>
            </ChartTooltip>
          )}
        </div>
      </div>
      {(spread !== null || crossed) && (
        <p className="kit-ct-note">
          {crossed ? (labels?.crossed ?? 'The best bid is not below the best ask: check the data.') : `${labels?.spread ?? 'Spread'} ${formatPrice(spread!)}`}
        </p>
      )}
      <p className="kit-sr" id={hintId}>{labels?.hint ?? 'Use the left and right arrow keys to move between price levels, Home and End to jump to the lowest and highest price.'}</p>
      <div className="kit-sr" role="status" aria-live="polite" aria-atomic="true">{active ? spoken(active) : ''}</div>
      <div className="kit-sr">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">{L.side}</th>
              <th scope="col">{L.price}</th>
              <th scope="col">{L.quantity}</th>
              <th scope="col">{L.cumulative}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.side}-${r.price}`}>
                <th scope="row">{sideName(r)}</th>
                <td>{formatPrice(r.price)}</td>
                <td>{formatQuantity(r.quantity)}</td>
                <td>{formatQuantity(r.cumulative)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
