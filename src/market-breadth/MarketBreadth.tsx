/**
 * MarketBreadth: how many stocks rose, fell and stayed flat, as one bar split in
 * three with the counts printed beside it (and the advance/decline ratio), plus
 * optional extra counts such as stocks at their circuit limits. Direction is
 * said in words and with arrows, never by colour alone; in forced colours the
 * declines are hatched. `breadthOf` counts it from quotes.
 */
import type { ReactNode } from 'react';

import { Skeleton } from '../states/States.tsx';

export interface Breadth {
  /** Stocks whose price is above the previous close. */
  advances: number;
  /** Stocks whose price is below the previous close. */
  declines: number;
  /** Stocks that traded at the previous close, or did not trade. */
  unchanged: number;
}

/**
 * Counts advances, declines and unchanged from quotes (price and previous close in minor units). A quote with a
 * missing price or previous close counts as unchanged, as exchanges report a stock that did not trade.
 */
export function breadthOf(quotes: readonly { ltp: bigint | null; previousClose: bigint | null }[]): Breadth {
  let advances = 0;
  let declines = 0;
  let unchanged = 0;
  for (const q of quotes) {
    if (q.ltp === null || q.previousClose === null || q.ltp === q.previousClose) unchanged += 1;
    else if (q.ltp > q.previousClose) advances += 1;
    else declines += 1;
  }
  return { advances, declines, unchanged };
}

/** Advances over declines, or null when nothing declined (the ratio is undefined). */
export function advanceDeclineRatio({ advances, declines }: Pick<Breadth, 'advances' | 'declines'>): number | null {
  return declines > 0 ? advances / declines : null;
}

export interface MarketBreadthLabels {
  /** Default "Advances". */
  advances: string;
  /** Default "Declines". */
  declines: string;
  /** Default "Unchanged". */
  unchanged: string;
  /** Default "A/D ratio". */
  ratio: string;
  /** The ratio when nothing declined. Default "No declines". */
  noDeclines: string;
  /** Shown when every count is zero. Default "No stocks have traded yet." */
  empty: string;
  /** Spoken while loading. Default "Loading market breadth". */
  loading: string;
  /** The whole bar spoken in one line. Default "45 advances, 30 declines, 5 unchanged of 80". */
  summary: (b: Breadth, total: number) => string;
}

const EN: MarketBreadthLabels = {
  advances: 'Advances',
  declines: 'Declines',
  unchanged: 'Unchanged',
  ratio: 'A/D ratio',
  noDeclines: 'No declines',
  empty: 'No stocks have traded yet.',
  loading: 'Loading market breadth',
  summary: (b, total) => `${b.advances} advances, ${b.declines} declines, ${b.unchanged} unchanged of ${total}`,
};

export interface BreadthExtra {
  /** Stable key. */
  id: string;
  /** What is counted ("At upper circuit", "52-week highs"). */
  label: ReactNode;
  /** The count; null when not known. */
  value: number | null;
  /** Tone of the figure: up or down, said by the label too. */
  tone?: 'up' | 'down';
}

export interface MarketBreadthProps extends Partial<Breadth> {
  /** Names the figure ("NEPSE breadth"). */
  label: string;
  /** More counts listed under the bar (circuit hits, 52-week highs and lows, traded scrips). */
  extra?: readonly BreadthExtra[];
  /** Print the advance/decline ratio. Default true. */
  showRatio?: boolean;
  /** Which colour means up. Default green-up. */
  convention?: 'green-up' | 'red-up';
  /** Placeholders with a spoken status instead of the figures. */
  loading?: boolean;
  /** 'sm': a thinner bar and smaller type, for a header row. */
  size?: 'sm';
  /** Words in the reader's language. */
  labels?: Partial<MarketBreadthLabels>;
  /** Format a count. Default grouped en-IN. */
  formatCount?: (n: number) => string;
  /** Sets `data-testid` on the figure. */
  testId?: string;
}

const grouped = (n: number) => n.toLocaleString('en-IN');
const safe = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

export function MarketBreadth({
  advances, declines, unchanged, label, extra, showRatio = true, convention = 'green-up', loading = false, size, labels, formatCount = grouped, testId,
}: MarketBreadthProps) {
  const words = { ...EN, ...labels };
  const b: Breadth = { advances: safe(advances), declines: safe(declines), unchanged: safe(unchanged) };
  const total = b.advances + b.declines + b.unchanged;
  const ratio = advanceDeclineRatio(b);
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const parts: { key: keyof Breadth; arrow: string; word: string }[] = [
    { key: 'advances', arrow: '▲', word: words.advances },
    { key: 'unchanged', arrow: '■', word: words.unchanged },
    { key: 'declines', arrow: '▼', word: words.declines },
  ];
  return (
    <figure className="pu-breadth" data-convention={convention} data-size={size} aria-busy={loading || undefined} data-testid={testId}>
      <figcaption className="pu-breadth-title">{label}</figcaption>
      {loading ? (
        <div className="pu-breadth-body" role="status" aria-label={words.loading}>
          <Skeleton height={size === 'sm' ? 8 : 12} />
          <Skeleton height={14} width="70%" />
        </div>
      ) : total === 0 ? (
        <p className="pu-breadth-empty" role="status">{words.empty}</p>
      ) : (
        <div className="pu-breadth-body">
          <div className="pu-breadth-bar" role="img" aria-label={words.summary(b, total)}>
            {parts.map((p) => b[p.key] > 0 && <i key={p.key} data-part={p.key} style={{ flexGrow: b[p.key], flexBasis: `${pct(b[p.key])}%` }} />)}
          </div>
          <dl className="pu-breadth-counts">
            {parts.map((p) => (
              <div key={p.key} data-part={p.key}>
                <dt>
                  <span className="pu-breadth-arrow" aria-hidden="true">{p.arrow}</span> {p.word}
                </dt>
                <dd>
                  {formatCount(b[p.key])} <span className="pu-breadth-pct">({pct(b[p.key]).toFixed(0)}%)</span>
                </dd>
              </div>
            ))}
            {showRatio && (
              <div data-part="ratio">
                <dt>{words.ratio}</dt>
                <dd>{ratio === null ? words.noDeclines : ratio.toFixed(2)}</dd>
              </div>
            )}
          </dl>
          {extra && extra.length > 0 && (
            <dl className="pu-breadth-extra">
              {extra.map((e) => (
                <div key={e.id} data-tone={e.tone}>
                  <dt>{e.label}</dt>
                  <dd>{e.value === null || !Number.isFinite(e.value) ? <><span aria-hidden="true">—</span><span className="kit-sr">Not known</span></> : formatCount(e.value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </figure>
  );
}
