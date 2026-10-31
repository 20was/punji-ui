'use client';

/**
 * CandlestickChart: open, high, low and close per session as candles (or OHLC
 * bars), with an optional volume pane and moving averages. Drawn as SVG, owned
 * here, no chart library.
 *
 * Edge cases are decided, not accidents:
 *   empty         no candle to draw prints `labels.empty`; no axes.
 *   single        one candle, centred, at normal width.
 *   constant      high = low = open = close draws a one pixel mark on a widened scale.
 *   bad candle    a candle with a non-finite price, or with low above open or
 *                 close, or high below them, is not drawn (a wrong wick is worse
 *                 than none). It is counted in `labels.skipped` under the chart
 *                 and kept in the data table with the reason.
 *   no volume     the pane is left out when no candle has a volume; a candle
 *                 without one has no bar and "none" in the table.
 *   gaps          the default axis is by session, so Saturdays, holidays and
 *                 suspensions leave no hole; `axis="time"` spaces by date.
 *   many candles  more candles than the width has room for (3px each) are
 *                 aggregated into buckets: first open, last close, extreme high
 *                 and low, summed volume. The table keeps every candle.
 *
 * Interaction: the pointer shows a crosshair and a readout; the plot is a
 * focus stop and Left, Right, Home, End and Escape move through the candles.
 * The focused candle's open, high, low, close and volume are announced through
 * a polite live region. Direction is never colour alone: hollow or filled
 * bodies are optional, and the readout, live region and table spell it out.
 * A visually hidden table lists every candle.
 */
import { useId, useMemo, type CSSProperties, type PointerEvent, type ReactNode } from 'react';

import { bandScale, ema, niceTicks, reduceCandles, sma, timeScale, validateOhlc, type OhlcIssue } from '../chart-math/chartMath.ts';
import { ChartTooltip, clamp, isNum, nprPrice, quantity, shortDate, thinned, useChartCursor, useMeasuredWidth } from '../internal/chartFrame.tsx';

export interface Candle {
  /** The session's date as "YYYY-MM-DD". Sorted by it when `axis="time"`. */
  date: string;
  /** Opening price. */
  open: number;
  /** Highest price of the session. */
  high: number;
  /** Lowest price of the session. */
  low: number;
  /** Closing price. */
  close: number;
  /** Shares traded. Missing, null and non-finite mean no volume. */
  volume?: number | null;
}

export interface MovingAverage {
  /** 'sma' (simple) or 'ema' (exponential), over closes. */
  type: 'sma' | 'ema';
  /** Sessions in the window, at least 2. */
  window: number;
  /** Its name in the legend and the readout. Default "SMA 20". */
  label?: string;
}

export interface CandlestickChartLabels {
  /** Printed when there is nothing to draw. Default "No data". */
  empty?: ReactNode;
  /** Table heads. */
  date?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  volume?: string;
  /** Table head of the problem column. Default "Problem". */
  problem?: string;
  /** A volume a candle did not have. Default "none". */
  none?: string;
  /** Under the chart: how many candles were not drawn. Default "N candles not drawn: inconsistent prices". */
  skipped?: (count: number) => string;
  /** Spoken direction of a candle. Default up, down, unchanged. */
  up?: string;
  down?: string;
  flat?: string;
  /** The keyboard hint read once with the chart's name. */
  hint?: string;
  /** Said when a table is cut to the latest candles. Default "Showing the latest N of M candles". */
  truncated?: (shown: number, total: number) => string;
  /** The reasons a candle is not drawn, by code. */
  issues?: Partial<Record<OhlcIssue, string>>;
}

