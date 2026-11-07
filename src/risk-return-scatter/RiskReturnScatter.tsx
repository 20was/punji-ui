'use client';

/**
 * RiskReturnScatter (design.punji.app/components/risk-return-scatter): risk (volatility or standard deviation, across)
 * against return (up) for a handful of funds, assets or portfolios. Every point is labelled by name; labels that
 * would overlap are pushed apart vertically with `spreadLabels` (only labels that share horizontal space are moved) and
 * joined to their point by a short leader line. Optional quadrant guides split the plot at a benchmark, your own
 * numbers, or the average of the points, and name the four corners in words ("Higher return, lower risk"). An
 * optional benchmark point and an optional efficient-frontier line (dashed) are drawn from numbers you supply: this
 * component computes neither. Groups differ by marker shape as well as being listed in the legend, and the benchmark is
 * a diamond, so colour is never the only cue.
 *
 * Risk and return are percent numbers in the same period basis (both annualised, say) and are display maths on floats,
 * not exact money.
 *
 * Accessible alternative: ChartA11yShell (one focus stop, arrows/Home/End/Escape through the points in order of risk,
 * live region, spoken summary, hidden table of name, risk, return, return per unit of risk and quadrant).
 */
import type { PointerEvent, ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable, type ChartA11yContext } from '../chart-a11y/ChartA11yShell.tsx';
import { labelClusters, niceTicks, spreadLabels } from '../chart-math/chartMath.ts';
import { ChartTooltip, clamp, isNum, useMeasuredWidth } from '../internal/chartFrame.tsx';
import { signedPercent } from '../internal/heat.ts';

export interface RiskReturnPoint {
  /** Stable key (test ids, React keys). */
  key: string;
  /** The name printed beside the point and used in the table. */
  label: string;
  /** A shorter name for the chart when `label` is long; the table keeps `label`. */
  shortLabel?: string;
  /** Risk in percent (standard deviation or volatility), 0 or more. */
  riskPct: number;
  /** Return in percent, on the same period basis as the risk. */
  returnPct: number;
  /** A group name (an asset class). Groups get different marker shapes and a legend entry. */
  group?: string;
}

export interface RiskReturnBenchmark {
  label: string;
  riskPct: number;
  returnPct: number;
}

export interface RiskReturnFrontierPoint {
  riskPct: number;
  returnPct: number;
}

export type RiskReturnQuadrant = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export interface RiskReturnScatterLabels {
  empty?: ReactNode;
  name?: string;
  risk?: string;
  return?: string;
  ratio?: string;
  quadrant?: string;
  /** The axis titles. Defaults "Risk (standard deviation, %)" and "Return (%)". */
  riskAxis?: string;
  returnAxis?: string;
  /** The legend entry of the frontier line. Default "Efficient frontier". */
  frontier?: string;
  /** The four corners in words. Defaults "Higher return, lower risk" and so on. */
  quadrants?: Partial<Record<RiskReturnQuadrant, string>>;
  /** What the guides split at ("Benchmark", "Average of the points"). */
  guideNote?: (info: { risk: string; return: string; source: 'benchmark' | 'given' | 'average' }) => string;
  hint?: string;
  summary?: (info: { count: number; highest: string; highestReturn: string; lowest: string; lowestRisk: string; best: string; bestRatio: string }) => string;
}

export interface RiskReturnScatterProps {
  /** The points to plot. A point whose risk or return is not a finite number (or whose risk is negative) is skipped. */
  points: readonly RiskReturnPoint[];
  /** A benchmark, drawn as a diamond and used as the centre of the quadrant guides when `riskGuide`/`returnGuide` are not given. */
  benchmark?: RiskReturnBenchmark;
  /** An efficient-frontier (or any reference) line from your own numbers. Drawn dashed in order of risk. */
  frontier?: readonly RiskReturnFrontierPoint[];
  /** Draw the quadrant guides and corner words. Default true. */
  guides?: boolean;
  /** Where the vertical guide sits, in risk percent. Default: the benchmark's risk, else the average risk of the points. */
  riskGuide?: number;
  /** Where the horizontal guide sits, in return percent. Default: the benchmark's return, else the average return. */
  returnGuide?: number;
  /** Names the chart and its data table. */
  label: string;
  /** The plot's height in CSS px, clamped to 220..560. Default 340. */
  height?: number;
  /** Pass false when a parent hides the chart and gives the same figures another way. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: RiskReturnScatterLabels;
  /** Layout only (margin, grid placement). */
  className?: string;
  /** Becomes data-testid on the figure; each point's label is `${testId}-${key}`. */
  testId?: string;
}

