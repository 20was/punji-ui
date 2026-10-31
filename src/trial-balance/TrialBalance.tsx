'use client';

/**
 * TrialBalance: accounts down the side, a debit and a credit column, a totals
 * row, and a status line that says "Balanced" or "Out of balance by X" in words
 * with a different icon for each, never by colour alone. Give it ledger
 * entries or journals; the sums are exact bigint arithmetic from `trialBalance`.
 * `basis="net"` (default) shows each account's net balance on its own side;
 * `basis="totals"` shows the gross debits and credits posted to it.
 *
 * It displays the books it is given; it does not post, close or correct them,
 * and a balanced trial balance does not prove the books are right. The server
 * that stores them must validate and total them again.
 */
import { useMemo, type CSSProperties, type ReactNode } from 'react';

import { BalanceStatus, type BalanceStatusLabels } from '../internal/BalanceStatus.tsx';
import { Cell, DataListRow, DataTable, type Column } from '../table/Table.tsx';
import { DebitCredit, nepalLedgerMoney } from '../debit-credit/DebitCredit.tsx';
import { RetryNote } from '../retry-note/RetryNote.tsx';
import { Note } from '../states/States.tsx';
import { trialBalance, type JournalEntry, type LedgerEntry } from '../ledger/core.ts';
import type { MoneyFormatConfig } from '../money/money.ts';

export interface TrialBalanceLabels extends BalanceStatusLabels {
  account: string;
  debit: string;
  credit: string;
  total: string;
  invalid: string;
}

export const DEFAULT_TRIAL_BALANCE_LABELS: TrialBalanceLabels = {
  account: 'Account', debit: 'Debit', credit: 'Credit', total: 'Total', balanced: 'Balanced', outOfBalance: 'Out of balance by',
  debitsExceed: 'debits exceed credits', creditsExceed: 'credits exceed debits',
  invalid: 'An entry has a negative, non-exact or two-sided amount, so no trial balance is shown.',
};

export interface TrialBalanceProps {
  caption: string;
  /** Ledger entries, or journals (not a mix). Accounts appear in order of first posting. */
  data: readonly LedgerEntry[] | readonly JournalEntry[];
  /** net: each account's balance on its own side (default). totals: gross debits and credits posted. */
  basis?: 'net' | 'totals';
  renderAccount?: (account: string) => ReactNode;
  money?: MoneyFormatConfig;
  labels?: Partial<TrialBalanceLabels>;
  bare?: boolean;
  maxHeight?: number | string;
  state?: 'ready' | 'loading' | 'error';
  emptyLabel?: ReactNode;
  loadingLabel?: string;
  errorLabel?: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  testId?: string;
}

type Key = 'account' | 'debit' | 'credit';

export function TrialBalance({
  caption, data, basis = 'net', renderAccount, money = nepalLedgerMoney, labels, bare, maxHeight, state = 'ready', emptyLabel = 'No accounts to show.',
  loadingLabel = 'Loading trial balance…', errorLabel = 'The trial balance could not be loaded.', retryLabel = 'Try again', onRetry, testId,
}: TrialBalanceProps) {
  const words = { ...DEFAULT_TRIAL_BALANCE_LABELS, ...labels };
  const result = useMemo(() => {
    if (state !== 'ready') return null;
    try { return trialBalance(data); } catch { return 'invalid' as const; }
  }, [data, state]);
  if (state === 'error') return <RetryNote retryLabel={retryLabel} onRetry={onRetry ?? (() => undefined)} testId={testId}>{errorLabel}</RetryNote>;
  if (result === 'invalid') return <div role="alert" data-testid={testId}><Note tone="error">{words.invalid}</Note></div>;
  const columns: Column<Key>[] = [
    { key: 'account', label: words.account },
    { key: 'debit', label: words.debit, num: true },
    { key: 'credit', label: words.credit, num: true },
  ];
  const shown = (account: { debit: bigint; credit: bigint; net: bigint }) => basis === 'totals'
    ? { debit: account.debit, credit: account.credit }
    : { debit: account.net > 0n ? account.net : 0n, credit: account.net < 0n ? -account.net : 0n };
  const totals = result ? (basis === 'totals' ? result.totals : result.netTotals) : null;
  const cell = (side: 'debit' | 'credit', amount: bigint) => <DebitCredit value={side === 'debit' ? amount : -amount} variant="column" column={side} preset={money} />;
  const rows = result?.accounts ?? [];
  return (
    <div className="pu-trial" data-balanced={result ? (result.balanced ? 'true' : 'false') : undefined} style={maxHeight === undefined ? undefined : { '--ledger-max-h': typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } as CSSProperties} data-testid={testId}>
      <DataTable caption={caption} columns={columns} bare={bare} loading={state === 'loading'} loadingLabel={loadingLabel} empty={emptyLabel} testId={testId ? `${testId}-table` : undefined}>
        {result && rows.length ? [
          ...rows.map(account => {
            const { debit, credit } = shown(account);
            return (
              <DataListRow key={account.account} testId={testId ? `${testId}-row-${account.account}` : undefined}>
                <Cell header>{renderAccount ? renderAccount(account.account) : account.account}</Cell>
                <Cell num>{debit > 0n || credit === 0n ? cell('debit', debit) : null}</Cell>
                <Cell num>{credit > 0n ? cell('credit', credit) : null}</Cell>
              </DataListRow>
            );
          }),
          <DataListRow key="total" testId={testId ? `${testId}-total` : undefined}>
            <th scope="row" className="pu-ledger-label pu-ledger-total">{words.total}</th>
            <td className="num pu-ledger-total" data-testid={testId ? `${testId}-total-debit` : undefined}>{cell('debit', totals!.debit)}</td>
            <td className="num pu-ledger-total" data-testid={testId ? `${testId}-total-credit` : undefined}>{cell('credit', totals!.credit)}</td>
          </DataListRow>,
        ] : null}
      </DataTable>
      {result && rows.length > 0 && <BalanceStatus difference={result.difference} money={money} labels={words} testId={testId ? `${testId}-status` : undefined} />}
    </div>
  );
}
