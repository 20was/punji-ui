/**
 * Sparkline (design.punji.app/components/sparkline): a small line of real
 * values with no axes, for a trend beside a figure (a holding's last 30
 * closes). Straight segments between the real points, never smoothed. The
 * tone follows the first and last value unless one is given; fewer than two
 * values draw a dashed "no line" rule of the same width, never an empty box.
 *
 * Decorative unless given a `label` (then an `img`): print the figure it
 * trends beside it, because a line without numbers is not data. Direction is
 * never colour alone for a reader who has the label, so write the change in
 * it ("NABIL, up 4.2 percent over 30 days").
 *
 * Merged from punji-web's two implementations: it keeps the small component's
 * decorative default, `fluid` width, tone override and dashed placeholder, and
 * takes from the chart module's one the downsampling of very long series
 * (here by extremes, so a spike survives).
 */
import { memo, type CSSProperties } from 'react';

export type SparklineTone = 'gain' | 'loss' | 'flat' | 'chart';

export interface SparklineProps {
  /** Closes, oldest first. Missing, null and non-finite entries are dropped, not drawn as zero. */
  values?: readonly (number | null | undefined)[] | null;
  /** The drawing's own size in px (the aspect ratio when `fluid`). */
  width?: number;
  /** Height of the drawing in px (with `width`, the aspect ratio when `fluid`). Default 28. */
  height?: number;
  /** Default: gain when the last value is above the first, loss when below, flat when equal. */
  tone?: SparklineTone;
  /** Fill the container's width, keeping the aspect ratio; strokes do not scale. */
  fluid?: boolean;
  /** Series longer than this are reduced to their extremes per bucket (first and last always kept). Default 120, least 8. */
  maxPoints?: number;
  /** Names it (role img); decorative without. */
  label?: string;
  /** Sets `data-testid` on the drawing. */
  testId?: string;
}

const PAD = 2;

/** Keep the first and last points and the low and high of each bucket, in order. */
export function reduceSeries(values: readonly number[], maxPoints: number): number[] {
  const cap = Math.max(8, Math.floor(maxPoints) || 8);
  if (values.length <= cap) return [...values];
  const buckets = Math.floor((cap - 2) / 2);
  // Buckets are in order and disjoint, so the kept indices come out ascending: no set, no sort.
  const out: number[] = [values[0]!];
  let last = 0;
  const keep = (i: number) => {
    if (i > last) {
      out.push(values[i]!);
      last = i;
    }
  };
  for (let b = 0; b < buckets; b += 1) {
    const from = Math.floor((b * values.length) / buckets);
    const to = Math.max(from + 1, Math.floor(((b + 1) * values.length) / buckets));
    let lo = from;
    let hi = from;
    for (let i = from; i < to; i += 1) {
      if (values[i]! < values[lo]!) lo = i;
      if (values[i]! > values[hi]!) hi = i;
    }
    keep(Math.min(lo, hi));
    keep(Math.max(lo, hi));
  }
  keep(values.length - 1);
  return out;
}

function SparklineBase({ values, width = 88, height = 28, tone, fluid = false, maxPoints = 120, label, testId }: SparklineProps) {
  const clean: number[] = [];
  for (const x of values ?? []) if (typeof x === 'number' && Number.isFinite(x)) clean.push(x);
  const w = Number.isFinite(width) && width > 8 ? width : 88;
  const h = Number.isFinite(height) && height > 8 ? height : 28;
  const aria = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true as const };
  if (clean.length < 2) {
    return <span className="kit-spark-none" style={{ width: fluid ? '100%' : w, height: h / 2 }} {...aria} data-testid={testId} />;
  }
  const first = clean[0]!;
  const last = clean[clean.length - 1]!;
  const drawn = reduceSeries(clean, maxPoints);
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of drawn) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  // Halve before subtracting so opposite finite extremes cannot overflow to Infinity.
  const span = hi / 2 - lo / 2;
  const y = (v: number) => (span > 0 ? PAD + (1 - (v / 2 - lo / 2) / span) * (h - PAD * 2) : h / 2);
  const points = drawn.map((v, i) => `${((i / (drawn.length - 1)) * (w - PAD * 2) + PAD).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const t: SparklineTone = tone ?? (last > first ? 'gain' : last < first ? 'loss' : 'flat');
  const style: CSSProperties | undefined = fluid ? { aspectRatio: `${w} / ${h}` } : undefined;
  return (
    <svg
      className={`kit-spark ${t}${fluid ? ' fluid' : ''}`}
      viewBox={`0 0 ${w} ${h}`}
      width={fluid ? undefined : w}
      height={fluid ? undefined : h}
      preserveAspectRatio={fluid ? 'none' : undefined}
      style={style}
      {...aria}
      data-testid={testId}
    >
      <polyline points={points} />
    </svg>
  );
}

/**
 * Memoised: a watchlist row that re-renders with a new price but the same
 * closes array skips the line (no reduce, no path). Safe in a Server
 * Component (memo is part of React's server build); no hooks, no client code.
 */
export const Sparkline = memo(SparklineBase);
