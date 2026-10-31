/**
 * Pure double-entry arithmetic for display: journals, ledgers, running balances
 * and trial balances. Every amount is a non-negative bigint in minor units
 * (paisa, cents); a line is a debit or a credit, never both and never negative.
 * Nothing here rounds, converts currency, knows a chart of accounts or applies
 * any tax rule. These are arithmetic helpers, not an accounting system: the
 * server that stores the books must validate them again. No React, no browser
 * globals.
 */
import type { CalendarDate } from '../nepal/date-only.ts';

export type { CalendarDate };

export type NormalSide = 'debit' | 'credit';

/** One posting to one account, as a general ledger lists it. */
export interface LedgerEntry {
  id: string;
  date: CalendarDate;
  account: string;
  description?: string;
  /** Minor units, 0n or more. */
  debit: bigint;
  /** Minor units, 0n or more. A line has a debit or a credit, not both. */
  credit: bigint;
  reference?: string;
}

export interface JournalLine { account: string; debit: bigint; credit: bigint }

/** One business event posted as two or more lines that should balance. */
export interface JournalEntry {
  id: string;
  date: CalendarDate;
  memo?: string;
  lines: readonly JournalLine[];
}

export interface Totals { debit: bigint; credit: bigint }

/** Throws when the amounts are not valid ledger amounts: not bigint (TypeError), negative, or both sides set (RangeError). */
export function assertValidAmounts(line: { debit: bigint; credit: bigint }): void {
  if (typeof line.debit !== 'bigint' || typeof line.credit !== 'bigint') throw new TypeError('Ledger amounts are bigint minor units');
  if (line.debit < 0n || line.credit < 0n) throw new RangeError('Ledger amounts must not be negative; use the other side instead');
  if (line.debit > 0n && line.credit > 0n) throw new RangeError('A ledger line is a debit or a credit, not both');
}

function sumLines(lines: readonly { debit: bigint; credit: bigint }[]): Totals {
  let debit = 0n;
  let credit = 0n;
  for (const line of lines) {
    assertValidAmounts(line);
    debit += line.debit;
    credit += line.credit;
  }
  return { debit, credit };
}

/** Exact debit and credit totals of a journal's lines. Throws on an invalid line. */
export function journalTotals(journal: Pick<JournalEntry, 'lines'>): Totals {
  return sumLines(journal.lines);
}

/** Debits minus credits. Zero when balanced; positive when debits exceed credits. */
export function journalImbalance(journal: Pick<JournalEntry, 'lines'>): bigint {
  const { debit, credit } = journalTotals(journal);
  return debit - credit;
}

/** True when total debits equal total credits. A journal with no lines is trivially equal; check `lines.length` if you need two. */
export function isBalanced(journal: Pick<JournalEntry, 'lines'>): boolean {
  return journalImbalance(journal) === 0n;
}

/** The ledger postings of journals, in order. Each entry's id is `${journal.id}:${lineIndex}` and its reference the journal id. */
export function journalsToEntries(journals: readonly JournalEntry[]): LedgerEntry[] {
  return journals.flatMap(journal => journal.lines.map((line, index): LedgerEntry => {
    assertValidAmounts(line);
    return {
      id: `${journal.id}:${index}`, date: journal.date, account: line.account, debit: line.debit, credit: line.credit,
      reference: journal.id, ...(journal.memo === undefined ? {} : { description: journal.memo }),
    };
  }));
}

/** Movement of one entry on an account's normal side: debit − credit for a debit-normal account, credit − debit otherwise. */
export function signedMovement(entry: { debit: bigint; credit: bigint }, normal: NormalSide): bigint {
  assertValidAmounts(entry);
  return normal === 'debit' ? entry.debit - entry.credit : entry.credit - entry.debit;
}

export interface BalanceOptions {
  /** The side that increases this account: assets and expenses are 'debit'; liabilities, equity and income are 'credit'. */
  normal: NormalSide;
  /** Balance before the first entry, on the normal side (negative when it sits on the other side). Default 0n. */
  opening?: bigint;
}

export interface RunningRow { entry: LedgerEntry; balance: bigint }

/**
 * The balance after each entry, in the order given (sort by date yourself).
 * A negative balance is on the opposite side to `normal`. Every entry is
 * assumed to belong to the account being listed; use `accountBalance` to pick one.
 */
export function runningBalance(entries: readonly LedgerEntry[], options: BalanceOptions): RunningRow[] {
  let balance = options.opening ?? 0n;
  if (typeof balance !== 'bigint') throw new TypeError('Opening balance is bigint minor units');
  return entries.map(entry => {
    balance += signedMovement(entry, options.normal);
    return { entry, balance };
  });
}

/** Closing balance of one account: opening + Σ(normal side − other side) over its entries. */
export function accountBalance(entries: readonly LedgerEntry[], account: string, options: BalanceOptions): bigint {
  let balance = options.opening ?? 0n;
  for (const entry of entries) if (entry.account === account) balance += signedMovement(entry, options.normal);
  return balance;
}

export interface TrialBalanceAccount {
  account: string;
  /** Σ debits posted to the account. */
  debit: bigint;
  /** Σ credits posted to the account. */
  credit: bigint;
  /** debit − credit: positive is a debit balance, negative a credit balance. */
  net: bigint;
}

export interface TrialBalanceResult {
  /** One row per account, in order of first appearance. */
  accounts: TrialBalanceAccount[];
  /** Σ of all debits and all credits. */
  totals: Totals;
  /** Σ of net debit balances and Σ of net credit balances. Equal exactly when `totals` are. */
  netTotals: Totals;
  /** Debits equal credits across the whole input. */
  balanced: boolean;
  /** debit − credit over the whole input; zero when balanced. */
  difference: bigint;
}

const isJournal = (item: LedgerEntry | JournalEntry): item is JournalEntry => 'lines' in item;

/**
 * Per-account debit and credit totals over ledger entries or journals (not a mix).
 * `balanced` says whether the books as a whole have equal debits and credits;
 * it cannot say that each journal does (two opposite errors cancel), so check
 * `isBalanced` per journal too.
 */
export function trialBalance(input: readonly LedgerEntry[] | readonly JournalEntry[]): TrialBalanceResult {
  const items: readonly (LedgerEntry | JournalEntry)[] = input;
  const journals = items.filter(isJournal).length;
  if (journals !== 0 && journals !== items.length) throw new TypeError('Pass ledger entries or journals, not both');
  const lines: readonly { account: string; debit: bigint; credit: bigint }[] = journals
    ? (items as readonly JournalEntry[]).flatMap(journal => journal.lines)
    : (items as readonly LedgerEntry[]);
  const byAccount = new Map<string, TrialBalanceAccount>();
  let debit = 0n;
  let credit = 0n;
  for (const line of lines) {
    assertValidAmounts(line);
    let row = byAccount.get(line.account);
    if (!row) byAccount.set(line.account, row = { account: line.account, debit: 0n, credit: 0n, net: 0n });
    row.debit += line.debit;
    row.credit += line.credit;
    row.net = row.debit - row.credit;
    debit += line.debit;
    credit += line.credit;
  }
  const accounts = [...byAccount.values()];
  let netDebit = 0n;
  let netCredit = 0n;
  for (const row of accounts) { if (row.net > 0n) netDebit += row.net; else netCredit -= row.net; }
  return { accounts, totals: { debit, credit }, netTotals: { debit: netDebit, credit: netCredit }, balanced: debit === credit, difference: debit - credit };
}
