/**
 * Bank reconciliation arithmetic: statement lines against ledger entries, matched one-to-one, one-to-many or
 * many-to-many, and the reconciliation statement that follows (balance per bank plus deposits in transit less
 * outstanding payments, against balance per books plus what the bank booked that the books have not). Amounts are
 * signed bigint minor units seen from the account holder: money in is positive, money out negative, on both sides.
 * Dates are date-only values. No React, no browser globals; the server that keeps the books checks it again.
 */
import type { CalendarDate } from '../nepal/date-only.ts';

export interface ReconcileItem {
  /** Unique and stable within its side (statement or ledger). */
  id: string;
  /** Value date (statement) or posting date (ledger), Gregorian and date-only. */
  date: CalendarDate;
  /** Narration or memo. */
  description?: string;
  /** Cheque, voucher or bank reference. Equal references make a stronger suggestion. */
  reference?: string;
  /** Signed minor units: money into the account positive, money out negative. */
  amount: bigint;
}

export interface ReconcileMatch {
  /** Unique and stable: a key for the row. */
  id: string;
  /** Statement line ids in this match (one or more). */
  statementIds: readonly string[];
  /** Ledger entry ids in this match (one or more). */
  ledgerIds: readonly string[];
}

const dayNumber = (d: CalendarDate) => Math.floor(Date.UTC(d.year, d.month - 1, d.day) / 86_400_000);
const check = (item: ReconcileItem) => {
  if (typeof item.amount !== 'bigint') throw new TypeError(`Item ${item.id}: amount must be bigint minor units`);
};

/** Exact sum of the amounts of the items given. */
export function sumAmounts(items: readonly Pick<ReconcileItem, 'id' | 'amount'>[]): bigint {
  let total = 0n;
  for (const item of items) {
    check(item as ReconcileItem);
    total += item.amount;
  }
  return total;
}

/** Statement total minus ledger total of a match; zero when the match balances. Unknown ids throw. */
export function matchDifference(statement: readonly ReconcileItem[], ledger: readonly ReconcileItem[], match: Pick<ReconcileMatch, 'statementIds' | 'ledgerIds'>): bigint {
  const pick = (items: readonly ReconcileItem[], ids: readonly string[], side: string) =>
    ids.map((id) => {
      const found = items.find((item) => item.id === id);
      if (!found) throw new RangeError(`No ${side} item with id ${id}`);
      return found;
    });
  return sumAmounts(pick(statement, match.statementIds, 'statement')) - sumAmounts(pick(ledger, match.ledgerIds, 'ledger'));
}

export interface SuggestOptions {
  /** Most days between the two dates for a suggestion. Default 5. */
  dateWindow?: number;
  /** Matches already made; their items are left out. */
  matched?: readonly ReconcileMatch[];
  /** Prefix of the suggested matches' ids. Default 'auto'. */
  idPrefix?: string;
}

/**
 * One-to-one suggestions: the same exact amount within the date window. Equal references come first, then the
 * nearest date, then input order; each item is used once. Suggestions only: show them and let a person confirm.
 */
export function suggestMatches(statement: readonly ReconcileItem[], ledger: readonly ReconcileItem[], options: SuggestOptions = {}): ReconcileMatch[] {
  const window = options.dateWindow ?? 5;
  if (!Number.isInteger(window) || window < 0) throw new RangeError('dateWindow must be a whole number of days, 0 or more');
  const usedStatement = new Set(options.matched?.flatMap((m) => m.statementIds));
  const usedLedger = new Set(options.matched?.flatMap((m) => m.ledgerIds));
  const candidates: { s: number; l: number; ref: number; days: number }[] = [];
  statement.forEach((s, si) => {
    check(s);
    if (usedStatement.has(s.id)) return;
    ledger.forEach((l, li) => {
      check(l);
      if (usedLedger.has(l.id) || l.amount !== s.amount) return;
      const days = Math.abs(dayNumber(s.date) - dayNumber(l.date));
      if (days > window) return;
      const ref = s.reference && l.reference && s.reference.trim().toLowerCase() === l.reference.trim().toLowerCase() ? 0 : 1;
      candidates.push({ s: si, l: li, ref, days });
    });
  });
  const ordered = candidates.toSorted((a, b) => a.ref - b.ref || a.days - b.days || a.s - b.s || a.l - b.l);
  const takenS = new Set<number>();
  const takenL = new Set<number>();
  const out: ReconcileMatch[] = [];
  for (const c of ordered) {
    if (takenS.has(c.s) || takenL.has(c.l)) continue;
    takenS.add(c.s);
    takenL.add(c.l);
    out.push({ id: `${options.idPrefix ?? 'auto'}-${statement[c.s]!.id}`, statementIds: [statement[c.s]!.id], ledgerIds: [ledger[c.l]!.id] });
  }
  return out.toSorted((a, b) => statement.findIndex((s) => s.id === a.statementIds[0]) - statement.findIndex((s) => s.id === b.statementIds[0]));
}

