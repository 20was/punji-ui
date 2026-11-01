/**
 * Bars that show a figure's size (design.punji.app/components/meter):
 *
 *   MeterBar   one track with parts laid end to end (a gain and its
 *              dividends; proceeds and what fees take) and an optional
 *              marker (where a benchmark sits on the same scale).
 *   RangeBar   where a value sits between other values on one track:
 *              a filled part up to it, strong and accent marks, and each
 *              mark's label placed under the mark (never pushed to an edge
 *              it does not belong to; a label near an end stays inside).
 *   ShareBar   shares of one whole as one stacked bar and a two-column
 *              legend; a legend item can be a button (filter, open).
 *   ShareDonut the same shares as a ring with a count in the middle.
 *   DistributionBar  a ShareBar of counts on a five-step scale (how many
 *              sit at each step): the scale's tints, a one-column legend
 *              with each count, and a line under it for what the bar
 *              leaves out.
 *
 * MeterBar and RangeBar are decorative by default (aria-hidden): the figures
 * they draw must be printed in words beside them, or the caller gives `label`
 * for an img role. ShareBar, ShareDonut and DistributionBar need a `label`.
 * A tone is never the only carrier of meaning: every share has a legend row
 * with its name and value.
 */
import type { CSSProperties, ReactNode } from 'react';

import { rangeLabelRows, textLen } from '../internal/rangeLabels.ts';

/** A step on a five-step scale, lowest 0 to highest 4. */
export type ScaleStep = 0 | 1 | 2 | 3 | 4;

