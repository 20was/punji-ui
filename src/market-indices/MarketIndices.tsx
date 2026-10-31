/**
 * MarketIndices: index cards or a one-row strip. Each index shows its name, its
 * value in points, the change since the previous close (sign, arrow and word,
 * not colour alone) and an optional trend line. An optional market status sits
 * above. The caller supplies every number; nothing is fetched or derived
 * beyond the change.
 */
import type { ReactNode } from 'react';

import { MarketStatus, type MarketSession, type MarketState, type MarketStatusLabels } from '../market-status/MarketStatus.tsx';
import { PriceChange, type PriceChangeLabels } from '../price-change/PriceChange.tsx';
import { Skeleton } from '../states/States.tsx';
import { Sparkline } from '../sparkline/Sparkline.tsx';
import { formatPrice } from '../nepal/market-format.ts';

export interface MarketIndex {
  /** Stable key. */
  id: string;
  /** The index's name ("NEPSE", "Sensitive"). */
  name: string;
  /** Points. Null when not published. */
  value: number | null;
  /** The previous close in points; the change is derived from it and `value`. Null when not published. */
  previousValue: number | null;
  /** Closes for the trend line, oldest first. */
  history?: readonly (number | null)[];
}

export interface MarketIndicesProps {
  /** The indices to show, in order. An empty list shows `emptyLabel`. */
  indices: readonly MarketIndex[];
  /** Names the group for screen readers ("Market indices"). */
  label: string;
  /** cards (default): a responsive grid. strip: one scrolling row, for a page header. */
  variant?: 'cards' | 'strip';
  /** Market status above the indices: a known state, or a `getMarketSession` result. */
  state?: MarketState;
  /** A `getMarketSession` result: its state is shown above the indices. `state` takes precedence when both are given. */
  session?: MarketSession;
  /** The words for each market state, in the reader's language. */
  statusLabels?: Partial<MarketStatusLabels>;
  /** Shown beside the status, for example "As of 15:00, 14 Oct". */
  asOf?: ReactNode;
  /** Which colour means up. Default green-up. */
  convention?: 'green-up' | 'red-up';
  /** Spoken direction words for the change. */
  changeLabels?: PriceChangeLabels;
  /** Decimals of the value; the change always uses two. Default 2. */
  fractionDigits?: number;
  /** Show the trend line (default true when an index has history). */
  showTrend?: boolean;
  /** Show placeholders with a status label instead of the indices. */
  loading?: boolean;
  /** The status label spoken while `loading`. Default 'Loading indices'. */
  loadingLabel?: string;
  /** Shown when `indices` is empty. Default 'No index data.' */
  emptyLabel?: ReactNode;
  /** Sets `data-testid` on the section. */
  testId?: string;
}

const toMinor = (v: number | null): bigint | null => (v === null || !Number.isFinite(v) ? null : BigInt(Math.round(v * 100)));

export function MarketIndices({
  indices, label, variant = 'cards', state, session, statusLabels, asOf, convention = 'green-up', changeLabels, fractionDigits = 2,
  showTrend = true, loading = false, loadingLabel = 'Loading indices', emptyLabel = 'No index data.', testId,
}: MarketIndicesProps) {
  const status = state ?? session?.state;
  return (
    <section className="pu-indices" data-variant={variant} aria-label={label} aria-busy={loading || undefined} data-testid={testId}>
      {(status || asOf) && (
        <div className="pu-indices-head">
          {status && <MarketStatus state={status} session={session} labels={statusLabels} size="sm" />}
          {asOf && <span className="pu-indices-asof">{asOf}</span>}
        </div>
      )}
      {loading ? (
        <div className="pu-indices-list" role="status" aria-label={loadingLabel}>
          {[0, 1, 2].map((i) => <div key={i} className="pu-index"><Skeleton height={14} width="50%" /><Skeleton height={24} width="70%" /><Skeleton height={14} width="60%" /></div>)}
        </div>
      ) : indices.length === 0 ? (
        <p className="pu-indices-empty" role="status">{emptyLabel}</p>
      ) : (
        // A strip scrolls sideways on a narrow screen: it must be focusable so the keyboard can scroll it.
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        <ul className="pu-indices-list" tabIndex={variant === 'strip' ? 0 : undefined}>
          {indices.map((index) => {
            const hasTrend = showTrend && (index.history?.filter((v) => v !== null && v !== undefined).length ?? 0) >= 2;
            return (
              <li key={index.id} className="pu-index">
                <span className="pu-index-name">{index.name}</span>
                <span className="pu-index-value">
                  {index.value === null || !Number.isFinite(index.value)
                    ? <><span aria-hidden="true">—</span><span className="kit-sr">No value</span></>
                    : formatPrice(index.value, { fractionDigits })}
                </span>
                <PriceChange current={toMinor(index.value)} previous={toMinor(index.previousValue)} currency="NPR" locale="en-IN" display="none" size="sm" convention={convention} labels={changeLabels} />
                {hasTrend && <span className="pu-index-trend"><Sparkline values={index.history} fluid width={120} height={32} /></span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
