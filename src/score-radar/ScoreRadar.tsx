'use client';

/**
 * ScoreRadar (design.punji.app/components/score-radar): a radar of 3 to 8 scores, each from 0 to a maximum, drawn as one
 * filled shape. The shape is coloured by the total on a low / middle / high token scale (loss, warn, gain), and colour is
 * never the only cue: every axis prints its number beside its name, the total is printed under the chart and spoken in
 * the summary, and a word (Weak, Mixed, Strong) says which band the total is in. An optional comparison shape (a sector
 * average, last year) is dashed. The scores come from the app: this component does not compute them, and it ships no
 * checks, criteria or axis names of its own.
 *
 * Accessible alternative: ChartA11yShell (one focus stop, arrows/Home/End/Escape across the axes, live region, spoken
 * summary, hidden table of axis, score, maximum and comparison). With `selected` or `onSelectedChange`, Enter or Space
 * (or a click) selects the axis under the cursor.
 */
import type { KeyboardEvent, PointerEvent } from 'react';

import { ChartA11yShell, ChartDataTable } from '../chart-a11y/ChartA11yShell.tsx';
import { ChartTooltip, isNum, useMeasuredWidth } from '../internal/chartFrame.tsx';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';
import { axisVector, radarLayout } from './layout.ts';

export interface ScoreAxis {
  /** Stable key for the axis (used by `selected`). */
  key: string;
  /** The axis name, on the chart and in the table. Long names wrap to two lines and are cut with an ellipsis; the table keeps them whole. */
  label: string;
  /** The score, 0 to the axis maximum. Out-of-range values are clamped; a non-number counts as 0. */
  score: number;
  /** This axis's maximum when it differs from the chart's `max`. */
  max?: number;
  /** The comparison shape's score on this axis. */
  comparison?: number;
}

export type ScoreBand = 'low' | 'mid' | 'high';

export interface ScoreRadarLabels {
  empty?: string;
  axis?: string;
  score?: string;
  max?: string;
  /** Names the comparison shape ("Sector average"). Default "Comparison". */
  comparison?: string;
  total?: string;
  /** The words for the three bands of the total. Defaults Weak, Mixed, Strong. */
  low?: string;
  mid?: string;
  high?: string;
  selected?: string;
  hint?: string;
  selectHint?: string;
  summary?: (info: { total: string; totalMax: string; strongest: string; strongestScore: string; weakest: string; weakestScore: string; band: string }) => string;
}

export interface ScoreRadarProps {
  /** 3 to 8 axes, clockwise from the top. More than 8 are ignored; fewer than 3 show the empty message. */
  axes: readonly ScoreAxis[];
  /** Names the chart and its data table. */
  label: string;
  /** The maximum score of an axis that does not set its own. Default 6. */
  max?: number;
  /** Selected axis key (controlled). `null` for none. Passing this or `onSelectedChange` turns selection on. */
  selected?: string | null;
  /** The axis selected at first when `selected` is not given (uncontrolled). */
  defaultSelected?: string | null;
  /** Called with the axis key when the selection changes, or null when it is cleared. */
  onSelectedChange?: (key: string | null) => void;
  /** Pass false when a parent hides the chart and gives the same figures another way. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: ScoreRadarLabels;
  /** Layout only (margin, grid placement). */
  className?: string;
  /** Becomes data-testid on the figure; each axis label gets `${testId}-${key}`. */
  testId?: string;
}

export interface ScoreRadarReading {
  /** Scores clamped to 0..max, rounded to 2 decimals. */
  scores: number[];
  maxes: number[];
  total: number;
  totalMax: number;
  band: ScoreBand;
  strongest: number;
  weakest: number;
}

const clampScore = (v: unknown, max: number): number => (isNum(v) ? Math.round(Math.min(max, Math.max(0, v)) * 100) / 100 : 0);
const fmt = (v: number): string => String(Math.round(v * 100) / 100);

/** The band of a total: under a third of the maximum is low, under two thirds is mid, else high. */
export function scoreBand(total: number, totalMax: number): ScoreBand {
  const f = totalMax > 0 ? total / totalMax : 0;
  return f < 1 / 3 ? 'low' : f < 2 / 3 ? 'mid' : 'high';
}

/** The numbers the chart prints and speaks. Pure; `max` defaults to 6. */
export function scoreRadarReading(axes: readonly ScoreAxis[], max = 6): ScoreRadarReading {
  const m = isNum(max) && max > 0 ? max : 6;
  const maxes = axes.map((a) => (isNum(a.max) && a.max > 0 ? a.max : m));
  const scores = axes.map((a, i) => clampScore(a.score, maxes[i]!));
  const total = Math.round(scores.reduce((s, v) => s + v, 0) * 100) / 100;
  const totalMax = Math.round(maxes.reduce((s, v) => s + v, 0) * 100) / 100;
  let strongest = 0;
  let weakest = 0;
  scores.forEach((v, i) => {
    if (v > scores[strongest]!) strongest = i;
    if (v < scores[weakest]!) weakest = i;
  });
  return { scores, maxes, total, totalMax, band: scoreBand(total, totalMax), strongest, weakest };
}