export interface ReconciliationInput {
  statement: readonly ReconcileItem[];
  ledger: readonly ReconcileItem[];
  matches: readonly ReconcileMatch[];
  /** Closing balance on the bank statement, signed (a positive balance is money in the account). */
  statementBalance: bigint;
  /** Closing balance of the bank account in the books, on the same date and the same sign. */
  ledgerBalance: bigint;
}

export interface ReconciliationSummary {
  /** Statement lines in no match: interest, charges and receipts the books have not recorded yet. */
  unmatchedStatement: ReconcileItem[];
  /** Ledger entries in no match: deposits in transit and payments the bank has not cleared yet. */
  unmatchedLedger: ReconcileItem[];
  /** Ledger-only money in (deposits in transit). */
  depositsInTransit: bigint;
  /** Ledger-only money out, as a positive amount (outstanding cheques and payments). */
  outstandingPayments: bigint;
  /** Statement-only money in, not yet in the books. */
  unrecordedReceipts: bigint;
  /** Statement-only money out, as a positive amount, not yet in the books. */
  unrecordedPayments: bigint;
  /** statementBalance + depositsInTransit − outstandingPayments. */
  adjustedStatement: bigint;
  /** ledgerBalance + unrecordedReceipts − unrecordedPayments. */
  adjustedLedger: bigint;
  /** adjustedStatement − adjustedLedger. Zero when the account reconciles. */
  difference: bigint;
  /** Ids of matches whose two sides differ. */
  unbalancedMatches: string[];
  /** difference is zero and every match balances. */
  reconciled: boolean;
}

/** The reconciliation statement for a set of matches. Throws when an id is unknown or used in two matches. */
export function reconciliationSummary(input: ReconciliationInput): ReconciliationSummary {
  const { statement, ledger, matches } = input;
  if (typeof input.statementBalance !== 'bigint' || typeof input.ledgerBalance !== 'bigint') throw new TypeError('Balances are bigint minor units');
  const seenS = new Set<string>();
  const seenL = new Set<string>();
  const unbalancedMatches: string[] = [];
  for (const match of matches) {
    for (const id of match.statementIds) {
      if (seenS.has(id)) throw new RangeError(`Statement item ${id} is in two matches`);
      seenS.add(id);
    }
    for (const id of match.ledgerIds) {
      if (seenL.has(id)) throw new RangeError(`Ledger item ${id} is in two matches`);
      seenL.add(id);
    }
    if (matchDifference(statement, ledger, match) !== 0n) unbalancedMatches.push(match.id);
  }
  const unmatchedStatement = statement.filter((item) => !seenS.has(item.id));
  const unmatchedLedger = ledger.filter((item) => !seenL.has(item.id));
  let depositsInTransit = 0n, outstandingPayments = 0n, unrecordedReceipts = 0n, unrecordedPayments = 0n;
  for (const item of unmatchedLedger) {
    check(item);
    if (item.amount >= 0n) depositsInTransit += item.amount;
    else outstandingPayments -= item.amount;
  }
  for (const item of unmatchedStatement) {
    check(item);
    if (item.amount >= 0n) unrecordedReceipts += item.amount;
    else unrecordedPayments -= item.amount;
  }
  const adjustedStatement = input.statementBalance + depositsInTransit - outstandingPayments;
  const adjustedLedger = input.ledgerBalance + unrecordedReceipts - unrecordedPayments;
  const difference = adjustedStatement - adjustedLedger;
  return {
    unmatchedStatement, unmatchedLedger, depositsInTransit, outstandingPayments, unrecordedReceipts, unrecordedPayments,
    adjustedStatement, adjustedLedger, difference, unbalancedMatches, reconciled: difference === 0n && unbalancedMatches.length === 0,
  };
}
