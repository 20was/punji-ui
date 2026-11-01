'use client';

/**
 * ReconciliationMatcher: bank statement lines beside ledger entries. Tick lines on both sides and match them when
 * they agree to the paisa (one-to-one, one-to-many or many-to-many), accept exact-amount suggestions, undo a match,
 * and read the reconciliation statement: balance per bank plus deposits in transit less outstanding payments,
 * against balance per books plus what the bank booked that the books have not. Controlled: the host keeps the
 * matches. Exact bigint arithmetic from `reconcile.ts`.
 *
 * It matches what it is given; it does not post journals, fetch statements or decide what is a bank error. An
 * unmatched statement line can offer an action (`onCreateEntry`) so the host books it.
 */
import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import { Checkbox } from '../checkbox/Checkbox.tsx';
import { nepalLedgerMoney } from '../debit-credit/DebitCredit.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import type { MoneyFormatConfig } from '../money/money.ts';
import { formatCalendarDate, type CalendarDate } from '../nepal/date-only.ts';
import { RetryNote } from '../retry-note/RetryNote.tsx';
import { Note } from '../states/States.tsx';
import { reconciliationSummary, suggestMatches, sumAmounts, type ReconcileItem, type ReconcileMatch, type ReconciliationSummary } from './reconcile.ts';

export * from './reconcile.ts';

export interface ReconciliationMatcherLabels {
  statement: string; ledger: string; selected: string; difference: string; match: string; autoMatch: string; clear: string;
  matched: string; unmatch: string; noneLeft: string; noneMatched: string; summary: string;
  statementBalance: string; depositsInTransit: string; outstandingPayments: string; adjustedStatement: string;
  ledgerBalance: string; unrecordedReceipts: string; unrecordedPayments: string; adjustedLedger: string;
  reconciled: string; notReconciled: string; invalid: string; book: string;
  items: (count: number) => string; matchedNow: (statement: number, ledger: number) => string; unmatchedNow: string;
  suggested: (count: number) => string; cleared: string; mustAgree: string;
}

export const DEFAULT_RECONCILIATION_LABELS: ReconciliationMatcherLabels = {
  statement: 'Bank statement', ledger: 'Ledger', selected: 'Selected', difference: 'Difference', match: 'Match selected', autoMatch: 'Accept suggestions', clear: 'Clear selection',
  matched: 'Matched', unmatch: 'Unmatch', noneLeft: 'Every line is matched.', noneMatched: 'Nothing matched yet. Tick lines on both sides that agree, then match them.', summary: 'Reconciliation',
  statementBalance: 'Balance per bank statement', depositsInTransit: 'Add: deposits in transit', outstandingPayments: 'Less: outstanding payments', adjustedStatement: 'Adjusted bank balance',
  ledgerBalance: 'Balance per books', unrecordedReceipts: 'Add: receipts not in the books', unrecordedPayments: 'Less: charges and payments not in the books', adjustedLedger: 'Adjusted book balance',
  reconciled: 'Reconciled', notReconciled: 'Not reconciled, difference', invalid: 'These lines have an amount that is not exact or an id used twice, so nothing can be matched.', book: 'Book',
  items: (count) => `${count} ${count === 1 ? 'line' : 'lines'}`,
  matchedNow: (s, l) => `Matched ${s} statement ${s === 1 ? 'line' : 'lines'} with ${l} ledger ${l === 1 ? 'entry' : 'entries'}.`,
  unmatchedNow: 'Match undone.', suggested: (count) => `${count} ${count === 1 ? 'suggestion' : 'suggestions'} accepted.`, cleared: 'Selection cleared.',
  mustAgree: 'Select at least one line on each side with equal totals to match.',
};

