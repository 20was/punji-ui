// The accounting app's state: the journals (generated books plus anything posted in the app), the reporting period
// and comparison, and the bank reconciliation's matches. One reducer, so a journal posted on one screen moves the
// ledger, the trial balance, the statements, the dashboard and the reconciliation together.
import { createContext, useContext, type Dispatch } from 'react';
import { isBalanced, type JournalEntry } from '@punji/ui/ledger';
import type { ReconcileItem, ReconcileMatch } from '@punji/ui/reconciliation-matcher';
import type { CalendarDate } from '@punji/ui/nepal/date-only';
import type { FinancialPeriod } from '@punji/ui/period-selector';
import { TODAY, addDays, compareDates, dayNumber, fromDayNumber, rs } from '../shared/books.ts';
import { BANK, PERIODS, generateBooks, ledgerOf, netByAccount, onNormal, profitOf, rangeOf, type Column, type Ledger } from './books.ts';

export type Screen = 'dashboard' | 'ledger' | 'journal' | 'trial' | 'statements' | 'bank' | 'aging' | 'tds' | 'exports';
export type Compare = 'last-year' | 'previous' | 'none';

export const BOOKS = generateBooks();

export interface AcctState {
  journals: readonly JournalEntry[];
  /** Ids of journals posted in the app, newest last. */
  posted: readonly string[];
  periodId: string;
  compare: Compare;
  matches: readonly ReconcileMatch[];
  notice: string;
}

export type Action =
  | { type: 'post'; journal: JournalEntry }
  | { type: 'period'; id: string }
  | { type: 'compare'; compare: Compare }
  | { type: 'matches'; matches: readonly ReconcileMatch[] }
  | { type: 'book'; item: ReconcileItem };

export const initialState = (): AcctState => ({ journals: BOOKS.journals, posted: [], periodId: 'fy-2083', compare: 'last-year', matches: [], notice: '' });

const nextId = (state: AcctState, prefix: string) => `${prefix}-${String(state.posted.length + 1).padStart(4, '0')}`;

export function reducer(state: AcctState, action: Action): AcctState {
  switch (action.type) {
    case 'post': {
      if (!isBalanced(action.journal) || action.journal.lines.length < 2) return { ...state, notice: 'Not posted: debits and credits must be equal.' };
      const journal = { ...action.journal, id: action.journal.id || nextId(state, 'JV') };
      return { ...state, journals: [...state.journals, journal], posted: [...state.posted, journal.id], notice: `Journal ${journal.id} posted.` };
    }
    case 'book': {
      // A charge or interest the bank booked: post it to the books on the statement date, against bank charges or interest.
      const { item } = action;
      const id = nextId(state, 'BK');
      const amount = item.amount < 0n ? -item.amount : item.amount;
      const other = item.amount < 0n ? '5600' : '4100';
      const lines = item.amount < 0n
        ? [{ account: other, debit: amount, credit: 0n }, { account: BANK, debit: 0n, credit: amount }]
        : [{ account: BANK, debit: amount, credit: 0n }, { account: other, debit: 0n, credit: amount }];
      const journal: JournalEntry = { id, date: item.date, memo: `${item.description ?? 'Bank entry'} (from the statement)`, lines };
      return { ...state, journals: [...state.journals, journal], posted: [...state.posted, id], notice: `${item.description ?? 'Bank entry'} booked as ${id}, ${rs(amount)}.` };
    }
    case 'period':
      return { ...state, periodId: action.id };
    case 'compare':
      return { ...state, compare: action.compare };
    case 'matches':
      return { ...state, matches: action.matches, notice: '' };
  }
}

export const periodById = (id: string) => PERIODS.find((p) => p.id === id) ?? PERIODS[0]!;

/** The comparison period: the same kind a year earlier, or the one just before; cut to the same number of days. */
export function comparisonOf(period: FinancialPeriod, compare: Compare): { period: FinancialPeriod; column: Column } | null {
  if (compare === 'none') return null;
  const same = PERIODS.filter((p) => p.kind === period.kind).toSorted((a, b) => compareDates(a.start!, b.start!));
  const index = same.findIndex((p) => p.id === period.id);
  let other: FinancialPeriod | undefined;
  if (compare === 'previous') other = same[index - 1];
  else {
    const target = addDays(period.start!, -365);
    other = same.find((p) => Math.abs(dayNumber(p.start!) - dayNumber(target)) <= 3);
  }
  if (!other) return null;
  const { from, to } = rangeOf(period);
  const days = dayNumber(to) - dayNumber(from);
  const end = Math.min(dayNumber(other.end!), dayNumber(other.start!) + days);
  return { period: other, column: { key: 'cmp', from: other.start!, to: fromDayNumber(end) } };
}

export interface Derived {
  ledger: Ledger;
  /** Balances at the session date (debit − credit). */
  now: Map<string, bigint>;
  /** Bank ledger lines in the reconciliation month, as reconciliation items. */
  bankItems: ReconcileItem[];
  /** Book balance of the bank account at the statement's end. */
  bankAtStatement: bigint;
  /** Profit for FY 2083/84 to date. */
  ytd: { income: bigint; expenses: bigint; profit: bigint };
  /** Unsettled invoices and bills as of the session date. */
  receivables: typeof BOOKS.invoices;
  payables: typeof BOOKS.bills;
}

export function derive(state: AcctState): Derived {
  const ledger = ledgerOf(state.journals);
  const now = netByAccount(ledger, null, TODAY);
  const month = BOOKS.statement.month;
  const from = dayNumber(month.start!);
  const to = dayNumber(month.end!);
  const bankItems: ReconcileItem[] = [];
  ledger.entries.forEach((e, i) => {
    const d = ledger.days[i]!;
    if (e.account !== BANK || d < from || d > to) return;
    bankItems.push({ id: e.id, date: e.date, description: e.description, reference: e.reference, amount: e.debit - e.credit });
  });
  const fy = PERIODS.find((p) => p.id === 'fy-2083')!;
  return {
    ledger,
    now,
    bankItems,
    bankAtStatement: onNormal(netByAccount(ledger, null, month.end!), BANK),
    ytd: profitOf(netByAccount(ledger, fy.start!, TODAY)),
    receivables: BOOKS.invoices.filter((i) => !i.settled),
    payables: BOOKS.bills.filter((b) => !b.settled),
  };
}

export const isOverdue = (item: { date: CalendarDate }) => compareDates(item.date, TODAY) < 0;

export interface AcctContext {
  state: AcctState;
  derived: Derived;
  dispatch: Dispatch<Action>;
  go: (screen: Screen) => void;
}
export const AcctContext = createContext<AcctContext | null>(null);
export function useAcct(): AcctContext {
  const value = useContext(AcctContext);
  if (!value) throw new Error('useAcct needs the accounting app');
  return value;
}
