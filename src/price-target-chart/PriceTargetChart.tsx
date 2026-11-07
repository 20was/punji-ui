'use client';

/**
 * PriceTargetChart (design.punji.app/components/price-target-chart): a price history line, then the analysts' low,
 * average and high targets fanning out from the current price to a future date. Prices are decimal strings or `Money`,
 * held as bigint: every printed figure and every percentage is exact, only the plot coordinates are numbers. The three
 * target labels are spread apart so they never collide, and they carry the words Low, Average and High: the lines also
 * differ by dash, never by colour alone. The targets come from the app (a data vendor, your own research); this
 * component only draws them.
 *
 * Accessible alternative: ChartA11yShell (one focus stop, arrows/Home/End/Escape through every close and then the
 * targets, live region, spoken summary, hidden table of the latest 500 closes and the targets).
 */
import type { PointerEvent, ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable, type ChartA11yContext } from '../chart-a11y/ChartA11yShell.tsx';
import { downsampleIndices, niceTicks } from '../chart-math/chartMath.ts';
import { ChartTooltip, clamp, isNum, shortDate, useMeasuredWidth } from '../internal/chartFrame.tsx';
import { alignScale, currencyOf, decimalText, gapTenths, percentText, plotValue, scaledOf, type PriceInput, type Scaled } from '../internal/decimal.ts';

export type { PriceInput } from '../internal/decimal.ts';

export interface PriceTargetPoint {
  /** "YYYY-MM-DD" (UTC). */
  date: string;
  /** The closing price: a decimal string or `Money`. */
  close: PriceInput;
}

export interface PriceTargets {
  /** The date the targets are for, "YYYY-MM-DD". */
  date: string;
  /** The lowest analyst target. */
  low: PriceInput;
  /** The mean or median analyst target. */
  average: PriceInput;
  /** The highest analyst target. */
  high: PriceInput;
}

export interface PriceTargetChartLabels {
  empty?: ReactNode;
  date?: string;
  close?: string;
  low?: string;
  average?: string;
  high?: string;
  /** The current price marker. Default "Now". */
  now?: string;
  /** "above the current price". */
  above?: string;
  /** "below the current price". */
  below?: string;
  /** "at the current price". */
  at?: string;
  hint?: string;
  summary?: (info: { count: number; from: string; to: string; current: string; targetDate: string; low: string; average: string; high: string; change: string; relation: string }) => string;
}

export interface PriceTargetChartProps {
  /** Closing prices, oldest first. Points with a date or price that does not parse are skipped. */
  history: readonly PriceTargetPoint[];
  /** The analysts' targets. Leave out to draw the history alone. */
  targets?: PriceTargets;
  /** The current price. Default: the last close. */
  current?: PriceInput;
  /** Names the chart and its data table. */
  label: string;
  /** ISO 4217 code for decimal strings. Default "NPR"; ignored for prices given as `Money`. */
  currency?: string;
  /** BCP 47 tag for number grouping. Default "en-IN". */
  locale?: string;
  /** The plot's height in CSS px, clamped to 160..520. Default 280. */
  height?: number;
  /** Pass false when a parent hides the chart and gives the same figures another way. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: PriceTargetChartLabels;
  /** Layout only (margin, grid placement). */
  className?: string;
  /** Becomes data-testid on the figure; the target labels are `${testId}-low`, `-average` and `-high`. */
  testId?: string;
}

const TABLE_MAX = 500;
const TOP = 24;
const AXIS_H = 22;
const CHAR = 6.6;
const DAY = 86_400_000;