/** The scale's steps are tones too: scale0 (lowest) to scale4 (highest). */
export type MeterTone = 'neutral' | 'gain' | 'loss' | 'chart' | 'series2' | 'series3' | 'series4' | 'series5' | 'series6' | 'series7' | 'series8' | 'series9' | 'series10' | 'series11' | 'series12' | 'rest' | 'strong' | `scale${ScaleStep}`;

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function MeterBar({ parts, max, marker, label, testId }: {
  /** The segments laid end to end: each a `value` on the scale and a `tone`. */
  parts: readonly { value: number; tone: MeterTone }[];
  /** The scale's whole (default: the parts' sum). */
  max?: number;
  /** Where a marker sits, on the same scale. */
  marker?: number | null;
  /** Names the bar (an img); without it the bar is decorative. */
  label?: string;
  /** Sets `data-testid` on the bar. */
  testId?: string;
}) {
  const whole = max ?? parts.reduce((n, p) => n + Math.max(0, p.value), 0);
  const pct = (v: number) => (whole > 0 && Number.isFinite(v) ? clamp((Math.max(0, v) / whole) * 100) : 0);
  const marked = finite(marker);
  return (
    <span className={`kit-meter${marked ? ' marked' : ''}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} data-testid={testId}>
      {parts.map((p, i) => (
        <i key={i} className={`kit-tone-${p.tone}`} style={{ width: `${pct(p.value)}%` }} />
      ))}
      {marked && <b style={{ insetInlineStart: `${pct(marker)}%` }} />}
    </span>
  );
}

export interface RangeMark {
  /** Where the mark sits, on the same scale as the domain. */
  value: number;
  /**
   * strong: the value itself (a price); accent: a reference (an alert); dot: the value as a round mark among
   * others (a company among its peers); tick: a quiet reference (a median); edge: a label only, at an end.
   */
  kind: 'strong' | 'accent' | 'dot' | 'tick' | 'edge';
  /** Printed under the mark. Hidden when the bar has a `label` of its own. */
  label?: ReactNode;
}

export function RangeBar({ head, fill, span, marks = [], domain, label, legend, testId }: {
  /** The row over the track: what the two ends or the two values are. */
  head?: ReactNode;
  /** The track fills up to this value. */
  fill?: number | null;
  /** The track is filled between these two values (a month's low and high) instead of from the start; give the domain so rows share one scale. */
  span?: readonly [number, number];
  /** The marks on the track, each a value, a kind and an optional label. */
  marks?: readonly RangeMark[];
  /** The track's ends; default: the smallest and largest of fill, span and marks. */
  domain?: readonly [number, number];
  /** Names the bar (an img) with its figures in words; without it the bar is decorative, so print the figures in `head` or beside it. */
  label?: string;
  /** Three labels in fixed places under the track (the low end, the middle, the high end), instead of labels under the marks. */
  legend?: readonly [ReactNode, ReactNode, ReactNode];
  /** Sets `data-testid` on the bar. */
  testId?: string;
}) {
  const values = [fill, ...(span ?? []), ...marks.map((m) => m.value)].filter(finite);
  const lo = domain ? domain[0] : Math.min(...values);
  const hi = domain ? domain[1] : Math.max(...values);
  const at = (v: number) => (hi > lo ? clamp(((v - lo) / (hi - lo)) * 100) : 50);
  const labelled = marks.filter((m) => m.label !== undefined && m.label !== null);
  const labelRows = rangeLabelRows(labelled.map((m) => ({ x: at(m.value), len: textLen(m.label) })));
  const spanOk = span !== undefined && finite(span[0]) && finite(span[1]);
  return (
    <div className="kit-range" role={label ? 'img' : undefined} aria-label={label} data-testid={testId}>
      {head && <div className="kit-range-head">{head}</div>}
      <div className="kit-range-track" aria-hidden="true">
        {finite(fill) && <i style={{ width: `${at(fill)}%` }} />}
        {spanOk && (
          <i className="span" style={{ insetInlineStart: `${at(Math.min(span[0], span[1]))}%`, width: `${Math.max(at(Math.max(span[0], span[1])) - at(Math.min(span[0], span[1])), 1)}%` }} />
        )}
        {marks.map((m, i) => (m.kind === 'edge' || !finite(m.value) ? null : <b key={i} className={m.kind} style={{ insetInlineStart: `${at(m.value)}%` }} />))}
      </div>
      {legend && (
        <div className="kit-range-legend" aria-hidden={label ? true : undefined}>
          {legend.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
      {!legend && labelled.length > 0 && (
        <div className="kit-range-labels" aria-hidden={label ? true : undefined} style={{ '--rows': Math.max(...labelRows) + 1 } as CSSProperties}>
          {labelled.map((m, i) => {
            const x = at(m.value);
            // Under its mark; near an end the label slides inward so it never leaves the track.
            return (
              <span key={i} className={m.kind} style={{ insetInlineStart: `${x}%`, transform: `translateX(calc(-${x}% * var(--pu-dir, 1)))`, '--r': labelRows[i] } as CSSProperties}>
                {m.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export interface ShareItem {
  /** Unique, stable key. */
  key: string;
  /** The share's name in the legend. */
  label: ReactNode;
  /** A second line under the label (the stocks in a sector). */
  sub?: ReactNode;
  /** Share of the whole, 0 to 100. */
  pct: number;
  /** The share's colour in the bar and the legend. Use `SHARE_TONES` for distinct categories. */
  tone: MeterTone;
  /** Printed share; default: pct to one decimal. */
  value?: ReactNode;
  /** Makes the legend item a button (filter by it, open it). */
  onSelect?: () => void;
  /** With onSelect: this item is the one chosen (aria-pressed). */
  selected?: boolean;
  /** Sets `data-testid` on the legend item. */
  testId?: string;
}

function LegendItem({ s }: { s: ShareItem }) {
  const body = (
    <>
      <i className={`kit-tone-${s.tone}`} aria-hidden="true" />
      <span className="nm">
        {s.label}
        {s.sub && <span className="sub">{s.sub}</span>}
      </span>
      <b>{s.value ?? `${(Number.isFinite(s.pct) ? s.pct : 0).toFixed(1)}%`}</b>
    </>
  );
  return s.onSelect ? (
    <button type="button" className="kit-share-item" aria-pressed={s.selected} onClick={s.onSelect} data-testid={s.testId}>
      {body}
    </button>
  ) : (
    <div className="kit-share-item" data-testid={s.testId}>
      {body}
    </div>
  );
}

/** The legend's layouts: rows (beside a ShareDonut), a compact one-column list, two columns, or a grid of rows (one column on a phone, two from 768px, three from 1256px). */
export type ShareLegendLayout = 'columns' | 'rows' | 'list' | 'grid';
const LEGEND_CLASS: Record<ShareLegendLayout, string> = { columns: '', rows: ' rows one', list: ' list one', grid: ' rows grid' };

/** The legend alone, as rows (`layout="rows"`, beside a ShareDonut), a compact one-column list (`"list"`), two columns, or a grid of rows (`"grid"`, beside a wide ring). */
export function ShareLegend({ items, layout = 'columns', label }: {
  /** The shares, in legend order. */
  items: readonly ShareItem[];
  /** 'columns' (default), 'rows', 'list' or 'grid'. */
  layout?: ShareLegendLayout;
  /** Names the legend list for screen readers. */
  label?: string;
}) {
  return (
    <ul className={`kit-share-legend${LEGEND_CLASS[layout]}`} aria-label={label}>
      {items.map((s) => (
        <li key={s.key}>
          <LegendItem s={s} />
        </li>
      ))}
    </ul>
  );
}

export function ShareBar({ items, label, legend = 'columns', foot, testId }: {
  /** The shares, in bar and legend order. Each `pct` is 0 to 100. */
  items: readonly ShareItem[];
  /** Names the bar for screen readers (the shares in words). */
  label: string;
  /** The legend's layout: two columns, one compact column ('list'), a grid of rows ('grid'), or none (the caller prints its own). */
  legend?: 'columns' | 'list' | 'grid' | 'none';
  /** A quiet line under the legend: what the bar leaves out. */
  foot?: ReactNode;
  /** Sets `data-testid` on the root. */
  testId?: string;
}) {
  const drawn = items.filter((s) => s.pct > 0);
  return (
    <div className="kit-share" data-testid={testId}>
      <div className={`kit-share-bar${drawn.length === 0 ? ' empty' : ''}`} role="img" aria-label={label}>
        {drawn.map((s) => (
          <i key={s.key} className={`kit-tone-${s.tone}`} style={{ flexGrow: s.pct, flexBasis: 0 }} />
        ))}
      </div>
      {legend !== 'none' && <ShareLegend items={items} layout={legend} />}
      {foot && <p className="kit-share-foot">{foot}</p>}
    </div>
  );
}

export interface DistributionItem {
  /** Unique, stable key. */
  key: string;
  /** The step's name in the legend. */
  label: ReactNode;
  /** How many sit at this step. */
  count: number;
  /** Its step on the scale, lowest 0. */
  step: ScaleStep;
  /** The count as printed (grouped digits); default: the count. */
  value?: ReactNode;
  /** Makes the legend item a button (filter by it, open it). */
  onSelect?: () => void;
  /** With `onSelect`: this item is the one chosen (`aria-pressed`). */
  selected?: boolean;
  /** Sets `data-testid` on the legend item. */
  testId?: string;
}

/** How many sit at each step of a five-step scale: a ShareBar in the scale's tints, highest step first in the legend (two to a row once it is 560px wide). */
export function DistributionBar({ items, label, foot, testId }: {
  /** One per step, in the order the legend lists them (usually highest first). */
  items: readonly DistributionItem[];
  /** The bar's accessible name: every count in words. */
  label: string;
  /** What the bar leaves out ("21 low confidence and 12 not rated are left out"). */
  foot?: ReactNode;
  /** Sets `data-testid` on the root. */
  testId?: string;
}) {
  const total = items.reduce((n, i) => n + Math.max(0, i.count), 0);
  /* The bar runs lowest step to highest, left to right, whatever order the legend lists. */
  const bar = items.toSorted((a, b) => a.step - b.step);
  const share = (i: DistributionItem): ShareItem => ({ key: i.key, label: i.label, pct: total > 0 ? (Math.max(0, i.count) / total) * 100 : 0, tone: `scale${i.step}`, value: i.value ?? String(i.count), onSelect: i.onSelect, selected: i.selected, testId: i.testId });
  return (
    <div className="kit-dist" data-testid={testId}>
      <ShareBar items={bar.map(share)} label={label} legend="none" />
      <ShareLegend items={items.map(share)} layout="list" />
      {foot && <p className="kit-share-foot">{foot}</p>}
    </div>
  );
}

const R = 76;
const C = 2 * Math.PI * R;

/** The same shares as a ring with a count in the middle. */
export function ShareDonut({ items, count, unit, label, size, testId }: {
  /** The shares around the ring: key, `pct` (0 to 100) and tone. */
  items: readonly Pick<ShareItem, 'key' | 'pct' | 'tone'>[];
  /** Printed in the middle of the ring. */
  count?: ReactNode;
  /** A small word under the count ("holdings"). */
  unit?: ReactNode;
  /** Names the ring (the shares in words). */
  label: string;
  /** 'sm': a 120px ring, for two or three shares beside their rows. */
  size?: 'sm';
  /** Sets `data-testid` on the ring. */
  testId?: string;
}) {
  const share = (s: Pick<ShareItem, 'pct'>) => (Number.isFinite(s.pct) ? Math.max(0, s.pct) : 0) / 100;
  const slices = items.map((s, i) => ({
    key: s.key,
    tone: s.tone,
    len: Math.max(0, share(s) * C - (items.length > 1 ? 2 : 0)),
    start: items.slice(0, i).reduce((n, x) => n + share(x) * C, 0),
  }));
  return (
    <svg className={`kit-donut${size === 'sm' ? ' sm' : ''}`} viewBox="0 0 200 200" role="img" aria-label={label} data-testid={testId}>
      <g transform="rotate(-90 100 100)" strokeWidth="22">
        {items.length === 0 && <circle className="track" cx="100" cy="100" r={R} />}
        {slices.map((s) => (
          <circle key={s.key} className={`kit-stroke-${s.tone}`} cx="100" cy="100" r={R} strokeDasharray={`${s.len} ${C}`} strokeDashoffset={-s.start} />
        ))}
      </g>
      {count !== undefined && (
        <text x="100" y="98" textAnchor="middle" className="kit-donut-n">
          {count}
        </text>
      )}
      {unit !== undefined && (
        <text x="100" y="118" textAnchor="middle" className="kit-donut-u">
          {unit}
        </text>
      )}
    </svg>
  );
}

/** The categorical tones in order, one per share (twelve, each distinct in both themes); anything after is "rest", the only grey. */
export const SHARE_TONES: readonly MeterTone[] = ['chart', 'series2', 'series3', 'series4', 'series5', 'series6', 'series7', 'series8', 'series9', 'series10', 'series11', 'series12'];
