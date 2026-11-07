/**
 * Histogram (design.punji.app/components/histogram): how many items fall in each bucket of one measure, as bars from
 * a zero baseline, left to right. The buckets a range keeps are filled, the rest are outlined and empty, so a reader
 * sees where a range sits on the whole set by shape as well as shade. Heights are exactly the counts (no smoothing);
 * an empty bucket draws no bar, never a stub.
 *
 * Built on ChartA11yShell: the plot is one focus stop (Left, Right, Home, End, Escape move through the buckets, the
 * pointer reads one), the live region speaks the bucket's bounds, its count and whether the range keeps it, and a
 * hidden table lists every bucket. Pure DOM and CSS, no chart library.
 */
import type { CSSProperties, PointerEvent } from 'react';

import { ChartA11yShell, ChartDataTable } from '../chart-a11y/ChartA11yShell.tsx';
import { clamp } from '../internal/chartFrame.tsx';

export interface HistogramTick {
  /** The bucket edge the label sits at: 0 is the left end, `counts.length` the right end. */
  at: number;
  /** The label printed under that edge. */
  label: string;
}

export interface HistogramLabels {
  /** A bucket with no `bucketLabels` entry. Default "Bucket 3" (1-based). */
  bucket: (position: number) => string;
  /** The table's first head. Default "Range". */
  range: string;
  /** The table's count head. Default "Count". */
  count: string;
  /** The table's kept head, and the spoken word for a kept bucket. Default "In range". */
  kept: string;
  /** The spoken word for a bucket the range drops. Default "Outside range". */
  notKept: string;
  /** The keyboard hint read with the name. */
  hint: string;
  /** Printed when there are no buckets. Default "No data". */
  empty: string;
}

export interface HistogramProps {
  /** Items per bucket, left to right. */
  counts: readonly number[];
  /** Which buckets the chosen range keeps (filled). Omit: every bucket is kept. */
  kept?: readonly boolean[];
  /** Axis labels under the bars, at bucket edges. Keep to six or fewer. */
  ticks?: readonly HistogramTick[];
  /** The chart in one sentence (the figure's accessible name). */
  label: string;
  /** Each bucket's range in words ("0.60 to 1.20"), for the readout, the live region and the table. */
  bucketLabels?: readonly string[];
  /** A count in words ("3 stocks"). Default the number. */
  countWord?: (count: number) => string;
  /** The plot's height in px. Default 104. */
  height?: number;
  /** Overrides for the printed words. */
  labels?: Partial<HistogramLabels>;
  /** Test id on the figure. */
  testId?: string;
}

const DEFAULT_LABELS: HistogramLabels = {
  bucket: (position) => `Bucket ${position}`,
  range: 'Range',
  count: 'Count',
  kept: 'In range',
  notKept: 'Outside range',
  hint: 'Use the left and right arrow keys to move between buckets, Home and End to jump to the first and last.',
  empty: 'No data',
};

/**
 * @stability beta
 */
export function Histogram({ counts, kept, ticks = [], label, bucketLabels, countWord = String, height = 104, labels, testId }: HistogramProps) {
  const words = { ...DEFAULT_LABELS, ...labels };
  const clean = counts.map((c) => (Number.isFinite(c) && c > 0 ? c : 0));
  const n = clean.length;
  const max = Math.max(0, ...clean);
  const total = clean.reduce((s, c) => s + c, 0);
  const name = (i: number) => bucketLabels?.[i] ?? words.bucket(i + 1);
  const isKept = (i: number) => !kept || kept[i] === true;
  const keptCount = kept ? clean.filter((_, i) => isKept(i)).reduce((s, c) => s + c, 0) : total;
  if (n === 0) {
    return (
      <figure className="pu-hist" aria-label={label} data-testid={testId}>
        <p className="pu-hist-empty">{words.empty}</p>
      </figure>
    );
  }
  const speak = (i: number) => `${name(i)}: ${countWord(clean[i]!)}${kept ? `, ${isKept(i) ? words.kept : words.notKept}` : ''}`;
  const indexAt = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return r.width > 0 ? clamp(Math.floor(((e.clientX - r.left) / r.width) * n), 0, n - 1) : 0;
  };
  return (
    <ChartA11yShell
      className="pu-hist"
      testId={testId}
      label={label}
      roleDescription="histogram"
      count={n}
      speak={speak}
      hint={words.hint}
      summary={kept ? `${countWord(keptCount)} of ${countWord(total)} ${words.kept.toLowerCase()}` : undefined}
      table={
        <ChartDataTable
          caption={label}
          head={[words.range, words.count, ...(kept ? [words.kept] : [])]}
          rows={clean.map((c, i) => ({ key: String(i), head: name(i), cells: [countWord(c), ...(kept ? [isKept(i) ? words.kept : words.notKept] : [])] }))}
        />
      }
    >
      {({ index: at, pointerTo, plotProps }) => (
        <>
          <div className="pu-hist-wrap" style={{ '--hist-h': `${height}px` } as CSSProperties}>
            {/* The plot is the one focus stop: arrow keys move through the buckets, the pointer reads one. */}
            {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
            <div className="pu-hist-plot" {...plotProps((e) => pointerTo(indexAt(e)))}>
              <div className="pu-hist-bars" aria-hidden="true">
                {clean.map((c, i) => (
                  <span key={i} className="pu-hist-col" data-kept={isKept(i) ? 'true' : 'false'} data-at={at === i || undefined}>
                    {c > 0 && max > 0 ? <i style={{ height: `${(c / max) * 100}%` }} /> : null}
                  </span>
                ))}
              </div>
              {at !== null && (
                <div className="pu-hist-tip" aria-hidden="true" data-align={at < n * 0.2 ? 'start' : at >= n * 0.8 ? 'end' : 'mid'} style={{ left: `${((at + 0.5) / n) * 100}%` }}>
                  <b>{name(at)}</b> {countWord(clean[at]!)}
                  {kept && <span>{isKept(at) ? words.kept : words.notKept}</span>}
                </div>
              )}
            </div>
            {ticks.length > 0 && (
              <div className="pu-hist-axis" aria-hidden="true">
                {ticks.map((t) => (
                  <span key={`${t.at}-${t.label}`} style={{ left: `${(clamp(t.at, 0, n) / Math.max(1, n)) * 100}%` }} data-edge={t.at >= n ? 'end' : t.at <= 0 ? 'start' : undefined}>{t.label}</span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </ChartA11yShell>
  );
}