/**
 * @stability beta
 */
export function ScoreRadar(props: ScoreRadarProps) {
  if (props.axes.length < 3) {
    return (
      <figure className={`kit-ct pu-sr${props.className ? ` ${props.className}` : ''}`} aria-label={props.label} data-testid={props.testId}>
        <p className="kit-ct-empty">{props.labels?.empty ?? 'At least 3 scores are needed'}</p>
      </figure>
    );
  }
  return <Radar {...props} axes={props.axes.slice(0, 8)} />;
}

function Radar({ axes, label, max = 6, selected, defaultSelected, onSelectedChange, interactive = true, labels, className, testId }: ScoreRadarProps) {
  const n = axes.length;
  const selectable = selected !== undefined || defaultSelected !== undefined || onSelectedChange !== undefined;
  const [pick, setPick] = useControllableState<string | null>({ value: selected, defaultValue: defaultSelected ?? null, onChange: onSelectedChange, name: 'ScoreRadar selected' });
  const read = scoreRadarReading(axes, max);
  const hasCompare = axes.some((a) => isNum(a.comparison));
  const L = {
    axis: labels?.axis ?? 'Axis',
    score: labels?.score ?? 'Score',
    max: labels?.max ?? 'Maximum',
    compare: labels?.comparison ?? 'Comparison',
    total: labels?.total ?? 'Total',
    selected: labels?.selected ?? 'selected',
    band: { low: labels?.low ?? 'Weak', mid: labels?.mid ?? 'Mixed', high: labels?.high ?? 'Strong' },
  };
  const { ref, width } = useMeasuredWidth(360);
  const layout = radarLayout(width, axes.map((a) => a.label), read.scores.map((s, i) => `${fmt(s)}/${fmt(read.maxes[i]!)}`));
  const { r, view } = layout;
  const rings = read.maxes.every((m) => m === read.maxes[0]) && read.maxes[0]! <= 8 && Number.isInteger(read.maxes[0]) ? read.maxes[0]! : 4;
  const poly = (f: (i: number) => number) =>
    axes.map((_, i) => {
      const u = axisVector(i, n);
      return `${(u.x * r * f(i)).toFixed(1)},${(u.y * r * f(i)).toFixed(1)}`;
    });
  const frac = (i: number) => read.scores[i]! / read.maxes[i]!;
  const cmpFrac = (i: number) => clampScore(axes[i]!.comparison, read.maxes[i]!) / read.maxes[i]!;
  const totalText = `${fmt(read.total)} of ${fmt(read.totalMax)}`;
  const strong = axes[read.strongest]!;
  const weak = axes[read.weakest]!;
  const summary = (
    labels?.summary ??
    ((i) => `${L.total} ${i.total} of ${i.totalMax}; strongest ${i.strongest} ${i.strongestScore}, weakest ${i.weakest} ${i.weakestScore}.`)
  )({
    total: fmt(read.total),
    totalMax: fmt(read.totalMax),
    strongest: strong.label,
    strongestScore: fmt(read.scores[read.strongest]!),
    weakest: weak.label,
    weakestScore: fmt(read.scores[read.weakest]!),
    band: L.band[read.band],
  });
  const cmpText = (i: number) => (isNum(axes[i]!.comparison) ? fmt(clampScore(axes[i]!.comparison, read.maxes[i]!)) : undefined);
  const speakAxis = (i: number) =>
    `${axes[i]!.label} ${fmt(read.scores[i]!)} of ${fmt(read.maxes[i]!)}${cmpText(i) ? `, ${L.compare} ${cmpText(i)}` : ''}${selectable && pick === axes[i]!.key ? `, ${L.selected}` : ''}`;
  const toggle = (i: number) => {
    const key = axes[i]!.key;
    setPick(pick === key ? null : key);
  };
  const nearest = (e: PointerEvent<HTMLDivElement>): number | null => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - rect.left + view.x;
    const dy = e.clientY - rect.top + view.y;
    if (Math.hypot(dx, dy) < 6) return null;
    const a = (Math.atan2(dx, -dy) + 2 * Math.PI) % (2 * Math.PI);
    return Math.round(a / ((2 * Math.PI) / n)) % n;
  };
  return (
    <ChartA11yShell
      className={`kit-ct pu-sr${className ? ` ${className}` : ''}`}
      label={label}
      roleDescription="radar chart"
      count={n}
      testId={testId}
      interactive={interactive}
      dataAttrs={{ 'data-band': read.band }}
      hint={`${labels?.hint ?? 'Use the left and right arrow keys to move between axes, Home and End to jump to the first and last.'}${selectable ? ` ${labels?.selectHint ?? 'Press Enter or Space to select an axis.'}` : ''}`}
      summary={summary}
      speak={speakAxis}
      footer={
        <>
          <p className={`pu-sr-total ${read.band}`}>
            <span className="pu-sr-total-name">{L.total}</span> <b>{fmt(read.total)}</b> <span>of {fmt(read.totalMax)}</span>
            <span className="pu-sr-band">{read.band === 'high' ? '▲ ' : read.band === 'low' ? '▼ ' : '● '}{L.band[read.band]}</span>
          </p>
          {hasCompare && (
            <ul className="kit-ct-legend pu-sr-legend" aria-hidden="true">
              <li><svg width="22" height="10" aria-hidden="true"><rect className={`pu-sr-sw ${read.band}`} x="1" y="1" width="20" height="8" rx="2" /></svg>{L.total}</li>
              <li><svg width="22" height="10" aria-hidden="true"><line className="pu-sr-sw-dash" x1="1" x2="21" y1="5" y2="5" /></svg>{L.compare}</li>
            </ul>
          )}
        </>
      }
      table={
        <ChartDataTable
          caption={label}
          head={hasCompare ? [L.axis, L.score, L.max, L.compare] : [L.axis, L.score, L.max]}
          rows={axes.map((a, i) => ({
            key: a.key,
            head: a.label,
            cells: hasCompare ? [fmt(read.scores[i]!), fmt(read.maxes[i]!), cmpText(i) ?? '—'] : [fmt(read.scores[i]!), fmt(read.maxes[i]!)],
          }))}
          note={<p>{`${L.total}: ${totalText}`}</p>}
        />
      }
    >
      {(ctx) => {
        const props = ctx.plotProps((e) => ctx.pointerTo(nearest(e)));
        const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
          props.onKeyDown?.(e);
          if (selectable && ctx.index !== null && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggle(ctx.index);
          }
        };
        const idx = ctx.index;
        return (
          <div className="kit-ct-area pu-sr-area" ref={ref}>
            {/* The plot is the one focus stop: arrows move across the axes, Enter selects when selection is on. */}
            {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div
              className={`kit-ct-plot pu-sr-plot${selectable ? ' selectable' : ''}`}
              {...props}
              onKeyDown={interactive ? onKeyDown : undefined}
              onClick={interactive && selectable ? (e) => { const i = nearest(e as unknown as PointerEvent<HTMLDivElement>); if (i !== null) toggle(i); } : undefined}
              style={{ width: view.w, maxWidth: '100%', height: view.h, marginInline: 'auto' }}
            >
              <svg width={view.w} height={view.h} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} aria-hidden="true" focusable="false">
                {Array.from({ length: rings }, (_, k) => {
                  const f = (k + 1) / rings;
                  return <polygon key={k} className={`kit-ct-grid${k === rings - 1 ? ' base' : ''}`} fill="none" points={poly(() => f).join(' ')} />;
                })}
                {axes.map((a, i) => (
                  <line key={a.key} className={`pu-sr-spoke${pick === a.key ? ' on' : ''}${idx === i ? ' lit' : ''}`} x1={0} y1={0} x2={layout.boxes[i]!.tip.x} y2={layout.boxes[i]!.tip.y} />
                ))}
                {hasCompare && <polygon className="pu-sr-compare" points={poly(cmpFrac).join(' ')} />}
                <polygon className={`pu-sr-shape ${read.band}`} points={poly(frac).join(' ')} data-testid={testId ? `${testId}-shape` : undefined} />
                {axes.map((a, i) => {
                  const u = axisVector(i, n);
                  return <circle key={a.key} className={`pu-sr-dot ${read.band}${pick === a.key || idx === i ? ' on' : ''}`} cx={u.x * r * frac(i)} cy={u.y * r * frac(i)} r={pick === a.key || idx === i ? 5 : 3.5} />;
                })}
                {axes.map((a, i) => {
                  const b = layout.boxes[i]!;
                  return (
                    <text key={a.key} className={`pu-sr-label${pick === a.key ? ' selected' : ''}${idx === i ? ' lit' : ''}`} textAnchor={b.anchor} data-testid={testId ? `${testId}-${a.key}` : undefined} data-selected={pick === a.key ? 'true' : undefined}>
                      {b.lines.map((line, k) => (
                        <tspan key={k} x={b.tx} y={b.ty + k * 13} className={k === b.lines.length - 1 ? 'pu-sr-num' : undefined}>{line}</tspan>
                      ))}
                    </text>
                  );
                })}
              </svg>
              {idx !== null && (
                <ChartTooltip x={layout.boxes[idx]!.tip.x - view.x} width={view.w} testId={testId ? `${testId}-tip` : undefined}>
                  <b>{axes[idx]!.label}</b>
                  <dl>
                    <div><dt>{L.score}</dt><dd>{fmt(read.scores[idx]!)} / {fmt(read.maxes[idx]!)}</dd></div>
                    {cmpText(idx) && <div><dt>{L.compare}</dt><dd>{cmpText(idx)}</dd></div>}
                  </dl>
                </ChartTooltip>
              )}
            </div>
          </div>
        );
      }}
    </ChartA11yShell>
  );
}
