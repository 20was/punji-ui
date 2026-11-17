'use client';

/**
 * VolatilitySmile (design.punji.app/components/volatility-smile): implied volatility by strike (or by delta or
 * moneyness) for one or more expiries, as lines, with the same numbers underneath as a real table: expiries down the side,
 * strikes across the top, every IV printed and shaded by its size.
 *
 * You supply the implied volatilities. No pricing model ships here: the chart plots and prints what you give it, and
 * says nothing about whether the numbers are right. IV is a percent as a decimal string ("24.50"), a strike (or delta,
 * or moneyness) is a decimal string ("22000", "0.25", "1.05"). Both are read exactly and printed as written; only the
 * pixel positions are numbers.
 *
 * Never colour alone: each expiry has its own marker shape and dash pattern and is named at the end of its line and in
 * the legend; the grid prints every value, so its shade only repeats the number.
 *
 * Accessible alternative: ChartA11yShell (one focus stop, arrows/Home/End/Escape through the strikes, live region, spoken
 * summary). The grid is the data table; without it a hidden table lists the same values.
 *
 * @stability beta
 */
import { useMemo, type PointerEvent, type ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable } from '../chart-a11y/ChartA11yShell.tsx';
import { niceTicks } from '../chart-math/chartMath.ts';
import { ChartTooltip, clamp, isNum, useMeasuredWidth } from '../internal/chartFrame.tsx';
import { decimalText, parseDecimal, pow10, ratioNumber, rescale, type ScaledDecimal } from '../internal/exactMath.ts';

export type SmileXKind = 'strike' | 'delta' | 'moneyness';

/** One quote: where on the x axis, and the implied volatility in percent. Both are decimal strings. */
export interface SmilePoint {
  /** The strike ("22000"), delta ("0.25") or moneyness ("1.05"). */
  x: string;
  /** Implied volatility in percent ("24.50"). */
  iv: string;
}

export interface SmileCurve {
  /** Stable key. */
  key: string;
  /** Names the expiry on the line and in the table ("28 Nov, 12 days"). */
  label: string;
  /** The quotes, any order. One per strike (or delta, or moneyness). */
  points: readonly SmilePoint[];
}

export interface VolatilitySmileLabels {
  empty?: ReactNode;
  /** Names of the x axes. */
  strike?: string;
  delta?: string;
  moneyness?: string;
  /** Head of the first grid column. Default "Expiry". */
  expiry?: string;
  /** Name of the y axis and the unit word in speech. Default "Implied volatility". */
  iv?: string;
  /** A cell with no quote. Default "no quote". */
  noQuote?: string;
  /** Caption of the grid, when it is shown. Default "<label>, implied volatility by expiry and <x>". */
  gridCaption?: (info: { label: string; x: string }) => string;
  hint?: string;
}

export interface VolatilitySmileProps {
  /** One curve per expiry, nearest first. Quotes need not share strikes: a missing quote prints as "no quote". */
  curves: readonly SmileCurve[];
  /** Names the chart and its table. */
  label: string;
  /** What the x axis measures. Default 'strike'. */
  xKind?: SmileXKind;
  /** A vertical rule at one x, such as the spot price or at-the-money ("22140", "ATM"). */
  reference?: { x: string; label: string };
  /** Print the expiry-by-strike grid under the chart. Default true. */
  grid?: boolean;
  /** BCP 47 tag for the number format. Default "en-IN". */
  locale?: string;
  /** The plot's height in CSS px, clamped to 160..520. Default 280. */
  height?: number;
  /** Print the legend. Default true. */
  legend?: boolean;
  /** Pass false when a parent hides the chart and gives the same figures as a table. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: VolatilitySmileLabels;
  /** Becomes data-testid on the figure. */
  testId?: string;
}

/** One cell of the grid: the exact IV, its shade band (0 none, 1 low to 4 high) and the text. */
export interface SmileGridCell {
  iv: bigint | null;
  band: 0 | 1 | 2 | 3 | 4;
}

