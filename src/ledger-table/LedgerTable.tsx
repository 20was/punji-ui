'use client';

/**
 * LedgerTable: the general ledger of ONE account as a table: date, reference,
 * description, debit, credit and a running balance, with an opening row, a
 * total row and a closing row. A composition over DataTable, so the sticky
 * head, captions, loading and empty states are the table's own. Figures are
 * right aligned in tabular digits; the running balance names its side (Dr/Cr)
 * in words as well as letters.
 *
 * The caller owns the data and its order (sort by date first) and says which
 * side is normal for the account. Every figure is an exact bigint; nothing is
 * rounded. This is a display and arithmetic helper, not the books: the server
 * that stores them must validate and total them again.
 */
import { useMemo, type CSSProperties, type ReactNode } from 'react';

import { DataListRow, DataTable, Cell, type Column } from '../table/Table.tsx';
import { DebitCredit, nepalLedgerMoney, type DebitCreditLabels } from '../debit-credit/DebitCredit.tsx';
import { RetryNote } from '../retry-note/RetryNote.tsx';
import { Note } from '../states/States.tsx';
import { runningBalance, assertValidAmounts, type LedgerEntry, type NormalSide } from '../ledger/core.ts';
import { formatCalendarDate, type CalendarDate } from '../nepal/date-only.ts';
import type { MoneyFormatConfig } from '../money/money.ts';

export interface LedgerTableLabels {
  date: string;
  reference: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
  opening: string;
  total: string;
  closing: string;
  invalid: string;
}

export const DEFAULT_LEDGER_TABLE_LABELS: LedgerTableLabels = {
  date: 'Date', reference: 'Ref', description: 'Description', debit: 'Debit', credit: 'Credit', balance: 'Balance',
  opening: 'Opening balance', total: 'Period total', closing: 'Closing balance',
  invalid: 'These entries have an amount that is negative, not exact, or on both sides, so no balance is shown.',
};

export interface LedgerTableProps {
  /** Names the table region, for example "Cash ledger, Shrawan 2081". */
  caption: string;
  /** Postings to this account, in the order to show (oldest first). Not sorted, filtered or grouped here. */
  entries: readonly LedgerEntry[];
  /** The side that increases this account: 'debit' for assets and expenses, 'credit' for liabilities, equity and income. */
  normal: NormalSide;
  /** Balance brought forward, on the normal side (negative if it sits on the other side). Default 0n. */
  opening?: bigint;
  /** Currency and locale. Default NPR, en-IN, no currency mark: name the currency in the caption. */
  money?: MoneyFormatConfig;
  /** Print a date. Default "3 Aug 2024" for the Gregorian date; pass `d => formatBSDate(gregorianToBS(d))` for Bikram Sambat. */
  formatDate?: (date: CalendarDate) => string;
  /** Column and row words, in the reader's language. */
  labels?: Partial<LedgerTableLabels>;
  /** The Dr / Cr words beside the balance. */
  sideLabels?: Partial<DebitCreditLabels>;
  /** Show the Ref column. Default true. */
  showReference?: boolean;
  /** The head sticks inside a box this tall that scrolls ('420px', 420). */
  maxHeight?: number | string;
  /** No box of its own: the table sits in a card or a panel. */
  bare?: boolean;
  /** ready (default), loading (headers stay, rows replaced by a status line) or error. */
  state?: 'ready' | 'loading' | 'error';
  /** Shown in place of rows when there is nothing to show and `state` is `ready`. */
  emptyLabel?: ReactNode;
  /** The status line shown while `state` is `loading`. */
  loadingLabel?: string;
  /** What failed, shown with the retry button when `state` is `error`. */
  errorLabel?: ReactNode;
  /** The retry button's words when `state` is `error`. Default 'Try again'. */
  retryLabel?: string;
  /** Called when the retry button is pressed. The button is drawn only when this is given, so give it whenever `state` can be `error` and a retry is possible. */
  onRetry?: () => void;
  /** Sets `data-testid` on the root. */
  testId?: string;
}

type Key = 'date' | 'reference' | 'description' | 'debit' | 'credit' | 'balance';

const defaultDate = (date: CalendarDate) => formatCalendarDate(date);

