'use client';

/**
 * TransactionList: an account's entries grouped by date, newest first as you
 * give them. Each row names the counterparty, the reference and category, and
 * the amount with its direction in words ("Dr" debit, "Cr" credit) and an
 * arrow, never colour alone; the status shows as a pill when it is not
 * completed. A running balance is shown only when the entries carry one (it is
 * never computed here from a page of rows). Rows are plain list items with
 * stable keys (the entry id), so a caller can window them with a virtualiser
 * (`TransactionRow` is exported for that). Loading, empty and error states
 * hold the list's place. Paging uses Pagination when `pageSize` is set.
 *
 * Display only. Totals, balances and statuses come from your server; nothing
 * here validates, sums or posts anything.
 */
import { useId, useState, type ReactNode } from 'react';

import { directionOf, type BankTransaction, type TransactionStatusValue } from '../banking/transactions.ts';
import { formatTransactionReference } from '../banking/account.ts';
import { Button } from '../button/Button.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { nepalMoneyPreset, type MoneyFormatConfig } from '../money/money.ts';
import { formatBSDate, gregorianToBS } from '../nepal/calendar.ts';
import { formatCalendarDate, parseCalendarDate } from '../nepal/date-only.ts';
import { Pagination } from '../pagination/Pagination.tsx';
import { EmptyState, Skeleton } from '../states/States.tsx';
import { TransactionStatus } from '../transaction-status/TransactionStatus.tsx';
import { paginate } from '../use-pagination/usePagination.ts';

export interface TransactionListLabels {
  /** Printed beside a debit (money out). Default 'Dr'. */
  debit: string;
  /** Printed beside a credit (money in). Default 'Cr'. */
  credit: string;
  /** Spoken for a debit. Default 'debit'. */
  debitSpoken: string;
  /** Spoken for a credit. Default 'credit'. */
  creditSpoken: string;
  /** Name of the running balance. Default 'Balance'. */
  balance: string;
  /** Accessible name of the list. Default 'Transactions'. */
  list: string;
  /** Empty-state title. Default 'No transactions'. */
  empty: string;
  /** Empty-state body. */
  emptyBody?: string;
  /** Error title. Default 'Could not load transactions'. */
  error: string;
  /** Retry button words. Default 'Try again'. */
  retry: string;
  /** Loading region name. Default 'Loading transactions'. */
  loading: string;
  /** Pager name. Default 'Transaction pages'. */
  pages: string;
  /** Shown for an unreadable date. Default 'Unknown date'. */
  unknownDate: string;
}

export const DEFAULT_TRANSACTION_LIST_LABELS: TransactionListLabels = {
  debit: 'Dr', credit: 'Cr', debitSpoken: 'debit', creditSpoken: 'credit', balance: 'Balance', list: 'Transactions',
  empty: 'No transactions', error: 'Could not load transactions', retry: 'Try again', loading: 'Loading transactions', pages: 'Transaction pages', unknownDate: 'Unknown date',
};

export interface TransactionRowProps {
  /** The entry to draw. */
  transaction: BankTransaction;
  /** Money format; default NPR. */
  money?: MoneyFormatConfig;
  /** Show the entry's running balance when it has one. Default false. */
  showBalance?: boolean;
  /** Also show the status pill for completed entries. Default false (only pending, failed and reversed show). */
  showCompletedStatus?: boolean;
  /** Replace the words. */
  labels?: Partial<TransactionListLabels>;
  /** Translate the status words. */
  statusLabels?: Partial<Record<TransactionStatusValue, string>>;
  /** Longest reference shown; longer ones are shortened from the middle. Default 24. */
  referenceMaxLength?: number;
}

const Arrow = ({ credit }: { credit: boolean }) => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className="pu-tx-arrow" data-direction={credit ? 'credit' : 'debit'}>
    <path d={credit ? 'M12 4 4 12M4 6.5V12h5.5' : 'M4 12 12 4M6.5 4H12v5.5'} />
  </svg>
);

/** One entry as a list item. Exported so a virtualised list can draw rows itself; the key is up to the caller (use `transaction.id`). */
export function TransactionRow({ transaction: t, money = nepalMoneyPreset, showBalance, showCompletedStatus, labels, statusLabels, referenceMaxLength = 24 }: TransactionRowProps) {
  const words = { ...DEFAULT_TRANSACTION_LIST_LABELS, ...labels };
  const direction = directionOf(t.amount);
  const credit = direction === 'credit';
  const reference = formatTransactionReference(t.reference, { maxLength: referenceMaxLength });
  return (
    <li className="pu-tx" data-direction={direction} data-status={t.status} data-tx-id={t.id}>
      <span className="pu-tx-main">
        <span className="pu-tx-name">{t.counterparty}</span>
        <span className="pu-tx-sub">
          {reference && <span className="pu-tx-ref">{reference}</span>}
          {t.category && <span className="pu-tx-cat">{t.category}</span>}
          {(t.status !== 'completed' || showCompletedStatus) && <TransactionStatus status={t.status} size="sm" labels={statusLabels} />}
        </span>
      </span>
      <span className="pu-tx-money">
        <span className="pu-tx-amount">
          <Arrow credit={credit} />
          <MoneyDisplay value={t.amount} preset={money} signDisplay="always" />
          <span className="pu-tx-dir" aria-hidden="true">{credit ? words.credit : words.debit}</span>
          <span className="kit-sr">{credit ? words.creditSpoken : words.debitSpoken}</span>
        </span>
        {showBalance && t.balance !== undefined && t.balance !== null && (
          <span className="pu-tx-bal">{words.balance} <MoneyDisplay value={t.balance} preset={money} /></span>
        )}
      </span>
    </li>
  );
}

