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
import type { CSSProperties } from 'react';

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
  const keep = new Set<number>([0, values.length - 1]);
  for (let b = 0; b < buckets; b += 1) {
    const from = Math.floor((b * values.length) / buckets);
    const to = Math.max(from + 1, Math.floor(((b + 1) * values.length) / buckets));
    let lo = from;
    let hi = from;
    for (let i = from; i < to; i += 1) {
      if (values[i]! < values[lo]!) lo = i;
      if (values[i]! > values[hi]!) hi = i;
    }
    keep.add(lo);
    keep.add(hi);
  }
  return [...keep].toSorted((a, b) => a - b).map((i) => values[i]!);
}

export function Sparkline({ values, width = 88, height = 28, tone, fluid = false, maxPoints = 120, label, testId }: SparklineProps) {
  const clean = (values ?? []).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  const w = Number.isFinite(width) && width > 8 ? width : 88;
  const h = Number.isFinite(height) && height > 8 ? height : 28;
  const aria = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true as const };
  if (clean.length < 2) {
    return <span className="kit-spark-none" style={{ width: fluid ? '100%' : w, height: h / 2 }} {...aria} data-testid={testId} />;
  }
  const first = clean[0]!;
  const last = clean[clean.length - 1]!;
  const drawn = reduceSeries(clean, maxPoints);
  const lo = Math.min(...drawn);
  const hi = Math.max(...drawn);
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
