/**
 * KeyStats (design.punji.app/components/key-stats): a panel's facts as
 * label-over-value cells in two (or three) columns, so a label never wraps
 * into its value and the rows line up across the columns. A cell may carry
 * one quiet line under its value (the quarter an EPS is from). A value that
 * is not known says so in words (`empty`), never a dash or a zero.
 * `layout="strip"` lays the cells out as one band split by hairlines (a
 * session's open, high, low, close under a quote), wrapping to more rows
 * where the band is narrow.
 *
 * A description list, so each label is read with its value. A `tone` only
 * tints a signed figure: the sign or a word must be in the value itself.
 */
import type { ReactNode } from 'react';

import { Skeleton } from '../states/States.tsx';

export interface KeyStat {
  label: ReactNode;
  /** The figure as printed; null when it is not known. */
  value: ReactNode | null;
  /** One quiet line under the value. */
  sub?: ReactNode;
  /** A tone for a signed figure (a net position). */
  tone?: 'up' | 'down';
  testId?: string;
}

export function KeyStats({ items, cols = 2, layout = 'grid', empty, label, loading, testId }: {
  items: readonly KeyStat[];
  cols?: 2 | 3;
  /** 'strip': one band of cells split by hairlines, as many to a row as fit (cols is ignored). */
  layout?: 'grid' | 'strip';
  /** The words for a value that is not known ("Not published"). */
  empty: ReactNode;
  /** Names the list for screen readers when it has no heading. */
  label?: string;
  /** Skeleton values while the figures read (the labels stay). */
  loading?: boolean;
  testId?: string;
}) {
  return (
    <dl className={layout === 'strip' ? 'kit-kstats strip' : `kit-kstats c${cols}`} aria-label={label} aria-busy={loading || undefined} data-testid={testId}>
      {items.map((it, i) => {
        const unknown = it.value === null || it.value === undefined;
        return (
          <div key={i} className="kit-kstat" data-testid={it.testId}>
            <dt>{it.label}</dt>
            <dd className={unknown ? (loading ? 'wait' : 'none') : it.tone}>{unknown ? (loading ? <Skeleton width={64} height={16} /> : empty) : it.value}</dd>
            {it.sub && <dd className="sub">{it.sub}</dd>}
          </div>
        );
      })}
    </dl>
  );
}