export function LedgerTable({
  caption, entries, normal, opening = 0n, money = nepalLedgerMoney, formatDate = defaultDate, labels, sideLabels, showReference = true, maxHeight, bare,
  state = 'ready', emptyLabel = 'No entries in this period.', loadingLabel = 'Loading entries…', errorLabel = 'The ledger could not be loaded.', retryLabel = 'Try again', onRetry, testId,
}: LedgerTableProps) {
  const words = { ...DEFAULT_LEDGER_TABLE_LABELS, ...labels };
  const computed = useMemo(() => {
    if (state !== 'ready') return null;
    try {
      const rows = runningBalance(entries, { normal, opening });
      let debit = 0n;
      let credit = 0n;
      for (const entry of entries) { assertValidAmounts(entry); debit += entry.debit; credit += entry.credit; }
      return { rows, debit, credit, closing: rows.length ? rows[rows.length - 1]!.balance : opening };
    } catch {
      return 'invalid' as const;
    }
  }, [entries, normal, opening, state]);

  if (state === 'error') return <RetryNote retryLabel={retryLabel} onRetry={onRetry} testId={testId}>{errorLabel}</RetryNote>;
  if (computed === 'invalid') return <div role="alert" data-testid={testId}><Note tone="error">{words.invalid}</Note></div>;

  const columns: Column<Key>[] = ([
    { key: 'date', label: words.date },
    showReference ? { key: 'reference', label: words.reference, wide: true } : null,
    { key: 'description', label: words.description },
    { key: 'debit', label: words.debit, num: true },
    { key: 'credit', label: words.credit, num: true },
    { key: 'balance', label: words.balance, num: true },
  ] as (Column<Key> | null)[]).filter((column): column is Column<Key> => column !== null);
  // DebitCredit takes the signed net with debit positive; a credit-normal balance is flipped.
  const net = (balance: bigint) => (normal === 'debit' ? balance : -balance);
  const style = maxHeight === undefined ? undefined : ({ '--ledger-max-h': typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } as CSSProperties);
  const balanceCell = (balance: bigint, id?: string) => <DebitCredit value={net(balance)} labels={sideLabels} preset={money} testId={id} />;
  const hasRows = computed !== null && (entries.length > 0 || opening !== 0n);

  return (
    <div className="pu-ledger" style={style} data-testid={testId}>
      <DataTable
        caption={caption}
        columns={columns}
        bare={bare}
        stack
        loading={state === 'loading'}
        loadingLabel={loadingLabel}
        empty={emptyLabel}
        testId={testId ? `${testId}-table` : undefined}
      >
        {hasRows && computed ? [
          <DataListRow key="opening" testId={testId ? `${testId}-opening` : undefined}>
            <th scope="row" className="pu-ledger-label">{words.opening}</th>
            {showReference && <Cell wide>{null}</Cell>}
            <Cell>{null}</Cell>
            <Cell num>{null}</Cell>
            <Cell num>{null}</Cell>
            <td className="num" data-label={words.balance}>{balanceCell(opening)}</td>
          </DataListRow>,
          ...computed.rows.map(({ entry, balance }) => (
            <DataListRow key={entry.id} testId={testId ? `${testId}-row-${entry.id}` : undefined}>
              <Cell header>{formatDate(entry.date)}</Cell>
              {showReference && <Cell wide>{entry.reference ?? ''}</Cell>}
              <Cell><span className="pu-ledger-desc">{entry.description ?? ''}</span>{showReference && entry.reference && <span className="sub pu-ledger-ref">{entry.reference}</span>}</Cell>
              <Cell num label={words.debit}><DebitCredit value={entry.debit - entry.credit} variant="column" column="debit" preset={money} /></Cell>
              <Cell num label={words.credit}><DebitCredit value={entry.debit - entry.credit} variant="column" column="credit" preset={money} /></Cell>
              <Cell num label={words.balance}>{balanceCell(balance)}</Cell>
            </DataListRow>
          )),
          <DataListRow key="total" testId={testId ? `${testId}-total` : undefined}>
            <th scope="row" className="pu-ledger-label pu-ledger-total">{words.total}</th>
            {showReference && <Cell wide>{null}</Cell>}
            <Cell>{null}</Cell>
            <td className="num pu-ledger-total" data-label={words.debit}><DebitCredit value={computed.debit} variant="column" column="debit" preset={money} /></td>
            <td className="num pu-ledger-total" data-label={words.credit}><DebitCredit value={-computed.credit} variant="column" column="credit" preset={money} /></td>
            <Cell num>{null}</Cell>
          </DataListRow>,
          <DataListRow key="closing" testId={testId ? `${testId}-closing` : undefined}>
            <th scope="row" className="pu-ledger-label pu-ledger-closing">{words.closing}</th>
            {showReference && <Cell wide>{null}</Cell>}
            <Cell>{null}</Cell>
            <Cell num>{null}</Cell>
            <Cell num>{null}</Cell>
            <td className="num pu-ledger-closing" data-label={words.balance}>{balanceCell(computed.closing, testId ? `${testId}-closing-balance` : undefined)}</td>
          </DataListRow>,
        ] : null}
      </DataTable>
    </div>
  );
}