const TOP = 20;
const BOTTOM = 40;
const CHAR = 5.8;
const pct = (v: number): string => signedPercent(v, 1);
const plain = (v: number): string => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`;
const tick = (v: number): string => `${v < 0 ? '−' : ''}${Math.abs(v)}%`;

interface Item {
  key: string;
  label: string;
  short: string;
  riskPct: number;
  returnPct: number;
  group?: string;
  benchmark: boolean;
}

/** Which corner a point is in relative to the guides: on a guide counts as the higher-return / lower-risk side, so a point is always in exactly one. Pure. */
export function quadrantOf(riskPct: number, returnPct: number, riskGuide: number, returnGuide: number): RiskReturnQuadrant {
  const high = returnPct >= returnGuide;
  const low = riskPct <= riskGuide;
  return high ? (low ? 'topLeft' : 'topRight') : low ? 'bottomLeft' : 'bottomRight';
}

const QUADRANTS: Record<RiskReturnQuadrant, string> = {
  topLeft: 'Higher return, lower risk',
  topRight: 'Higher return, higher risk',
  bottomLeft: 'Lower return, lower risk',
  bottomRight: 'Lower return, higher risk',
};

/** Return per unit of risk; `null` when risk is not above zero. */
export const returnPerRisk = (riskPct: number, returnPct: number): number | null => (riskPct > 0 ? returnPct / riskPct : null);

const cut = (s: string, max: number): string => (s.length > max ? `${s.slice(0, Math.max(1, max - 1))}…` : s);

/**
 * @stability beta
 */
export function RiskReturnScatter(props: RiskReturnScatterProps) {
  const items: Item[] = props.points
    .filter((p) => isNum(p.riskPct) && isNum(p.returnPct) && p.riskPct >= 0)
    .map((p) => ({ key: p.key, label: p.label, short: p.shortLabel ?? p.label, riskPct: p.riskPct, returnPct: p.returnPct, group: p.group, benchmark: false }));
  const b = props.benchmark;
  if (b && isNum(b.riskPct) && isNum(b.returnPct) && b.riskPct >= 0) items.push({ key: 'benchmark', label: b.label, short: b.label, riskPct: b.riskPct, returnPct: b.returnPct, benchmark: true });
  if (items.length === 0) {
    return (
      <figure className={`kit-ct pu-rrs${props.className ? ` ${props.className}` : ''}`} aria-label={props.label} data-testid={props.testId}>
        <p className="kit-ct-empty">{props.labels?.empty ?? 'No data'}</p>
      </figure>
    );
  }
  items.sort((a, c) => a.riskPct - c.riskPct || a.returnPct - c.returnPct);
  return <Chart {...props} items={items} />;
}

const SHAPES = ['circle', 'square', 'triangle', 'cross'] as const;

function Marker({ shape, x, y, r, className }: { shape: 'circle' | 'square' | 'triangle' | 'cross' | 'diamond'; x: number; y: number; r: number; className: string }) {
  if (shape === 'circle') return <circle className={className} cx={x} cy={y} r={r} />;
  if (shape === 'square') return <rect className={className} x={x - r} y={y - r} width={2 * r} height={2 * r} rx={1.5} />;
  if (shape === 'triangle') return <polygon className={className} points={`${x},${y - r - 1} ${x + r + 1},${y + r} ${x - r - 1},${y + r}`} />;
  if (shape === 'cross') return <path className={`${className} stroke-only`} d={`M${x - r},${y - r}L${x + r},${y + r}M${x - r},${y + r}L${x + r},${y - r}`} />;
  return <polygon className={className} points={`${x},${y - r - 2} ${x + r + 2},${y} ${x},${y + r + 2} ${x - r - 2},${y}`} />;
}

function Chart({ items, frontier, guides = true, riskGuide, returnGuide, benchmark, label, height = 340, interactive = true, labels, className, testId }: RiskReturnScatterProps & { items: Item[] }) {
  const L = {
    name: labels?.name ?? 'Name',
    risk: labels?.risk ?? 'Risk',
    ret: labels?.return ?? 'Return',
    ratio: labels?.ratio ?? 'Return per unit of risk',
    quadrant: labels?.quadrant ?? 'Position',
    riskAxis: labels?.riskAxis ?? 'Risk (standard deviation, %)',
    retAxis: labels?.returnAxis ?? 'Return (%)',
    frontier: labels?.frontier ?? 'Efficient frontier',
    quad: { ...QUADRANTS, ...labels?.quadrants },
  };
  const plainPoints = items.filter((i) => !i.benchmark);
  const rg = isNum(riskGuide) ? riskGuide : benchmark && items.some((i) => i.benchmark) ? benchmark.riskPct : items.reduce((s, i) => s + i.riskPct, 0) / items.length;
  const tg = isNum(returnGuide) ? returnGuide : benchmark && items.some((i) => i.benchmark) ? benchmark.returnPct : items.reduce((s, i) => s + i.returnPct, 0) / items.length;
  const source: 'benchmark' | 'given' | 'average' = isNum(riskGuide) || isNum(returnGuide) ? 'given' : benchmark && items.some((i) => i.benchmark) ? 'benchmark' : 'average';
  const front = (frontier ?? []).filter((f) => isNum(f.riskPct) && isNum(f.returnPct) && f.riskPct >= 0).toSorted((a, b) => a.riskPct - b.riskPct);
  const groups = [...new Set(plainPoints.map((p) => p.group).filter((g): g is string => !!g))];
  const shapeOf = (i: Item): 'circle' | 'square' | 'triangle' | 'cross' | 'diamond' => (i.benchmark ? 'diamond' : i.group ? SHAPES[groups.indexOf(i.group) % SHAPES.length]! : 'circle');
  const quadOf = (i: Item) => L.quad[quadrantOf(i.riskPct, i.returnPct, rg, tg)];
  const ratioText = (i: Item) => {
    const r = returnPerRisk(i.riskPct, i.returnPct);
    return r === null ? '—' : r.toFixed(2);
  };
  const speakItem = (k: number) => {
    const i = items[k]!;
    return `${i.label}: ${L.ret.toLowerCase()} ${plain(i.returnPct)}, ${L.risk.toLowerCase()} ${plain(i.riskPct)}${guides ? `, ${quadOf(i)}` : ''}`;
  };
  const pool = plainPoints.length > 0 ? plainPoints : items;
  const top = pool.reduce((a, c) => (c.returnPct > a.returnPct ? c : a));
  const low = pool.reduce((a, c) => (c.riskPct < a.riskPct ? c : a));
  const ratios = pool.map((p) => ({ p, r: returnPerRisk(p.riskPct, p.returnPct) })).filter((x): x is { p: Item; r: number } => x.r !== null);
  const bestRatio = ratios.length ? ratios.reduce((a, c) => (c.r > a.r ? c : a)) : null;
  const summary = (
    labels?.summary ??
    ((i) =>
      `${label}: ${i.count} points. Highest return ${i.highest} at ${i.highestReturn}; lowest risk ${i.lowest} at ${i.lowestRisk}.${i.best ? ` Best return per unit of risk ${i.best} at ${i.bestRatio}.` : ''}`)
  )({
    count: items.length,
    highest: top.label,
    highestReturn: pct(top.returnPct),
    lowest: low.label,
    lowestRisk: plain(low.riskPct),
    best: bestRatio?.p.label ?? '',
    bestRatio: bestRatio ? bestRatio.r.toFixed(2) : '',
  });
  const guideNote = (labels?.guideNote ?? ((i) => `Guides at risk ${i.risk} and return ${i.return} (${i.source === 'benchmark' ? 'the benchmark' : i.source === 'given' ? 'your values' : 'the average of the points'}).`))({ risk: plain(rg), return: plain(tg), source });
  const { ref, width } = useMeasuredWidth(640);
  const renderPlot = (ctx: ChartA11yContext) => {
    const plotH = clamp(isNum(height) ? height : 340, 220, 560);
    const svgH = TOP + plotH + BOTTOM;
    const rVals = [...items.map((i) => i.riskPct), ...front.map((f) => f.riskPct), ...(guides ? [rg] : [])];
    const yVals = [...items.map((i) => i.returnPct), ...front.map((f) => f.returnPct), ...(guides ? [tg] : [])];
    const xt = niceTicks(Math.min(0, ...rVals), Math.max(...rVals), Math.max(3, Math.round(width / 90)));
    const yt = niceTicks(Math.min(...yVals), Math.max(...yVals), Math.max(3, Math.round(plotH / 56)));
    const axisW = Math.min(60, Math.max(...yt.ticks.map((t) => tick(t).length)) * 6.6 + 12);
    const x0 = axisW;
    const x1 = width - 12;
    const x = (v: number) => x0 + ((v - xt.lo) / (xt.hi - xt.lo || 1)) * (x1 - x0);
    const y = (v: number) => TOP + plotH - ((v - yt.lo) / (yt.hi - yt.lo || 1)) * plotH;
    const maxChars = Math.max(6, Math.floor((width - 2 * axisW) / 3 / CHAR));
    const names = items.map((i) => cut(i.short, Math.min(22, maxChars)));
    // A label sits right of its point, or left when it would run past the plot.
    const sides = items.map((i, k) => (x(i.riskPct) + 9 + names[k]!.length * CHAR > x1 + 4 ? 'end' : 'start') as 'start' | 'end');
    const ranges = items.map((i, k): [number, number] => {
      const w = names[k]!.length * CHAR;
      return sides[k] === 'start' ? [x(i.riskPct) + 9, x(i.riskPct) + 9 + w] : [x(i.riskPct) - 9 - w, x(i.riskPct) - 9];
    });
    const labelY = items.map((i) => y(i.returnPct));
    for (const cluster of labelClusters(ranges, 4)) {
      if (cluster.length < 2) continue;
      const placed = spreadLabels(cluster.map((k) => labelY[k]!), 14, TOP + 6, TOP + plotH - 6);
      cluster.forEach((k, j) => { labelY[k] = placed[j]!; });
    }
    const idx = ctx.index;
    const onPointer = (e: PointerEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      let best = -1;
      let dist = 30;
      items.forEach((i, k) => {
        const d = Math.hypot(x(i.riskPct) - px, y(i.returnPct) - py);
        if (d < dist) {
          dist = d;
          best = k;
        }
      });
      ctx.pointerTo(best < 0 ? null : best);
    };
    const gx = x(rg);
    const gy = y(tg);
    const corner = (q: RiskReturnQuadrant, anchor: 'start' | 'end', cx: number, cy: number) => (
      <text key={q} className="pu-rrs-quad" x={cx} y={cy} textAnchor={anchor}>{L.quad[q]}</text>
    );
    return (
      <div ref={ref} className="kit-ct-area" style={{ height: svgH }}>
        {/* The plot is the one focus stop: arrow keys move through the points in order of risk. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div className="kit-ct-plot" {...ctx.plotProps(onPointer)}>
          <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false">
            <text className="kit-ct-axis pu-rrs-title" x={x0} y={11} textAnchor="start">{L.retAxis}</text>
            {yt.ticks.map((t) => (
              <g key={t}>
                <line className={`kit-ct-grid${t === 0 ? ' base' : ''}`} x1={x0} x2={x1} y1={y(t)} y2={y(t)} />
                <text className="kit-ct-axis" x={x0 - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">{tick(t)}</text>
              </g>
            ))}
            {xt.ticks.map((t) => (
              <g key={t}>
                <line className="kit-ct-grid" x1={x(t)} x2={x(t)} y1={TOP} y2={TOP + plotH} />
                <text className="kit-ct-axis" x={x(t)} y={TOP + plotH + 15} textAnchor="middle">{tick(t)}</text>
              </g>
            ))}
            <text className="kit-ct-axis pu-rrs-title" x={(x0 + x1) / 2} y={svgH - 4} textAnchor="middle">{L.riskAxis}</text>
            {guides && (
              <g>
                <line className="pu-rrs-guide" x1={gx} x2={gx} y1={TOP} y2={TOP + plotH} />
                <line className="pu-rrs-guide" x1={x0} x2={x1} y1={gy} y2={gy} />
                {corner('topLeft', 'start', x0 + 6, TOP + 12)}
                {corner('topRight', 'end', x1 - 6, TOP + 12)}
                {corner('bottomLeft', 'start', x0 + 6, TOP + plotH - 6)}
                {corner('bottomRight', 'end', x1 - 6, TOP + plotH - 6)}
              </g>
            )}
            {front.length > 1 && <path className="pu-rrs-frontier" d={`M${front.map((f) => `${x(f.riskPct).toFixed(1)},${y(f.returnPct).toFixed(1)}`).join('L')}`} fill="none" />}
            {items.map((i, k) => {
              const moved = Math.abs(labelY[k]! - y(i.returnPct)) > 3;
              const px = x(i.riskPct);
              const lit = idx === k;
              return (
                <g key={i.key} data-testid={testId ? `${testId}-${i.key}` : undefined}>
                  {moved && <line className="pu-rrs-lead" x1={px + (sides[k] === 'start' ? 5 : -5)} y1={y(i.returnPct)} x2={px + (sides[k] === 'start' ? 8 : -8)} y2={labelY[k]!} />}
                  <Marker shape={shapeOf(i)} x={px} y={y(i.returnPct)} r={lit ? 7 : 5} className={`pu-rrs-pt${i.benchmark ? ' benchmark' : ''}${lit ? ' lit' : ''}`} />
                  <text className={`pu-rrs-name${lit ? ' lit' : ''}${i.benchmark ? ' benchmark' : ''}`} x={px + (sides[k] === 'start' ? 10 : -10)} y={labelY[k]!} textAnchor={sides[k]} dominantBaseline="middle">{names[k]}</text>
                </g>
              );
            })}
          </svg>
          {idx !== null && (
            <ChartTooltip x={x(items[idx]!.riskPct)} width={width} testId={testId ? `${testId}-tip` : undefined}>
              <b>{items[idx]!.label}</b>
              <dl>
                <div><dt>{L.ret}</dt><dd>{pct(items[idx]!.returnPct)}</dd></div>
                <div><dt>{L.risk}</dt><dd>{plain(items[idx]!.riskPct)}</dd></div>
                {guides && <div><dt>{L.quadrant}</dt><dd>{quadOf(items[idx]!)}</dd></div>}
              </dl>
            </ChartTooltip>
          )}
        </div>
      </div>
    );
  };
  return (
    <ChartA11yShell
      className={`kit-ct pu-rrs${className ? ` ${className}` : ''}`}
      label={label}
      roleDescription="scatter chart"
      count={items.length}
      testId={testId}
      interactive={interactive}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between points in order of risk, Home and End to jump to the lowest and highest risk.'}
      summary={summary}
      speak={speakItem}
      footer={
        <>
          {(groups.length > 0 || front.length > 1 || items.some((i) => i.benchmark)) && (
            <ul className="kit-ct-legend pu-rrs-legend" aria-hidden="true">
              {groups.map((g, k) => (
                <li key={g}><svg width="14" height="14" aria-hidden="true"><Marker shape={SHAPES[k % SHAPES.length]!} x={7} y={7} r={4} className="pu-rrs-pt" /></svg>{g}</li>
              ))}
              {items.filter((i) => i.benchmark).map((i) => (
                <li key={i.key}><svg width="14" height="14" aria-hidden="true"><Marker shape="diamond" x={7} y={7} r={3} className="pu-rrs-pt benchmark" /></svg>{i.label}</li>
              ))}
              {front.length > 1 && <li><svg width="22" height="10" aria-hidden="true"><line className="pu-rrs-sw" x1="1" x2="21" y1="5" y2="5" /></svg>{L.frontier}</li>}
            </ul>
          )}
          {guides && <p className="pu-rrs-note">{guideNote}</p>}
        </>
      }
      table={
        <ChartDataTable
          caption={label}
          head={[L.name, L.risk, L.ret, L.ratio, ...(guides ? [L.quadrant] : [])]}
          rows={items.map((i) => ({ key: i.key, head: i.label, cells: [plain(i.riskPct), pct(i.returnPct), ratioText(i), ...(guides ? [quadOf(i)] : [])] }))}
          note={guides ? <p>{guideNote}</p> : undefined}
        />
      }
    >
      {renderPlot}
    </ChartA11yShell>
  );
}