export interface TransactionListProps {
  /** Entries in the order to show (the list groups consecutive entries with the same date; it does not sort). Each needs a unique stable `id`. */
  transactions: readonly BankTransaction[];
  /** Calendar for the date headings: 'ad' (Gregorian, default) or 'bs' (Bikram Sambat, 1975 to 2099 only). */
  calendar?: 'ad' | 'bs';
  /** Language for the date words and BS digits. Default 'en'. */
  language?: 'en' | 'ne';
  /** Money format; default NPR with lakh/crore grouping. */
  money?: MoneyFormatConfig;
  /** Show each entry's own running balance when it has one. Default false. */
  showBalance?: boolean;
  /** Also show the status pill for completed entries. Default false. */
  showCompletedStatus?: boolean;
  /** Entries per page. When set, a Pagination footer appears. Omit to show all. */
  pageSize?: number;
  /** Controlled page (from 1). Omit for an internal page state. */
  page?: number;
  /** Called with the page the reader chose. */
  onPageChange?: (page: number) => void;
  /** The entries are not here yet: skeleton rows hold the space. */
  loading?: boolean;
  /** The list failed to load: shows the error state. */
  error?: boolean;
  /** Retry button handler; without it no button is drawn. */
  onRetry?: () => void;
  /** Replace the words. */
  labels?: Partial<TransactionListLabels>;
  /** Translate the status words. */
  statusLabels?: Partial<Record<TransactionStatusValue, string>>;
  /** Extra class for layout. */
  className?: string;
  /** Sets `data-testid` on the root. */
  testId?: string;
}

function dateHeading(date: string, calendar: 'ad' | 'bs', language: 'en' | 'ne', unknown: string): ReactNode {
  const parsed = parseCalendarDate(date);
  if (!parsed) return unknown;
  try {
    if (calendar === 'bs') return formatBSDate(gregorianToBS(parsed), { language });
    return formatCalendarDate(parsed, { language });
  } catch {
    return formatCalendarDate(parsed, { language });
  }
}

export function TransactionList({
  transactions, calendar = 'ad', language = 'en', money = nepalMoneyPreset, showBalance, showCompletedStatus, pageSize, page, onPageChange,
  loading, error, onRetry, labels, statusLabels, className, testId,
}: TransactionListProps) {
  const words = { ...DEFAULT_TRANSACTION_LIST_LABELS, ...labels };
  const uid = useId();
  const [own, setOwn] = useState(1);
  const current = page ?? own;
  const classes = `pu-txlist${className ? ` ${className}` : ''}`;
  if (loading) {
    return (
      <div className={classes} aria-busy="true" data-testid={testId}>
        <Skeleton width={120} height={14} label={words.loading} />
        <div className="pu-txrows">
          {[0, 1, 2, 3].map((i) => <div key={i} className="pu-tx pu-tx-skel"><Skeleton width="45%" height={16} /><Skeleton width={90} height={16} /></div>)}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={classes} data-testid={testId}>
        <EmptyState bare role="alert" title={words.error} action={onRetry ? <Button variant="secondary" size="sm" onClick={onRetry}>{words.retry}</Button> : undefined} />
      </div>
    );
  }
  if (transactions.length === 0) {
    return <div className={classes} data-testid={testId}><EmptyState bare role="status" title={words.empty} body={words.emptyBody} /></div>;
  }
  const paged = pageSize ? paginate(transactions.length, current, pageSize) : null;
  const visible = paged ? transactions.slice(paged.startIndex, paged.endIndex) : transactions;
  const groups: { date: string; rows: BankTransaction[] }[] = [];
  for (const t of visible) {
    const last = groups[groups.length - 1];
    if (last && last.date === t.date) last.rows.push(t);
    else groups.push({ date: t.date, rows: [t] });
  }
  return (
    <div className={classes} role="group" aria-label={words.list} data-testid={testId}>
      {groups.map((g, index) => (
        <div key={`${g.date}-${g.rows[0]!.id}`} className="pu-txgroup">
          <h3 className="pu-txgroup-h" id={`${uid}-h-${index}`}><time dateTime={parseCalendarDate(g.date) ? g.date : undefined}>{dateHeading(g.date, calendar, language, words.unknownDate)}</time></h3>
          <ul className="pu-txrows" aria-labelledby={`${uid}-h-${index}`}>
            {g.rows.map((t) => <TransactionRow key={t.id} transaction={t} money={money} showBalance={showBalance} showCompletedStatus={showCompletedStatus} labels={labels} statusLabels={statusLabels} />)}
          </ul>
        </div>
      ))}
      {paged && paged.pageCount > 1 && (
        <Pagination page={paged.page} total={paged.total} pageSize={paged.pageSize} onPageChange={(next) => { setOwn(next); onPageChange?.(next); }} label={words.pages} testId={testId ? `${testId}-pager` : undefined} />
      )}
    </div>
  );
}