export interface SmileGrid {
  /** The x values across the top, ascending, as scaled integers at `xScale` decimals. */
  columns: bigint[];
  xScale: number;
  ivScale: number;
  /** One row per curve, one cell per column. */
  rows: { curve: SmileCurve; cells: SmileGridCell[] }[];
  /** Lowest and highest IV in the data (scaled by `ivScale`), or null when there are no quotes. */
  min: bigint | null;
  max: bigint | null;
}

function parseQuote(curveLabel: string, p: SmilePoint): { x: ScaledDecimal; iv: ScaledDecimal } {
  const x = parseDecimal(p.x);
  const iv = parseDecimal(p.iv);
  if (!x) throw new RangeError(`VolatilitySmile: "${p.x}" (${curveLabel}) is not a decimal string`);
  if (!iv || iv.units < 0n) throw new RangeError(`VolatilitySmile: "${p.iv}" (${curveLabel}) is not a volatility in percent (a decimal string of zero or more)`);
  return { x, iv };
}

/**
 * The grid behind the chart, exact: strikes (or deltas, moneyness) across, expiries down, an IV or nothing in each cell, and
 * a shade band 1 to 4 by where the IV sits between the lowest and the highest in the data. Throws a RangeError for a
 * malformed number or a repeated x within one curve.
 */
export function smileGrid(curves: readonly SmileCurve[]): SmileGrid {
  const parsed = curves.map((curve) => ({ curve, quotes: curve.points.map((p) => parseQuote(curve.label, p)) }));
  const xScale = Math.max(0, ...parsed.flatMap((c) => c.quotes.map((q) => q.x.scale)));
  const ivScale = Math.max(0, ...parsed.flatMap((c) => c.quotes.map((q) => q.iv.scale)));
  const byCurve = parsed.map(({ curve, quotes }) => {
    const map = new Map<bigint, bigint>();
    for (const q of quotes) {
      const x = rescale(q.x, xScale);
      if (map.has(x)) throw new RangeError(`VolatilitySmile: ${curve.label} has two quotes at ${q.x.units}/10^${q.x.scale}`);
      map.set(x, rescale(q.iv, ivScale));
    }
    return { curve, map };
  });
  const columns = [...new Set(byCurve.flatMap((c) => [...c.map.keys()]))].toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const all = byCurve.flatMap((c) => [...c.map.values()]);
  const min = all.length ? all.reduce((a, b) => (b < a ? b : a)) : null;
  const max = all.length ? all.reduce((a, b) => (b > a ? b : a)) : null;
  const bandOf = (iv: bigint): 1 | 2 | 3 | 4 => {
    if (min === null || max === null || max === min) return 2;
    const q = Number(((iv - min) * 4n) / (max - min));
    return (Math.min(3, q) + 1) as 1 | 2 | 3 | 4;
  };
  return {
    columns,
    xScale,
    ivScale,
    rows: byCurve.map(({ curve, map }) => ({
      curve,
      cells: columns.map((x): SmileGridCell => {
        const iv = map.get(x);
        return iv === undefined ? { iv: null, band: 0 } : { iv, band: bandOf(iv) };
      }),
    })),
    min,
    max,
  };
}

/** Marker shapes, so the expiries differ without colour: circle, square, triangle, diamond, cross, plus. */
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'cross', 'plus'] as const;
const DASHES = ['', '7 4', '2 3', '10 3 2 3', '', '7 4'];
const TONES = ['chart', 'nepse', 's3', 's4', 's5', 's6'] as const;

function Marker({ shape, x, y, className }: { shape: (typeof SHAPES)[number]; x: number; y: number; className: string }) {
  const r = 4.5;
  if (shape === 'circle') return <circle className={className} cx={x} cy={y} r={r} />;
  if (shape === 'square') return <rect className={className} x={x - r} y={y - r} width={2 * r} height={2 * r} />;
  if (shape === 'triangle') return <path className={className} d={`M${x},${y - r - 1} L${x + r + 1},${y + r} L${x - r - 1},${y + r} Z`} />;
  if (shape === 'diamond') return <path className={className} d={`M${x},${y - r - 1} L${x + r + 1},${y} L${x},${y + r + 1} L${x - r - 1},${y} Z`} />;
  if (shape === 'cross') return <path className={`${className} stroke`} d={`M${x - r},${y - r} L${x + r},${y + r} M${x + r},${y - r} L${x - r},${y + r}`} />;
  return <path className={`${className} stroke`} d={`M${x - r - 1},${y} L${x + r + 1},${y} M${x},${y - r - 1} L${x},${y + r + 1}`} />;
}

