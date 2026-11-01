/**
 * AgingTable: receivables or payables by party and by age on an as-of date: not yet due, 0–30, 31–60, 61–90 and over
 * 90 days (your limits), with row and column totals and each bucket's share of the total. Exact bigint sums from
 * `ageItems`. Past-due buckets carry a text label and weight, never colour alone; the oldest bucket is emphasised.
 *
 * It groups the balances it is given; it does not decide what is outstanding, apply payments or chase anyone.
 */
import type { ReactNode } from 'react';

import { nepalLedgerMoney } from '../debit-credit/DebitCredit.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import type { MoneyFormatConfig } from '../money/money.ts';
import type { CalendarDate } from '../nepal/date-only.ts';
import { RetryNote } from '../retry-note/RetryNote.tsx';
import { Note } from '../states/States.tsx';
import { Cell, DataListRow, DataTable, type Column } from '../table/Table.tsx';
import { ageItems, type AgingBucket, type AgingItem } from '../tax/aging.ts';

export interface AgingTableLabels {
  party: string; total: string; share: string; notDue: string; days: string; over: string; invalid: string;
}

export const DEFAULT_AGING_TABLE_LABELS: AgingTableLabels = {
  party: 'Party', total: 'Total', share: 'Share', notDue: 'Not due', days: 'days', over: 'Over', invalid: 'An item has an amount that is not exact, so no aging is shown.',
};

export interface AgingTableProps {
  /** Names the table: "Receivables aging as of 15 Kartik 2082 (NPR)". */
  caption: string;
  /** Outstanding items. Items of the same party are summed on one row. */
  items: readonly AgingItem[];
  /** The date ages are counted to (Gregorian, date-only). */
  asOf: CalendarDate;
  /** Last day of each bucket before the open one. Default [30, 60, 90]. */
  limits?: readonly number[];
  /** Not-yet-due column: 'auto' (default) shows it when any item is not yet due; true always; false counts those items in the first bucket. */
  notDue?: boolean | 'auto';
  /** Show a share-of-total row under the totals. Default true. */
  showShare?: boolean;
  /** What a party cell holds, for example a link to its statement. */
  renderParty?: (party: string) => ReactNode;
  /** Currency and locale. Default NPR, en-IN, no currency mark (name it in the caption). */
  money?: MoneyFormatConfig;
  /** Column words; `bucketLabel` replaces a bucket heading entirely. */
  labels?: Partial<AgingTableLabels>;
  bucketLabel?: (bucket: AgingBucket) => string;
  bare?: boolean;
  /** ready (default), loading or error. */
  state?: 'ready' | 'loading' | 'error';
  emptyLabel?: ReactNode;
  loadingLabel?: string;
  errorLabel?: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  testId?: string;
}

function headingOf(bucket: AgingBucket, words: AgingTableLabels): string {
  if (bucket.key === 'not-due') return words.notDue;
  if (bucket.to === null) return `${words.over} ${bucket.from - 1} ${words.days}`;
  return `${bucket.from}–${bucket.to} ${words.days}`;
}

/** Share in percent with one decimal, exact integer arithmetic, for display. */
function share(part: bigint, whole: bigint): string {
  if (whole <= 0n) return '—';
  const magnitude = part < 0n ? -part : part;
  const tenths = (magnitude * 1000n + whole / 2n) / whole;
  return `${part < 0n ? '−' : ''}${tenths / 10n}.${tenths % 10n}%`;
}

export function AgingTable({
  caption, items, asOf, limits, notDue = 'auto', showShare = true, renderParty, money = nepalLedgerMoney, labels, bucketLabel, bare,
  state = 'ready', emptyLabel = 'Nothing outstanding.', loadingLabel = 'Loading aging…', errorLabel = 'The aging could not be loaded.', retryLabel = 'Try again', onRetry, testId,
}: AgingTableProps) {
  const words = { ...DEFAULT_AGING_TABLE_LABELS, ...labels };
  if (state === 'error') return <RetryNote retryLabel={retryLabel} onRetry={onRetry} testId={testId}>{errorLabel}</RetryNote>;
  let result: ReturnType<typeof ageItems>;
  try { result = ageItems(state === 'ready' ? items : [], asOf, { ...(limits ? { limits } : {}), notDue: notDue !== false }); } catch {
    return <div role="alert" data-testid={testId}><Note tone="error">{words.invalid}</Note></div>;
  }
  const hideNotDue = notDue === 'auto' && result.totals[0] === 0n && result.rows.every((row) => row.amounts[0] === 0n);
  const visible = result.buckets.map((bucket, index) => ({ bucket, index })).filter(({ index }) => !(hideNotDue && index === 0));
  const last = result.buckets.length - 1;
  type Key = string;
  const columns: Column<Key>[] = [
    { key: 'party', label: words.party },
    ...visible.map(({ bucket }) => ({ key: bucket.key, label: bucketLabel ? bucketLabel(bucket) : headingOf(bucket, words), num: true })),
    { key: 'total', label: words.total, num: true },
  ];
  const amount = (value: bigint) => (value === 0n ? <span className="pu-aging-zero">–<span className="kit-sr">0</span></span> : <MoneyDisplay value={value} preset={money} />);
  return (
    <div className="pu-aging" data-testid={testId}>
      <DataTable caption={caption} columns={columns} bare={bare} stack loading={state === 'loading'} loadingLabel={loadingLabel} empty={emptyLabel} testId={testId ? `${testId}-table` : undefined}>
        {result.rows.length ? [
          ...result.rows.map((row) => (
            <DataListRow key={row.party} testId={testId ? `${testId}-row-${row.party}` : undefined}>
              <Cell header>{renderParty ? renderParty(row.party) : row.party}</Cell>
              {visible.map(({ bucket, index }) => (
                <td key={bucket.key} className={`num${index === last && row.amounts[index] !== 0n ? ' pu-aging-old' : ''}`} data-label={columns.find((c) => c.key === bucket.key)!.label as string}>
                  {amount(row.amounts[index]!)}
                </td>
              ))}
              <td className="num pu-aging-rowtotal" data-label={words.total}>{amount(row.total)}</td>
            </DataListRow>
          )),
          <DataListRow key="__total" testId={testId ? `${testId}-total` : undefined}>
            <th scope="row" className="pu-aging-total">{words.total}</th>
            {visible.map(({ bucket, index }) => (
              <td key={bucket.key} className="num pu-aging-total" data-label={columns.find((c) => c.key === bucket.key)!.label as string} data-testid={testId ? `${testId}-total-${bucket.key}` : undefined}>{amount(result.totals[index]!)}</td>
            ))}
            <td className="num pu-aging-total" data-label={words.total} data-testid={testId ? `${testId}-grand` : undefined}>{amount(result.total)}</td>
          </DataListRow>,
          ...(showShare ? [
            <DataListRow key="__share" testId={testId ? `${testId}-share` : undefined}>
              <th scope="row" className="pu-aging-share">{words.share}</th>
              {visible.map(({ bucket, index }) => <td key={bucket.key} className="num pu-aging-share" data-label={columns.find((c) => c.key === bucket.key)!.label as string}>{share(result.totals[index]!, result.total)}</td>)}
              <td className="num pu-aging-share" data-label={words.total}>{result.total > 0n ? '100.0%' : '—'}</td>
            </DataListRow>,
          ] : []),
        ] : null}
      </DataTable>
    </div>
  );
}