export interface CandlestickChartProps {
  /** Sessions, oldest first. */
  candles: readonly Candle[];
  /** Names the chart and its data table. */
  label: string;
  /** 'candles' (default) or 'bars' (OHLC ticks). */
  variant?: 'candles' | 'bars';
  /** Price pane height in CSS px, clamped to 140..640. Default 280. */
  height?: number;
  /** Show the volume pane. Default true when any candle has a volume. */
  volume?: boolean;
  /** 'category' (default): one slot per session, no holes for non-trading days. 'time': spaced by date. */
  axis?: 'category' | 'time';
  /** Draw up candles as outlines and down candles filled, so direction survives without colour. */
  hollowUp?: boolean;
  /** Which colour means up. 'green-up' (default) or 'red-up', as PriceChange. */
  convention?: 'green-up' | 'red-up';
  /** Moving averages over closes, drawn over the candles. */
  averages?: readonly MovingAverage[];
  /** How a price is printed. Default NPR through the money formatter ("NPR 487.50"). */
  formatPrice?: (price: number) => string;
  /** How a volume is printed. Default grouped whole shares. */
  formatVolume?: (volume: number) => string;
  /** How a date is printed on the axis and in the readout. Default "14 Nov". */
  formatDate?: (date: string) => string;
  /** The latest candles listed in the hidden table (the chart always uses all). Default 500. */
  tableLimit?: number;
  /** Overrides for the printed and spoken words. */
  labels?: CandlestickChartLabels;
  /** Test id on the figure. */
  testId?: string;
}

const AVERAGE_TONES = ['var(--pu-color-series-nepse)', 'var(--pu-color-series-3)', 'var(--pu-color-series-4)'];
/** Least room per candle; beyond it candles are aggregated. */
const MIN_PX = 3;
const AXIS_H = 22;
const MAX_BODY = 24;

interface Item {
  candle: Candle;
  /** Index of the first source candle in `valid` and of the last, when aggregated. */
  from: number;
  to: number;
  time: number;
}

type Dir = 'up' | 'down' | 'flat';
const dirOf = (c: { open: number; close: number }): Dir => (c.close > c.open ? 'up' : c.close < c.open ? 'down' : 'flat');

const DEFAULT_ISSUES: Record<OhlcIssue, string> = {
  'not-finite': 'a price is missing or not a number',
  'high-below-low': 'high is below low',
  'high-below-body': 'high is below open or close',
  'low-above-body': 'low is above open or close',
  'negative-volume': 'volume is negative',
};

export function CandlestickChart(props: CandlestickChartProps) {
  const { candles, label, labels, testId } = props;
  const checked = useMemo(() => candles.map((c, i) => ({ c, i, issues: validateOhlc(c), time: Date.parse(c.date) })), [candles]);
  const timeAxis = props.axis === 'time';
  const valid = useMemo(() => {
    const ok = checked.filter((x) => x.issues.length === 0 && (!timeAxis || Number.isFinite(x.time)));
    return timeAxis ? ok.toSorted((p, q) => p.time - q.time) : ok;
  }, [checked, timeAxis]);
  if (valid.length === 0) {
    return (
      <figure className="kit-ct empty" aria-label={label} data-testid={testId}>
        <p className="kit-ct-empty">{labels?.empty ?? 'No data'}</p>
        {checked.length > 0 && <DataTable {...props} checked={checked} />}
      </figure>
    );
  }
  return <Plot {...props} checked={checked} valid={valid} />;
}

type Checked = { c: Candle; i: number; issues: OhlcIssue[]; time: number };