const curveStyle = (k: number) => ({ shape: SHAPES[k % SHAPES.length]!, dash: DASHES[k % DASHES.length]!, tone: TONES[k % TONES.length]! });

const TOP = 14;
const AXIS_H = 38;

/**
 * @stability beta
 */
export function VolatilitySmile(props: VolatilitySmileProps) {
  const quotes = props.curves.reduce((n, c) => n + c.points.length, 0);
  if (quotes === 0) {
    return (
      <figure className="kit-ct" aria-label={props.label} data-testid={props.testId}>
        <p className="kit-ct-empty">{props.labels?.empty ?? 'No data'}</p>
      </figure>
    );
  }
  return <Smile {...props} />;
}

function Smile({ curves, label, xKind = 'strike', reference, grid: showGrid = true, locale = 'en-IN', height = 280, legend = true, interactive = true, labels, testId }: VolatilitySmileProps) {
  const model = useMemo(() => smileGrid(curves), [curves]);
  const refX = useMemo(() => {
    if (!reference) return null;
    const d = parseDecimal(reference.x);
    if (!d) throw new RangeError(`VolatilitySmile: reference "${reference.x}" is not a decimal string`);
    return d;
  }, [reference]);
  const { ref, width } = useMeasuredWidth(640);
  const plotH = clamp(isNum(height) ? height : 280, 160, 520);
  const svgH = TOP + plotH + AXIS_H;
  const { columns, xScale, ivScale, rows } = model;

  const L = {
    x: xKind === 'strike' ? (labels?.strike ?? 'Strike') : xKind === 'delta' ? (labels?.delta ?? 'Delta') : (labels?.moneyness ?? 'Moneyness'),
    expiry: labels?.expiry ?? 'Expiry',
    iv: labels?.iv ?? 'Implied volatility',
    noQuote: labels?.noQuote ?? 'no quote',
  };
  const xFormat = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: xScale, maximumFractionDigits: xScale }), [locale, xScale]);
  const ivFormat = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: ivScale, maximumFractionDigits: ivScale }), [locale, ivScale]);
  const axisFormat = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);
  const xText = (x: bigint) => xFormat.format(decimalText(x, xScale, xScale) as `${number}`);
  const ivText = (iv: bigint) => `${ivFormat.format(decimalText(iv, ivScale, ivScale) as `${number}`)}%`;
  const ivSpoken = (iv: bigint) => `${ivFormat.format(decimalText(iv, ivScale, ivScale) as `${number}`)} percent`;

  const n = columns.length;
  const xNum = (x: bigint) => ratioNumber(x, pow10(xScale));
  const ivNum = (v: bigint) => ratioNumber(v, pow10(ivScale));
  const xs = columns.map(xNum);
  const refNum = refX ? ratioNumber(refX.units, pow10(refX.scale)) : null;
  const xAll = refNum === null ? xs : [...xs, refNum];
  const xLo = Math.min(...xAll);
  const xHi = Math.max(...xAll);
  const xPad = (xHi - xLo) * 0.04;
  const ivLo = ivNum(model.min ?? 0n);
  const ivHi = ivNum(model.max ?? 0n);
  const yPad = (ivHi - ivLo || ivHi || 1) * 0.12;
  const yTicks = niceTicks(Math.max(0, ivLo - yPad), ivHi + yPad, Math.max(3, Math.round(plotH / 52)));
  const yTexts = yTicks.ticks.map((t) => `${axisFormat.format(t)}%`);
  const axisW = Math.min(80, Math.max(...yTexts.map((t) => t.length)) * 7 + 12);
  const x0 = 8;
  // The curves end at x1; their end labels sit in the 64px gutter between x1 and the y axis text.
  const xr = Math.max(x0 + 144, width - axisW);
  const x1 = xr - 64;
  const xEdge = xLo - xPad;
  const xSpan = xHi + xPad - xEdge || 1;
  const xOf = (v: number) => x0 + ((v - xEdge) / xSpan) * (x1 - x0);
  const yOf = (v: number) => TOP + plotH - ((v - yTicks.lo) / (yTicks.hi - yTicks.lo || 1)) * plotH;
  // x labels no closer than about 64px: thin to every k-th.
  const gap = n > 1 ? ((x1 - x0) / xSpan) * Math.min(...xs.slice(1).map((v, i) => v - xs[i]!)) : 64;
  const every = Math.max(1, Math.ceil(64 / Math.max(1, gap)));
  const labelled = columns.map((_, i) => i).filter((i) => (n - 1 - i) % every === 0);

  const spokenAt = (i: number) => {
    const x = columns[i]!;
    const parts = rows.map((r) => `${r.curve.label} ${r.cells[i]!.iv === null ? L.noQuote : ivSpoken(r.cells[i]!.iv!)}`);
    return `${L.x} ${xText(x)}: ${parts.join(', ')}`;
  };
  const caption = labels?.gridCaption?.({ label, x: L.x.toLowerCase() }) ?? `${label}, ${L.iv.toLowerCase()} by expiry and ${L.x.toLowerCase()}`;

  const hi = model.max === null ? '' : ivSpoken(model.max);
  const lo = model.min === null ? '' : ivSpoken(model.min);
  const summary = `${label}: ${L.iv.toLowerCase()} for ${curves.length} ${curves.length === 1 ? 'expiry' : 'expiries'} across ${n} ${L.x.toLowerCase()} ${n === 1 ? 'value' : 'values'}, from ${lo} to ${hi}. Each ${L.x.toLowerCase()} is listed with every expiry's value.`;

  const indexAt = (e: PointerEvent<HTMLDivElement>): number => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = 0;
    let dist = Infinity;
    xs.forEach((v, i) => {
      const d = Math.abs(xOf(v) - px);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  };

  const dataTable = (
    <table className="pu-vs-table">
      <caption className={showGrid ? 'pu-vs-caption' : undefined}>{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className="pu-vs-corner">{L.expiry}</th>
          {columns.map((x) => (
            <th key={x.toString()} scope="col" className="pu-vs-xh">{xText(x)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, k) => (
          <tr key={r.curve.key}>
            <th scope="row" className="pu-vs-rh"><i className={`pu-vs-key ${curveStyle(k).tone} ${curveStyle(k).shape}`} aria-hidden="true" />{r.curve.label}</th>
            {r.cells.map((c, i) => (
              <td key={columns[i]!.toString()} className="pu-vs-cell" data-band={c.band} data-empty={c.iv === null ? '' : undefined}>
                {c.iv === null ? <span className="pu-vs-none">{L.noQuote}</span> : ivText(c.iv)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartA11yShell
      className="kit-ct pu-vs"
      label={label}
      roleDescription="volatility smile chart"
      count={n}
      testId={testId}
      interactive={interactive}
      hint={labels?.hint ?? `Use the left and right arrow keys to move between ${L.x.toLowerCase()} values, Home and End to jump to the lowest and highest.`}
      summary={summary}
      speak={spokenAt}
      footer={
        <>
          {legend && (
            <ul className="kit-ct-legend pu-vs-legend" aria-hidden="true">
              {rows.map((r, k) => (
                <li key={r.curve.key}>
                  <svg width="26" height="12" viewBox="0 0 26 12" focusable="false" className={`pu-vs-sw ${curveStyle(k).tone}`}>
                    <line x1="1" x2="25" y1="6" y2="6" className="pu-vs-curve" strokeDasharray={curveStyle(k).dash || undefined} />
                    <Marker shape={curveStyle(k).shape} x={13} y={6} className="pu-vs-mark" />
                  </svg>
                  {r.curve.label}
                </li>
              ))}
            </ul>
          )}
          {showGrid && (
            <div className="pu-vs-box">
              {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll region must be focusable so the keyboard can scroll it (WCAG 2.1.1). */}
              <div className="pu-vs-scroll" role="region" aria-label={caption} tabIndex={0}>{dataTable}</div>
            </div>
          )}
        </>
      }
      table={showGrid ? null : <ChartDataTable caption={caption} head={[L.x, ...rows.map((r) => r.curve.label)]} rows={columns.map((x, i) => ({ key: x.toString(), head: xText(x), cells: rows.map((r) => (r.cells[i]!.iv === null ? L.noQuote : ivText(r.cells[i]!.iv!))) }))} />}
    >
      {({ index, pointerTo, plotProps }) => (
        <div ref={ref} className="kit-ct-area" style={{ height: svgH }}>
          {/* The plot is the one focus stop: arrow keys move through the strikes, the pointer reads one. */}
          {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
          <div className="kit-ct-plot" {...plotProps((e) => pointerTo(indexAt(e)))}>
            <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false">
              {yTicks.ticks.map((t, k) => (
                <g key={t}>
                  <line className="kit-ct-grid" x1={x0} x2={xr} y1={yOf(t)} y2={yOf(t)} />
                  <text className="kit-ct-axis" x={xr + 8} y={yOf(t)} dominantBaseline="middle">{yTexts[k]}</text>
                </g>
              ))}
              {index !== null && <line className="pu-vs-cursor" x1={xOf(xs[index]!)} x2={xOf(xs[index]!)} y1={TOP} y2={TOP + plotH} />}
              {refNum !== null && (
                <g className="pu-vs-ref">
                  <line x1={xOf(refNum)} x2={xOf(refNum)} y1={TOP} y2={TOP + plotH} />
                  <text x={clamp(xOf(refNum), x0 + 20, x1 - 20)} y={TOP + 10} textAnchor="middle">{reference!.label}</text>
                </g>
              )}
              {rows.map((r, k) => {
                const s = curveStyle(k);
                const pts = r.cells.flatMap((c, i) => (c.iv === null ? [] : [{ x: xOf(xs[i]!), y: yOf(ivNum(c.iv)), i }]));
                const last = pts[pts.length - 1];
                return (
                  <g key={r.curve.key} className={`pu-vs-c ${s.tone}`} data-testid={testId ? `${testId}-${r.curve.key}` : undefined}>
                    <path className="pu-vs-curve" fill="none" strokeDasharray={s.dash || undefined} d={pts.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />
                    {pts.map((p) => (
                      <Marker key={p.i} shape={s.shape} x={p.x} y={p.y} className={`pu-vs-mark${index === p.i ? ' on' : ''}`} />
                    ))}
                    {last && r.curve.label.length <= 9 && <text className="pu-vs-end" x={last.x + 8} y={last.y} dominantBaseline="middle">{r.curve.label}</text>}
                  </g>
                );
              })}
              {labelled.map((i) => (
                <text key={i} className="kit-ct-axis" x={clamp(xOf(xs[i]!), x0 + 14, x1 - 14)} y={TOP + plotH + 16} textAnchor="middle">{xText(columns[i]!)}</text>
              ))}
              <text className="kit-ct-axis pu-vs-axis-title" x={(x0 + x1) / 2} y={svgH - 4} textAnchor="middle">{L.x}</text>
            </svg>
            {index !== null && (
              <ChartTooltip x={xOf(xs[index]!)} width={width} testId={testId ? `${testId}-tip` : undefined}>
                <b>{L.x} {xText(columns[index]!)}</b>
                <dl>
                  {rows.map((r) => (
                    <div key={r.curve.key}><dt>{r.curve.label}</dt><dd>{r.cells[index]!.iv === null ? L.noQuote : ivText(r.cells[index]!.iv!)}</dd></div>
                  ))}
                </dl>
              </ChartTooltip>
            )}
          </div>
        </div>
      )}
    </ChartA11yShell>
  );
}