const dateMs = (iso: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(t) && new Date(t).toISOString().startsWith(iso) ? t : null;
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateText = (t: number, year: boolean): string => {
  const d = new Date(t);
  return year ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

/**
 * Moves label centres apart so each is at least `gap` from the next, inside [lo, hi], keeping their order.
 * Returns the new centres in the order given.
 */
export function spreadTargetLabels(centres: readonly number[], gap: number, lo: number, hi: number): number[] {
  const order = centres.map((c, i) => ({ c, i })).toSorted((a, b) => a.c - b.c || a.i - b.i);
  const ys = order.map((o) => clamp(o.c, lo, hi));
  for (let k = 1; k < ys.length; k += 1) ys[k] = Math.max(ys[k]!, ys[k - 1]! + gap);
  const over = (ys.at(-1) ?? 0) - hi;
  if (over > 0) {
    ys[ys.length - 1] = hi;
    for (let k = ys.length - 2; k >= 0; k -= 1) ys[k] = Math.min(ys[k]!, ys[k + 1]! - gap);
  }
  const out: number[] = [];
  order.forEach((o, k) => (out[o.i] = ys[k]!));
  return out;
}

interface Row {
  date: string;
  t: number;
  close: Scaled;
}

/**
 * @stability beta
 */
export function PriceTargetChart(props: PriceTargetChartProps) {
  const code = currencyOf([...props.history.map((h) => h.close), props.current, props.targets?.low, props.targets?.average, props.targets?.high], props.currency ?? 'NPR');
  const rows: Row[] = [];
  for (const h of props.history) {
    const t = dateMs(h.date);
    const close = scaledOf(h.close);
    if (t !== null && close) rows.push({ date: h.date, t, close });
  }
  rows.sort((a, b) => a.t - b.t);
  if (rows.length === 0) {
    return (
      <figure className={`kit-ct pu-pt${props.className ? ` ${props.className}` : ''}`} aria-label={props.label} data-testid={props.testId}>
        <p className="kit-ct-empty">{props.labels?.empty ?? 'No data'}</p>
      </figure>
    );
  }
  return <Chart {...props} code={code} rows={rows} />;
}

type TargetKey = 'low' | 'average' | 'high';

function Chart({ rows, code, targets, current, label, locale, height = 280, interactive = true, labels, className, testId }: PriceTargetChartProps & { code: string; rows: Row[] }) {
  const text = decimalText(code, locale);
  const tMs = targets ? dateMs(targets.date) : null;
  const tv = targets && tMs !== null ? { low: scaledOf(targets.low), average: scaledOf(targets.average), high: scaledOf(targets.high) } : null;
  const fan = tv && tv.low && tv.average && tv.high && targets ? { date: targets.date, t: tMs!, low: tv.low, average: tv.average, high: tv.high } : null;
  const nowScaled = scaledOf(current) ?? rows[rows.length - 1]!.close;
  const { units, scale } = alignScale([...rows.map((r) => r.close), nowScaled, ...(fan ? [fan.low, fan.average, fan.high] : [])]);
  const closeU = units.slice(0, rows.length);
  const nowU = units[rows.length]!;
  const fanU = fan ? { low: units[rows.length + 1]!, average: units[rows.length + 2]!, high: units[rows.length + 3]! } : null;
  const L = {
    date: labels?.date ?? 'Date',
    close: labels?.close ?? 'Close',
    low: labels?.low ?? 'Low',
    average: labels?.average ?? 'Average',
    high: labels?.high ?? 'High',
    now: labels?.now ?? 'Now',
    above: labels?.above ?? 'above the current price',
    below: labels?.below ?? 'below the current price',
    at: labels?.at ?? 'at the current price',
  };
  const relationOf = (t: bigint) => (t > nowU ? L.above : t < nowU ? L.below : L.at);
  const changeOf = (v: bigint): string => {
    const g = gapTenths(v, nowU);
    return g === null ? '—' : percentText(g);
  };
  const n = rows.length + (fan ? 1 : 0);
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  const targetCells = (key: TargetKey) => (fanU ? `${text.plain(fanU[key], scale)} (${changeOf(fanU[key])})` : '');
  const summary = (
    labels?.summary ??
    ((i) =>
      `${label}: ${i.count} closes from ${i.from} to ${i.to}, current ${i.current}.${fan ? ` Analyst targets for ${i.targetDate}: low ${i.low}, average ${i.average}, high ${i.high}. The average is ${i.change} ${i.relation}.` : ''}`)
  )({
    count: rows.length,
    from: first.date,
    to: last.date,
    current: text.plain(nowU, scale),
    targetDate: fan?.date ?? '',
    low: fanU ? text.plain(fanU.low, scale) : '',
    average: fanU ? text.plain(fanU.average, scale) : '',
    high: fanU ? text.plain(fanU.high, scale) : '',
    change: fanU ? changeOf(fanU.average) : '',
    relation: fanU ? relationOf(fanU.average) : '',
  });
  const shown = rows.length > TABLE_MAX ? rows.slice(-TABLE_MAX) : rows;
  const shownFrom = rows.length - shown.length;
  const { ref, width } = useMeasuredWidth(640);
  const renderPlot = (ctx: ChartA11yContext) => {
  const plotH = clamp(isNum(height) ? height : 280, 160, 520);
  const svgH = TOP + plotH + AXIS_H;
  const nums = [...closeU, nowU, ...(fanU ? [fanU.low, fanU.average, fanU.high] : [])].map((u) => plotValue(u, scale));
  const ticks = niceTicks(Math.min(...nums), Math.max(...nums), Math.max(3, Math.round(plotH / 56)));
  const span = ticks.hi - ticks.lo || 1;
  const y = (v: number) => TOP + plotH - ((v - ticks.lo) / span) * plotH;
  const tickText = ticks.ticks.map((v) => text.tick(v, scale));
  const axisW = Math.min(88, Math.max(...tickText.map((s) => s.length)) * 6.6 + 12);
  const labelChars = fanU ? Math.max(...(['low', 'average', 'high'] as const).map((k) => text.bare(fanU[k], scale).length), 6) : 0;
  const gutter = fanU ? Math.min(width * 0.45, Math.max(84, labelChars * CHAR + 18)) : 8;
  const x0 = axisW;
  const x1 = Math.max(x0 + 60, width - gutter);
  const t0 = first.t;
  const t1 = fan ? Math.max(fan.t, last.t + 7 * DAY) : last.t;
  const x = (t: number) => x0 + ((t - t0) / (t1 - t0 || 1)) * (x1 - x0);
  const xNow = x(last.t);
  const yNow = y(plotValue(nowU, scale));
  const idxs = downsampleIndices(closeU.map((u) => plotValue(u, scale)), Math.max(60, Math.round(x1 - x0)));
  const line = idxs.map((i) => `${x(rows[i]!.t).toFixed(1)},${y(plotValue(closeU[i]!, scale)).toFixed(1)}`);
  const tickCount = clamp(Math.floor((x1 - x0) / 84), 2, 6);
  const yearLabels = t1 - t0 > 300 * DAY;
  const xTicks = Array.from({ length: tickCount }, (_, k) => t0 + ((t1 - t0) * k) / (tickCount - 1));
  const keys: TargetKey[] = ['low', 'average', 'high'];
  const tipY = fanU ? keys.map((k) => y(plotValue(fanU[k], scale))) : [];
  const labelY = fanU ? spreadTargetLabels(tipY, 30, TOP + 14, TOP + plotH - 14) : [];
  const idx = ctx.index;
  const xAt = (i: number) => (i < rows.length ? x(rows[i]!.t) : x(fan!.t));
  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = 0;
    let dist = Infinity;
    for (let i = 0; i < n; i += 1) {
      const d = Math.abs(xAt(i) - px);
      if (d < dist) {
        dist = d;
        best = i;
      }
    }
    ctx.pointerTo(px < x0 - 4 || px > width ? null : best);
  };
  const nowText = `${L.now} ${text.bare(nowU, scale)}`;
  const nowAnchorX = clamp(xNow, x0 + (nowText.length * CHAR) / 2, width - (nowText.length * CHAR) / 2);
  return (
    <div ref={ref} className="kit-ct-area" style={{ height: svgH }}>
      {/* The plot is the one focus stop: arrow keys move through the closes and then the targets. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
      <div className="kit-ct-plot" {...ctx.plotProps(onPointer)}>
        <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false">
          {ticks.ticks.map((t, k) => (
            <g key={t}>
              <line className="kit-ct-grid" x1={x0} x2={x1} y1={y(t)} y2={y(t)} />
              <text className="kit-ct-axis" x={x0 - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">{tickText[k]}</text>
            </g>
          ))}
          {xTicks.map((t, k) => (
            <text key={k} className="kit-ct-axis" x={x(t)} y={svgH - 6} textAnchor={k === 0 ? 'start' : k === tickCount - 1 ? 'end' : 'middle'}>{dateText(t, yearLabels)}</text>
          ))}
          {fan && fanU && (
            <>
              <polygon className="pu-pt-fan" points={`${xNow.toFixed(1)},${yNow.toFixed(1)} ${x(fan.t).toFixed(1)},${tipY[2]!.toFixed(1)} ${x(fan.t).toFixed(1)},${tipY[0]!.toFixed(1)}`} />
              <line className="pu-pt-edge" x1={xNow} y1={yNow} x2={x(fan.t)} y2={tipY[0]!} />
              <line className="pu-pt-edge" x1={xNow} y1={yNow} x2={x(fan.t)} y2={tipY[2]!} />
              <line className="pu-pt-avg" x1={xNow} y1={yNow} x2={x(fan.t)} y2={tipY[1]!} />
            </>
          )}
          {rows.length > 1 && <path className="pu-pt-hist" d={`M${line.join(' L')}`} />}
          <line className="pu-pt-now" x1={xNow} x2={xNow} y1={TOP - 4} y2={TOP + plotH} />
          <circle className="pu-pt-dot now" cx={xNow} cy={yNow} r={4.5} />
          <text className="pu-pt-nowlabel" x={nowAnchorX} y={TOP - 9} textAnchor="middle">{nowText}</text>
          {idx !== null && idx < rows.length && <circle className="pu-pt-dot lit" cx={xAt(idx)} cy={y(plotValue(closeU[idx]!, scale))} r={5} />}
          {fan && fanU && keys.map((k, j) => {
            const lit = idx === rows.length;
            return (
              <g key={k} data-testid={testId ? `${testId}-${k}` : undefined}>
                <circle className={`pu-pt-dot ${k}${lit ? ' lit' : ''}`} cx={x(fan.t)} cy={tipY[j]!} r={lit ? 5 : 3.5} />
                {Math.abs(labelY[j]! - tipY[j]!) > 1 && <line className="pu-pt-lead" x1={x(fan.t) + 4} y1={tipY[j]!} x2={x1 + 8} y2={labelY[j]!} />}
                <text className="pu-pt-tl" x={x1 + 10} y={labelY[j]! - 2} dominantBaseline="auto">
                  <tspan className="pu-pt-tw" x={x1 + 10}>{L[k]}</tspan>
                  <tspan className="pu-pt-tn" x={x1 + 10} dy={13}>{text.bare(fanU[k], scale)}</tspan>
                </text>
              </g>
            );
          })}
          {idx !== null && <line className="pu-pt-cross" x1={xAt(idx)} x2={xAt(idx)} y1={TOP} y2={TOP + plotH} />}
        </svg>
        {idx !== null && (
          <ChartTooltip x={xAt(idx)} width={width} testId={testId ? `${testId}-tip` : undefined}>
            {idx < rows.length ? (
              <>
                <b>{shortDate(rows[idx]!.date)}</b>
                <dl><div><dt>{L.close}</dt><dd>{text.plain(closeU[idx]!, scale)}</dd></div></dl>
              </>
            ) : (
              <>
                <b>{fan!.date}</b>
                <dl>
                  {(['high', 'average', 'low'] as const).map((k) => (
                    <div key={k}><dt>{L[k]}</dt><dd>{text.bare(fanU![k], scale)} ({changeOf(fanU![k])})</dd></div>
                  ))}
                </dl>
              </>
            )}
          </ChartTooltip>
        )}
      </div>
    </div>
  );
};

  return (
    <ChartA11yShell
      className={`kit-ct pu-pt${className ? ` ${className}` : ''}`}
      label={label}
      roleDescription="price target chart"
      count={n}
      testId={testId}
      interactive={interactive}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between dates, Home and End to jump to the first date and the targets.'}
      summary={summary}
      speak={(i) =>
        i < rows.length
          ? `${rows[i]!.date}: ${L.close} ${text.plain(closeU[i]!, scale)}`
          : `${fan!.date}: ${L.low} ${targetCells('low')}, ${L.average} ${targetCells('average')}, ${L.high} ${targetCells('high')}`
      }
      footer={
        <>
          <ul className="kit-ct-legend pu-pt-legend" aria-hidden="true">
            <li><svg width="22" height="10" aria-hidden="true"><line className="pu-pt-sw hist" x1="1" x2="21" y1="5" y2="5" /></svg>{L.close}</li>
            {fan && (
              <>
                <li><svg width="22" height="10" aria-hidden="true"><line className="pu-pt-sw avg" x1="1" x2="21" y1="5" y2="5" /></svg>{L.average}</li>
                <li><svg width="22" height="10" aria-hidden="true"><line className="pu-pt-sw edge" x1="1" x2="21" y1="5" y2="5" /></svg>{L.low} / {L.high}</li>
              </>
            )}
          </ul>
          {fanU && (
            <p className="pu-pt-implied">
              {L.average} <b>{text.plain(fanU.average, scale)}</b>: <b>{changeOf(fanU.average)}</b> {relationOf(fanU.average)}
            </p>
          )}
        </>
      }
      table={
        <ChartDataTable
          caption={label}
          head={[L.date, L.close, L.low, L.average, L.high]}
          rows={[
            ...shown.map((r, i) => ({ key: r.date + (shownFrom + i), head: r.date, cells: [text.plain(closeU[shownFrom + i]!, scale), '—', '—', '—'] })),
            ...(fan && fanU ? [{ key: `target-${fan.date}`, head: fan.date, cells: ['—', targetCells('low'), targetCells('average'), targetCells('high')] }] : []),
          ]}
          note={shownFrom > 0 ? <p>{`Showing the latest ${shown.length} of ${rows.length} closes`}</p> : undefined}
        />
      }
    >
      {renderPlot}
    </ChartA11yShell>
  );
}