export interface ReconciliationMatcherProps {
  /** Lines from the bank statement, signed: money in positive, money out negative. */
  statement: readonly ReconcileItem[];
  /** Entries posted to the bank account in the books, signed the same way. */
  ledger: readonly ReconcileItem[];
  /** The matches made so far (controlled). */
  matches: readonly ReconcileMatch[];
  /** Called with the next matches after a match, an accepted suggestion or an undo. */
  onMatchesChange: (matches: ReconcileMatch[]) => void;
  /** Closing balance on the statement. With `ledgerBalance`, shows the reconciliation statement. */
  statementBalance?: bigint;
  /** Closing balance of the account in the books on the same date. */
  ledgerBalance?: bigint;
  /** Offer a "Book" action on an unmatched statement line (bank charges, interest), so the host can post it. */
  onCreateEntry?: (item: ReconcileItem) => void;
  /** Most days between dates for a suggestion. Default 5. */
  dateWindow?: number;
  /** Makes a fresh id for a manual match. Default: `m-` and the first statement id. */
  newMatchId?: (statementIds: readonly string[], ledgerIds: readonly string[]) => string;
  /** Currency and locale. Default NPR, en-IN grouping, no currency mark. */
  money?: MoneyFormatConfig;
  /** How a date is written. Default `formatCalendarDate`. */
  formatDate?: (date: CalendarDate) => string;
  /** Heading level of the panel, matched and summary headings. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Height of each list before it scrolls (the list is then a focusable region). Default 360. */
  maxHeight?: number | string;
  /** Words, in the reader's language. */
  labels?: Partial<ReconciliationMatcherLabels>;
  /** ready (default), loading (a status line) or error (`errorLabel` with a retry). */
  state?: 'ready' | 'loading' | 'error';
  /** The status line while loading. */
  loadingLabel?: string;
  /** What failed, shown with the retry button when `state` is `error`. */
  errorLabel?: ReactNode;
  /** The retry button's words. Default 'Try again'. */
  retryLabel?: string;
  /** Called when the retry button is pressed. */
  onRetry?: () => void;
  /** Extra class on the root element (layout only). */
  className?: string;
  /** Sets `data-testid` on the root; parts get `${testId}-match`, `-auto`, `-difference`, `-s-<id>`, `-l-<id>` and so on. */
  testId?: string;
}

type Side = 'statement' | 'ledger';

const uniqueIds = (items: readonly ReconcileItem[]) => new Set(items.map((item) => item.id)).size === items.length;
const describe = (item: ReconcileItem) => item.description ?? item.reference ?? item.id;
const byId = (items: readonly ReconcileItem[], ids: readonly string[]) => items.filter((item) => ids.includes(item.id));

