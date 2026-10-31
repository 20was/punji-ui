'use client';

/**
 * JournalEntryView: one journal entry with its lines (account, debit, credit),
 * a totals row and a balance status. When debits and credits differ the status
 * says "Out of balance by X" in words with a warning icon, never by colour
 * alone; the totals stay exact. The component only displays the entry it is
 * given: it does not fix, post or reject anything, and the server must
 * validate the journal before it is stored.
 */
import { useMemo, type ReactNode } from 'react';

import { BalanceStatus, type BalanceStatusLabels } from '../internal/BalanceStatus.tsx';
import { Cell, DataListRow, DataTable, type Column } from '../table/Table.tsx';
import { DebitCredit, nepalLedgerMoney } from '../debit-credit/DebitCredit.tsx';
import { Note } from '../states/States.tsx';
import { journalTotals, type JournalEntry } from '../ledger/core.ts';
import { formatCalendarDate, type CalendarDate } from '../nepal/date-only.ts';
import type { MoneyFormatConfig } from '../money/money.ts';

export interface JournalEntryLabels extends BalanceStatusLabels {
  account: string;
  debit: string;
  credit: string;
  total: string;
  /** Shown when a line has a negative, non-exact or two-sided amount. */
  invalid: string;
  empty: string;
}

export const DEFAULT_JOURNAL_LABELS: JournalEntryLabels = {
  account: 'Account', debit: 'Debit', credit: 'Credit', total: 'Total', balanced: 'Balanced', outOfBalance: 'Out of balance by',
  debitsExceed: 'debits exceed credits', creditsExceed: 'credits exceed debits',
  invalid: 'This journal has a line with a negative, non-exact or two-sided amount, so it cannot be totalled.', empty: 'This journal has no lines.',
};

export interface JournalEntryViewProps {
  journal: JournalEntry;
  /** What an account cell holds, for example a link or "1010 Cash". Default the account string. */
  renderAccount?: (account: string) => ReactNode;
  money?: MoneyFormatConfig;
  formatDate?: (date: CalendarDate) => string;
  labels?: Partial<JournalEntryLabels>;
  /** Heading level of the title (2-6). Default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  bare?: boolean;
  testId?: string;
}

type Key = 'account' | 'debit' | 'credit';

export function JournalEntryView({ journal, renderAccount, money = nepalLedgerMoney, formatDate = formatCalendarDate, labels, headingLevel = 3, bare, testId }: JournalEntryViewProps) {
  const words = { ...DEFAULT_JOURNAL_LABELS, ...labels };
  const totals = useMemo(() => { try { return journalTotals(journal); } catch { return null; } }, [journal]);
  const Heading = `h${headingLevel}` as 'h3';
  const title = `${journal.id}${journal.memo ? ` · ${journal.memo}` : ''}`;
  if (totals === null) return <div role="alert" data-testid={testId}><Note tone="error">{words.invalid}</Note></div>;
  const columns: Column<Key>[] = [
    { key: 'account', label: words.account },
    { key: 'debit', label: words.debit, num: true },
    { key: 'credit', label: words.credit, num: true },
  ];
  const difference = totals.debit - totals.credit;
  return (
    <div className="pu-journal" data-balanced={difference === 0n ? 'true' : 'false'} data-testid={testId}>
      <header className="pu-journal-head">
        <Heading className="pu-journal-title">{title}</Heading>
        <time className="pu-journal-date" dateTime={`${String(journal.date.year).padStart(4, '0')}-${String(journal.date.month).padStart(2, '0')}-${String(journal.date.day).padStart(2, '0')}`}>{formatDate(journal.date)}</time>
      </header>
      <DataTable caption={title} columns={columns} bare={bare} empty={words.empty} testId={testId ? `${testId}-table` : undefined}>
        {journal.lines.length ? [
          ...journal.lines.map((line, index) => (
            <DataListRow key={index}>
              <Cell header>{renderAccount ? renderAccount(line.account) : line.account}</Cell>
              <Cell num><DebitCredit value={line.debit - line.credit} variant="column" column="debit" preset={money} /></Cell>
              <Cell num><DebitCredit value={line.debit - line.credit} variant="column" column="credit" preset={money} /></Cell>
            </DataListRow>
          )),
          <DataListRow key="total" testId={testId ? `${testId}-total` : undefined}>
            <th scope="row" className="pu-ledger-label pu-ledger-total">{words.total}</th>
            <td className="num pu-ledger-total" data-testid={testId ? `${testId}-total-debit` : undefined}><DebitCredit value={totals.debit} variant="column" column="debit" preset={money} /></td>
            <td className="num pu-ledger-total" data-testid={testId ? `${testId}-total-credit` : undefined}><DebitCredit value={-totals.credit} variant="column" column="credit" preset={money} /></td>
          </DataListRow>,
        ] : null}
      </DataTable>
      <BalanceStatus difference={difference} money={money} labels={words} testId={testId ? `${testId}-status` : undefined} />
    </div>
  );
}