function Plot({ candles, label, variant = 'candles', height = 280, volume, axis = 'category', hollowUp = false, convention = 'green-up', averages = [], formatPrice = nprPrice, formatVolume = quantity, formatDate = shortDate, labels, testId, checked, valid, tableLimit = 500 }: CandlestickChartProps & { checked: Checked[]; valid: Checked[] }) {
  const { ref, width } = useMeasuredWidth(640);
  const hintId = useId();
  const none = labels?.none ?? 'none';
  const hasVolume = valid.some((x) => isNum(x.c.volume));
  const showVolume = (volume ?? true) && hasVolume;
  const priceH = clamp(isNum(height) ? height : 280, 140, 640);
  const volH = showVolume ? Math.round(clamp(priceH * 0.22, 44, 96)) : 0;
  const gap = showVolume ? 10 : 0;
  const top = 8;
  const plotH = priceH;
  const svgH = top + plotH + gap + volH + AXIS_H;

  // Aggregate when the width has no room (3px each) for every candle.
  const items = useMemo(() => {
    const labelsW = 64;
    const plotW = Math.max(40, width - labelsW);
    const cap = Math.max(1, Math.floor(plotW / MIN_PX));
    if (valid.length <= cap) return valid.map((x, k): Item => ({ candle: x.c, from: k, to: k, time: x.time }));
    return reduceCandles(valid.map((x) => x.c), cap).map((b): Item => {
      const first = valid[b.from]!;
      return { candle: { ...b.candle, date: first.c.date }, from: b.from, to: b.to, time: first.time };
    });
  }, [valid, width]);
  const aggregated = items.length < valid.length;

  const lines = useMemo(() => {
    const closes = valid.map((x) => x.c.close);
    return averages.map((a, k) => {
      const w = Math.max(2, Math.floor(a.window) || 2);
      const full = (a.type === 'ema' ? ema : sma)(closes, w);
      return { label: a.label ?? `${a.type.toUpperCase()} ${w}`, tone: AVERAGE_TONES[k % AVERAGE_TONES.length]!, values: items.map((it) => full[it.to] ?? null) };
    });
  }, [averages, valid, items]);

  let lo = Infinity;
  let hi = -Infinity;
  for (const it of items) {
    lo = Math.min(lo, it.candle.low);
    hi = Math.max(hi, it.candle.high);
  }
  const ticks = niceTicks(lo, hi, Math.max(3, Math.round(plotH / 56)));
  const tickText = ticks.ticks.map(formatPrice);
  const axisW = Math.min(120, Math.max(...tickText.map((t) => t.length)) * 7 + 12);
  const x0 = 4;
  const x1 = Math.max(x0 + 20, width - axisW);
  const yOf = (p: number) => top + plotH - ((p - ticks.lo) / (ticks.hi - ticks.lo || 1)) * plotH;
  const volMax = Math.max(1, ...items.map((it) => (isNum(it.candle.volume) ? it.candle.volume : 0)));
  const volTop = top + plotH + gap;
  const volY = (v: number) => volTop + volH - (v / volMax) * volH;

  const band = bandScale(items.length, x0, x1, 0.25);
  const time = axis === 'time' ? timeScale(items.map((it) => it.time), x0, x1) : null;
  const cx = (k: number) => (time ? time.x(items[k]!.time) : band.center(k));
  const slot = time ? time.step : band.step;
  const body = clamp(slot * 0.72, 1, MAX_BODY);
  const labelIdx = thinned(items.length, slot, 76);
  const indexAt = (px: number) => (time ? time.nearest(px) : band.indexAt(px));

  const cursor = useChartCursor(items.length);
  const active = cursor.index === null ? null : items[cursor.index]!;
  const words = { up: labels?.up ?? 'up', down: labels?.down ?? 'down', flat: labels?.flat ?? 'unchanged' };
  const L = { date: labels?.date ?? 'Date', open: labels?.open ?? 'Open', high: labels?.high ?? 'High', low: labels?.low ?? 'Low', close: labels?.close ?? 'Close', volume: labels?.volume ?? 'Volume' };
  const dateText = (it: Item) => {
    const end = valid[it.to]!.c.date;
    return it.from === it.to ? formatDate(it.candle.date) : `${formatDate(it.candle.date)} – ${formatDate(end)}`;
  };
  const spoken = (it: Item) => {
    const c = it.candle;
    const pct = c.open !== 0 ? ` ${(Math.abs((c.close - c.open) / c.open) * 100).toFixed(2)}%` : '';
    const parts = [`${dateText(it)}: ${words[dirOf(c)]}${dirOf(c) === 'flat' ? '' : pct}`, `${L.open} ${formatPrice(c.open)}`, `${L.high} ${formatPrice(c.high)}`, `${L.low} ${formatPrice(c.low)}`, `${L.close} ${formatPrice(c.close)}`];
    if (hasVolume) parts.push(`${L.volume} ${isNum(c.volume) ? formatVolume(c.volume) : none}`);
    return parts.join(', ');
  };
  const skipped = checked.length - valid.length;
  const skippedText = (labels?.skipped ?? ((n: number) => `${n} ${n === 1 ? 'candle' : 'candles'} not drawn: inconsistent prices`))(skipped);
  const upTone = convention === 'red-up' ? 'loss' : 'gain';
  const downTone = convention === 'red-up' ? 'gain' : 'loss';
  const toneOf = (d: Dir) => (d === 'up' ? upTone : d === 'down' ? downTone : 'flat');

  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    cursor.pointerTo(items.length ? indexAt(e.clientX - r.left) : null);
  };
  const activeX = active ? cx(cursor.index!) : 0;
  const style: CSSProperties = { height: svgH };
  return (
    <figure className="kit-ct" data-convention={convention} data-testid={testId} aria-label={label}>
      {lines.length > 0 && (
        <ul className="kit-ct-legend" aria-hidden="true">
          {lines.map((l) => (
            <li key={l.label}><i style={{ background: l.tone }} />{l.label}</li>
          ))}
        </ul>
      )}
      <div ref={ref} className="kit-ct-area" style={style}>
        {/* The plot is the one focus stop: arrow keys move through the data, the pointer reads it. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div className="kit-ct-plot" tabIndex={0}
          role="group"
          aria-label={label}
          aria-roledescription="candlestick chart"
          aria-describedby={hintId}
          onKeyDown={cursor.onKeyDown}
          onFocus={cursor.onFocus}
          onBlur={cursor.clear}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => cursor.pointerTo(null)}
        >
          <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false" data-testid={testId ? `${testId}-svg` : undefined}>
            {ticks.ticks.map((t, k) => (
              <g key={t}>
                <line className="kit-ct-grid" x1={x0} x2={x1} y1={yOf(t)} y2={yOf(t)} />
                <text className="kit-ct-axis" x={x1 + 8} y={yOf(t)} dominantBaseline="middle">{tickText[k]}</text>
              </g>
            ))}
            {showVolume && <line className="kit-ct-grid" x1={x0} x2={x1} y1={volTop + volH} y2={volTop + volH} />}
            {items.map((it, k) => {
              const c = it.candle;
              const d = dirOf(c);
              const tone = toneOf(d);
              const x = cx(k);
              const yo = yOf(c.open);
              const yc = yOf(c.close);
              const hollow = hollowUp && d === 'up';
              return (
                <g key={`${it.candle.date}-${k}`} className={`kit-ct-c ${tone}`} data-dir={d}>
                  {variant === 'bars' ? (
                    <>
                      <line x1={x} x2={x} y1={yOf(c.high)} y2={yOf(c.low)} />
                      <line x1={x - body / 2} x2={x} y1={yo} y2={yo} />
                      <line x1={x} x2={x + body / 2} y1={yc} y2={yc} />
                    </>
                  ) : (
                    <>
                      <line x1={x} x2={x} y1={yOf(c.high)} y2={yOf(c.low)} />
                      <rect x={x - body / 2} width={body} y={Math.min(yo, yc) - (Math.abs(yo - yc) < 1 ? 0.5 : 0)} height={Math.max(1, Math.abs(yo - yc))} className={hollow ? 'hollow' : undefined} />
                    </>
                  )}
                  {showVolume && isNum(c.volume) && <rect className="kit-ct-vol" x={x - body / 2} width={body} y={volY(c.volume)} height={Math.max(c.volume > 0 ? 1 : 0, volTop + volH - volY(c.volume))} />}
                </g>
              );
            })}
            {lines.map((l) => (
              <path key={l.label} className="kit-ct-ma" stroke={l.tone} d={l.values.map((v, k) => (v === null ? '' : `${k === 0 || l.values[k - 1] === null ? 'M' : 'L'}${cx(k).toFixed(1)},${yOf(v).toFixed(1)}`)).join(' ')} />
            ))}
            {labelIdx.map((k) => (
              <text key={k} className="kit-ct-axis" x={clamp(cx(k), x0 + 24, x1 - 24)} y={svgH - 6} textAnchor="middle">{formatDate(items[k]!.candle.date)}</text>
            ))}
            {active && (
              <g className="kit-ct-cross">
                <line x1={activeX} x2={activeX} y1={top} y2={top + plotH + gap + volH} />
                <line x1={x0} x2={x1} y1={yOf(active.candle.close)} y2={yOf(active.candle.close)} />
                <rect x={x1 + 2} y={yOf(active.candle.close) - 9} width={axisW - 4} height={18} rx={3} />
                <text x={x1 + 8} y={yOf(active.candle.close)} dominantBaseline="middle">{formatPrice(active.candle.close)}</text>
              </g>
            )}
          </svg>
          {active && (
            <ChartTooltip x={activeX} width={width} testId={testId ? `${testId}-tip` : undefined}>
              <b>{dateText(active)}</b>
              <dl>
                <dt>{L.open}</dt><dd>{formatPrice(active.candle.open)}</dd>
                <dt>{L.high}</dt><dd>{formatPrice(active.candle.high)}</dd>
                <dt>{L.low}</dt><dd>{formatPrice(active.candle.low)}</dd>
                <dt>{L.close}</dt><dd className={`kit-ct-${toneOf(dirOf(active.candle))}`}>{formatPrice(active.candle.close)}</dd>
                {hasVolume && (<><dt>{L.volume}</dt><dd>{isNum(active.candle.volume) ? formatVolume(active.candle.volume) : none}</dd></>)}
              </dl>
            </ChartTooltip>
          )}
        </div>
      </div>
      <p className="kit-sr" id={hintId}>{labels?.hint ?? 'Use the left and right arrow keys to move between candles, Home and End to jump to the first and last.'}</p>
      <div className="kit-sr" role="status" aria-live="polite" aria-atomic="true">{active ? spoken(active) : ''}</div>
      {aggregated && <p className="kit-ct-note">{`${valid.length} sessions shown as ${items.length} groups`}</p>}
      {skipped > 0 && <p className="kit-ct-note" role="note">{skippedText}</p>}
      <DataTable candles={candles} label={label} labels={labels} formatPrice={formatPrice} formatVolume={formatVolume} formatDate={formatDate} checked={checked} tableLimit={tableLimit} />
    </figure>
  );
}

function DataTable({ label, labels, formatPrice = nprPrice, formatVolume = quantity, formatDate = shortDate, checked, tableLimit = 500 }: CandlestickChartProps & { checked: Checked[] }) {
  const none = labels?.none ?? 'none';
  const rows = checked.slice(-Math.max(1, tableLimit));
  const anyProblem = checked.some((x) => x.issues.length > 0);
  const issueText = (i: OhlcIssue) => labels?.issues?.[i] ?? DEFAULT_ISSUES[i];
  const price = (v: number) => (isNum(v) ? formatPrice(v) : none);
  return (
    <div className="kit-sr">
      <table>
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{labels?.date ?? 'Date'}</th>
            <th scope="col">{labels?.open ?? 'Open'}</th>
            <th scope="col">{labels?.high ?? 'High'}</th>
            <th scope="col">{labels?.low ?? 'Low'}</th>
            <th scope="col">{labels?.close ?? 'Close'}</th>
            <th scope="col">{labels?.volume ?? 'Volume'}</th>
            {anyProblem && <th scope="col">{labels?.problem ?? 'Problem'}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.i}>
              <th scope="row">{formatDate(x.c.date)}</th>
              <td>{price(x.c.open)}</td>
              <td>{price(x.c.high)}</td>
              <td>{price(x.c.low)}</td>
              <td>{price(x.c.close)}</td>
              <td>{isNum(x.c.volume) ? formatVolume(x.c.volume) : none}</td>
              {anyProblem && <td>{x.issues.map(issueText).join('; ')}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length < checked.length && <p>{(labels?.truncated ?? ((s: number, t: number) => `Showing the latest ${s} of ${t} candles`))(rows.length, checked.length)}</p>}
    </div>
  );
}