export function ReconciliationMatcher({
  statement, ledger, matches, onMatchesChange, statementBalance, ledgerBalance, onCreateEntry, dateWindow = 5, newMatchId,
  money = nepalLedgerMoney, formatDate = formatCalendarDate, headingLevel = 3, maxHeight = 360, labels, state = 'ready',
  loadingLabel = 'Loading the statement…', errorLabel = 'The statement could not be loaded.', retryLabel = 'Try again', onRetry, className, testId,
}: ReconciliationMatcherProps) {
  const words = { ...DEFAULT_RECONCILIATION_LABELS, ...labels };
  const id = useId();
  const [picked, setPicked] = useState<{ statement: readonly string[]; ledger: readonly string[] }>({ statement: [], ledger: [] });
  const [said, setSaid] = useState('');
  const H = `h${headingLevel}` as 'h3';
  const t = (part: string) => (testId ? `${testId}-${part}` : undefined);

  const computed = useMemo(() => {
    try {
      const summary = reconciliationSummary({ statement, ledger, matches, statementBalance: statementBalance ?? 0n, ledgerBalance: ledgerBalance ?? 0n });
      if (!uniqueIds(statement) || !uniqueIds(ledger)) return null;
      return { summary, suggestions: suggestMatches(statement, ledger, { matched: matches, dateWindow }) };
    } catch {
      return null;
    }
  }, [statement, ledger, matches, statementBalance, ledgerBalance, dateWindow]);

  if (state === 'error') return <RetryNote retryLabel={retryLabel} onRetry={onRetry} testId={testId}>{errorLabel}</RetryNote>;
  if (state === 'loading') return <div className={`pu-recon${className ? ` ${className}` : ''}`} data-testid={testId} aria-busy="true"><Note>{<span role="status">{loadingLabel}</span>}</Note></div>;
  if (!computed) return <div role="alert" data-testid={testId}><Note tone="error">{words.invalid}</Note></div>;
  const { summary, suggestions } = computed;

  const open = { statement: new Set(summary.unmatchedStatement.map((i) => i.id)), ledger: new Set(summary.unmatchedLedger.map((i) => i.id)) };
  const selS = picked.statement.filter((x) => open.statement.has(x));
  const selL = picked.ledger.filter((x) => open.ledger.has(x));
  const totalS = sumAmounts(statement.filter((i) => selS.includes(i.id)));
  const totalL = sumAmounts(ledger.filter((i) => selL.includes(i.id)));
  const difference = totalS - totalL;
  const canMatch = selS.length > 0 && selL.length > 0 && difference === 0n;

  const toggle = (side: Side, itemId: string, on: boolean) =>
    setPicked((current) => ({ ...current, [side]: on ? [...current[side], itemId] : current[side].filter((x) => x !== itemId) }));
  const match = () => {
    if (!canMatch) {
      setSaid(words.mustAgree);
      return;
    }
    const matchId = newMatchId ? newMatchId(selS, selL) : `m-${selS[0]}`;
    onMatchesChange([...matches, { id: matchId, statementIds: selS, ledgerIds: selL }]);
    setPicked({ statement: [], ledger: [] });
    setSaid(words.matchedNow(selS.length, selL.length));
  };
  const accept = () => {
    if (!suggestions.length) return;
    onMatchesChange([...matches, ...suggestions]);
    setPicked({ statement: [], ledger: [] });
    setSaid(words.suggested(suggestions.length));
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      match();
    }
  };
  const amount = (value: bigint, part?: string) => <MoneyDisplay value={value} preset={money} testId={part ? t(part) : undefined} />;

  const panel = (side: Side, items: ReconcileItem[], selected: readonly string[], total: bigint) => {
    const headingId = `${id}-${side}`;
    const unmatchedTotal = sumAmounts(items);
    return (
      <div className="pu-recon-panel" data-testid={t(side)}>
        <div className="pu-recon-panel-head">
          <H id={headingId} className="pu-recon-title">{words[side]}</H>
          <span className="pu-recon-count">{words.items(items.length)} · {amount(unmatchedTotal)}</span>
        </div>
        {items.length ? (
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling list must take focus to scroll by keyboard
          <div className="pu-recon-list" role="region" aria-labelledby={headingId} tabIndex={0} style={{ maxHeight }}>
            <ul>
              {items.map((item) => (
                <li key={item.id} className={selected.includes(item.id) ? 'is-on' : undefined}>
                  <Checkbox
                    checked={selected.includes(item.id)}
                    onChange={(on) => toggle(side, item.id, on)}
                    end={<span className={`pu-recon-amt ${item.amount < 0n ? 'is-out' : 'is-in'}`}>{amount(item.amount)}</span>}
                    testId={t(`${side === 'statement' ? 's' : 'l'}-${item.id}`)}
                  >
                    <span className="pu-recon-desc">{describe(item)}</span>
                    <span className="pu-recon-meta">
                      {formatDate(item.date)}
                      {item.reference && item.description ? ` · ${item.reference}` : ''}
                    </span>
                  </Checkbox>
                  {side === 'statement' && onCreateEntry && (
                    <Button size="sm" variant="ghost" onClick={() => onCreateEntry(item)} aria-label={`${words.book}: ${describe(item)}`} testId={t(`book-${item.id}`)}>
                      {words.book}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="pu-recon-empty">{words.noneLeft}</p>
        )}
        <p className="pu-recon-sel">
          <span>{words.selected}</span> {amount(total, `${side}-selected`)}
        </p>
      </div>
    );
  };

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- Ctrl+Enter from any line or button inside matches the ticked lines
    <div className={`pu-recon${className ? ` ${className}` : ''}`} data-testid={testId} onKeyDown={onKeyDown}>
      <div className="pu-recon-panels">
        {panel('statement', summary.unmatchedStatement, selS, totalS)}
        {panel('ledger', summary.unmatchedLedger, selL, totalL)}
      </div>
      <div className="pu-recon-bar">
        <p className={`pu-recon-diff${difference === 0n ? '' : ' is-off'}`}>
          <span>{words.difference}</span> {amount(difference, 'difference')}
        </p>
        <div className="pu-recon-actions">
          <Button size="sm" onClick={match} aria-disabled={!canMatch || undefined} aria-keyshortcuts="Control+Enter Meta+Enter" testId={t('match')}>
            {words.match}
          </Button>
          <Button size="sm" variant="secondary" onClick={accept} disabled={!suggestions.length} testId={t('auto')}>
            {words.autoMatch}
            {suggestions.length ? ` (${suggestions.length})` : ''}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setPicked({ statement: [], ledger: [] });
              setSaid(words.cleared);
            }}
            disabled={!selS.length && !selL.length}
          >
            {words.clear}
          </Button>
        </div>
      </div>
      <section className="pu-recon-matched" aria-labelledby={`${id}-matched`}>
        <H id={`${id}-matched`} className="pu-recon-title">
          {words.matched} ({matches.length})
        </H>
        {matches.length ? (
          <ul data-testid={t('matches')}>
            {matches.map((m) => {
              const s = byId(statement, m.statementIds);
              const l = byId(ledger, m.ledgerIds);
              const off = summary.unbalancedMatches.includes(m.id);
              return (
                <li key={m.id} className={off ? 'is-off' : undefined}>
                  <span className="pu-recon-pair">
                    <span>{s.map(describe).join(', ')}</span>
                    <span className="pu-recon-meta">{l.map(describe).join(', ')}</span>
                  </span>
                  <span className="pu-recon-amt">{amount(sumAmounts(s))}</span>
                  <Button size="sm" variant="ghost" aria-label={`${words.unmatch}: ${s.map(describe).join(', ')}`} testId={t(`unmatch-${m.id}`)} onClick={() => {
                    onMatchesChange(matches.filter((x) => x.id !== m.id));
                    setSaid(words.unmatchedNow);
                  }}>
                    {words.unmatch}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="pu-recon-empty">{words.noneMatched}</p>
        )}
      </section>
      {statementBalance !== undefined && ledgerBalance !== undefined && <Summary summary={summary} statementBalance={statementBalance} ledgerBalance={ledgerBalance} words={words} amount={amount} H={H} id={`${id}-sum`} />}
      <p className="kit-sr" role="status" aria-live="polite">{said}</p>
    </div>
  );
}

function Summary({ summary, statementBalance, ledgerBalance, words, amount, H, id }: {
  summary: ReconciliationSummary; statementBalance: bigint; ledgerBalance: bigint; words: ReconciliationMatcherLabels;
  amount: (value: bigint, part?: string) => ReactNode; H: 'h3'; id: string;
}) {
  const row = (label: string, value: bigint, part: string, strong = false) => (
    <div className={strong ? 'is-total' : undefined}>
      <dt>{label}</dt>
      <dd>{amount(value, part)}</dd>
    </div>
  );
  return (
    <section className="pu-recon-summary" aria-labelledby={id}>
      <H id={id} className="pu-recon-title">{words.summary}</H>
      <div className="pu-recon-columns">
        <dl>
          {row(words.statementBalance, statementBalance, 'statement-balance')}
          {row(words.depositsInTransit, summary.depositsInTransit, 'in-transit')}
          {row(words.outstandingPayments, summary.outstandingPayments, 'outstanding')}
          {row(words.adjustedStatement, summary.adjustedStatement, 'adjusted-statement', true)}
        </dl>
        <dl>
          {row(words.ledgerBalance, ledgerBalance, 'ledger-balance')}
          {row(words.unrecordedReceipts, summary.unrecordedReceipts, 'unrecorded-in')}
          {row(words.unrecordedPayments, summary.unrecordedPayments, 'unrecorded-out')}
          {row(words.adjustedLedger, summary.adjustedLedger, 'adjusted-ledger', true)}
        </dl>
      </div>
      <p className={`pu-recon-status${summary.reconciled ? ' is-ok' : ' is-off'}`}>
        {summary.reconciled ? <>✓ {words.reconciled}</> : <>{words.notReconciled} {amount(summary.difference, 'status-difference')}</>}
      </p>
    </section>
  );
}
