// The reconciliation desk's state: which statement lines are matched to which ledger entries, and the entries booked
// from the statement. One reducer, so a match made in the queue moves the overview, the matched list and the report
// together. Pure: no React except the context, no clock (the session date is fixed).
import { createContext, useContext, type Dispatch } from 'react';
import { reconciliationSummary, suggestMatches, sumAmounts, type ReconcileItem, type ReconcileMatch, type ReconciliationSummary } from '@punji/ui/reconciliation-matcher';
import { TODAY, dayNumber, rs } from '../shared/books.ts';
import { LEDGER, LEDGER_CLOSING, OPENING, STATEMENT, STATEMENT_CLOSING } from './recon.ts';

export type Screen = 'overview' | 'queue' | 'matched' | 'report';
export const SCREENS: readonly Screen[] = ['overview', 'queue', 'matched', 'report'];

/** An outstanding payment older than this many days is raised as an exception rather than left as timing. */
export const AGED_DAYS = 21;

export interface ReconState {
  matches: readonly ReconcileMatch[];
  /** Ledger entries booked from statement lines in the app (bank charges, interest, receipts). */
  booked: readonly ReconcileItem[];
  /** Ids of exceptions a person has taken responsibility for (disputed with the bank, correction requested). */
  acknowledged: readonly string[];
  /** Said in a polite live region after each action. */
  notice: string;
}

export type Action =
  | { type: 'match'; statementIds: readonly string[]; ledgerIds: readonly string[] }
  | { type: 'unmatch'; id: string }
  | { type: 'suggest' }
  | { type: 'book'; id: string }
  | { type: 'acknowledge'; id: string }
  | { type: 'reopen'; id: string };

const sameText = (a?: string, b?: string) => Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

/** Lines the bank and the books agree on by reference and exact amount: confirmed without a person. */
export function autoMatches(statement: readonly ReconcileItem[], ledger: readonly ReconcileItem[]): ReconcileMatch[] {
  const used = new Set<string>();
  const out: ReconcileMatch[] = [];
  for (const s of statement) {
    const l = ledger.find((e) => !used.has(e.id) && sameText(e.reference, s.reference) && e.amount === s.amount);
    if (!l) continue;
    used.add(l.id);
    out.push({ id: `A-${s.id}`, statementIds: [s.id], ledgerIds: [l.id] });
  }
  return out;
}

export const initialState = (): ReconState => ({ matches: autoMatches(STATEMENT, LEDGER), booked: [], acknowledged: [], notice: '' });

const matchedIds = (matches: readonly ReconcileMatch[], side: 'statementIds' | 'ledgerIds') => new Set(matches.flatMap((m) => m[side]));

export function reducer(state: ReconState, action: Action): ReconState {
  const ledger = [...LEDGER, ...state.booked];
  switch (action.type) {
    case 'match': {
      const { statementIds, ledgerIds } = action;
      if (statementIds.length === 0 || ledgerIds.length === 0) return { ...state, notice: 'Not matched: pick at least one line on each side.' };
      const usedS = matchedIds(state.matches, 'statementIds');
      const usedL = matchedIds(state.matches, 'ledgerIds');
      const s = STATEMENT.filter((x) => statementIds.includes(x.id));
      const l = ledger.filter((x) => ledgerIds.includes(x.id));
      if (s.length !== statementIds.length || l.length !== ledgerIds.length || statementIds.some((id) => usedS.has(id)) || ledgerIds.some((id) => usedL.has(id))) {
        return { ...state, notice: 'Not matched: a line is missing or already matched.' };
      }
      const diff = sumAmounts(s) - sumAmounts(l);
      // A match must agree to the paisa. A difference is an exception to resolve (book it, ask the bank), never a match.
      if (diff !== 0n) return { ...state, notice: `Not matched: the statement lines total ${rs(sumAmounts(s))} and the ledger entries ${rs(sumAmounts(l))}, ${rs(diff < 0n ? -diff : diff)} apart.` };
      const n = state.matches.filter((m) => m.id.startsWith('M-')).length + 1;
      const id = `M-${String(n).padStart(2, '0')}`;
      const match: ReconcileMatch = { id, statementIds: [...statementIds], ledgerIds: [...ledgerIds] };
      return { ...state, matches: [...state.matches, match], notice: `Matched ${s.length} statement ${s.length === 1 ? 'line' : 'lines'} with ${l.length} ledger ${l.length === 1 ? 'entry' : 'entries'}, ${rs(sumAmounts(s))}.` };
    }
    case 'unmatch': {
      const found = state.matches.find((m) => m.id === action.id);
      if (!found) return state;
      // Unmatching an entry booked from the statement removes the entry too, so it is not left behind unmatched.
      const bookedIds = new Set(state.booked.map((b) => b.id));
      const drop = new Set(found.ledgerIds.filter((id) => bookedIds.has(id)));
      return { ...state, matches: state.matches.filter((m) => m.id !== action.id), booked: state.booked.filter((b) => !drop.has(b.id)), notice: `Unmatched ${found.id}. Its lines are back in the queue.` };
    }
    case 'suggest': {
      const found = suggestMatches(STATEMENT, ledger, { matched: state.matches, dateWindow: 3, idPrefix: 'G' });
      if (found.length === 0) return { ...state, notice: 'No exact-amount suggestions left.' };
      return { ...state, matches: [...state.matches, ...found], notice: `${found.length} ${found.length === 1 ? 'suggestion' : 'suggestions'} accepted.` };
    }
    case 'acknowledge': {
      const summary = reconciliationSummary({ statement: STATEMENT, ledger, matches: state.matches, statementBalance: STATEMENT_CLOSING, ledgerBalance: LEDGER_CLOSING + sumAmounts(state.booked) });
      const found = exceptionsOf(summary.unmatchedStatement, summary.unmatchedLedger, state.matches, STATEMENT).find((e) => e.id === action.id);
      if (!found) return state;
      // Bank items missing from the books are booked, not waved through.
      if (found.kind === 'unrecorded') return { ...state, notice: 'Not acknowledged: book these lines in the queue.' };
      if (state.acknowledged.includes(found.id)) return state;
      return { ...state, acknowledged: [...state.acknowledged, found.id], notice: `Acknowledged: ${found.title}.` };
    }
    case 'reopen':
      return state.acknowledged.includes(action.id) ? { ...state, acknowledged: state.acknowledged.filter((id) => id !== action.id), notice: 'Exception reopened.' } : state;
    case 'book': {
      const s = STATEMENT.find((x) => x.id === action.id);
      if (!s || matchedIds(state.matches, 'statementIds').has(s.id)) return { ...state, notice: 'Not booked: the line is missing or already matched.' };
      // A line the bank repeated, or one whose amount differs from the books, is disputed or corrected, never booked.
      const summary = reconciliationSummary({ statement: STATEMENT, ledger, matches: state.matches, statementBalance: STATEMENT_CLOSING, ledgerBalance: LEDGER_CLOSING + sumAmounts(state.booked) });
      const blocking = exceptionsOf(summary.unmatchedStatement, summary.unmatchedLedger, state.matches, STATEMENT).find((e) => e.statementIds.includes(s.id) && (e.kind === 'duplicate' || e.kind === 'mismatch'));
      if (blocking) return { ...state, notice: `Not booked: ${blocking.title.toLowerCase()}. Resolve the exception first.` };
      // The entry mirrors the line, so the pair agrees to the paisa.
      const id = `L-B${state.booked.length + 1}`;
      const entry: ReconcileItem = { id, date: s.date, description: `${s.description ?? 'Bank entry'} (booked from the statement)`, reference: s.reference, amount: s.amount };
      const match: ReconcileMatch = { id: `B-${s.id}`, statementIds: [s.id], ledgerIds: [id] };
      return { ...state, booked: [...state.booked, entry], matches: [...state.matches, match], notice: `${s.description ?? 'Line'} booked, ${rs(s.amount < 0n ? -s.amount : s.amount)}.` };
    }
  }
}

export type ExceptionKind = 'mismatch' | 'duplicate' | 'aged' | 'unrecorded';
export interface ReconException {
  id: string;
  kind: ExceptionKind;
  tone: 'danger' | 'warn' | 'info';
  title: string;
  detail: string;
  statementIds: readonly string[];
  ledgerIds: readonly string[];
}

/**
 * What a person must look at: the unmatched lines that are more than timing. An amount keyed wrongly (same reference,
 * different amount), a line the bank repeated, a payment outstanding too long, and bank items not yet in the books.
 * A cheque not yet presented or a deposit in transit is only timing and is not an exception.
 */
export function exceptionsOf(
  unmatchedStatement: readonly ReconcileItem[],
  unmatchedLedger: readonly ReconcileItem[],
  matches: readonly ReconcileMatch[],
  statement: readonly ReconcileItem[],
  today = TODAY,
): ReconException[] {
  const out: ReconException[] = [];
  // A counterpart waiting in the other queue: the same exact amount (a suggestion), or lines whose reference extends the
  // entry's (a payroll paid in parts). Such lines are matched by a person, not raised as exceptions.
  const hasCounterpart = (l: ReconcileItem) => unmatchedStatement.some((s) => s.amount === l.amount || Boolean(l.reference && s.reference?.startsWith(`${l.reference}-`)));
  const hasCounterpartL = (s: ReconcileItem) => unmatchedLedger.some((l) => l.amount === s.amount || Boolean(l.reference && s.reference?.startsWith(`${l.reference}-`)));
  const claimedS = new Set<string>();
  const claimedL = new Set<string>();
  const usedS = matchedIds(matches, 'statementIds');
  for (const s of unmatchedStatement) {
    const l = unmatchedLedger.find((e) => !claimedL.has(e.id) && sameText(e.reference, s.reference) && e.amount !== s.amount);
    if (!l) continue;
    claimedS.add(s.id);
    claimedL.add(l.id);
    const gap = s.amount - l.amount;
    out.push({
      id: `X-mismatch-${s.id}`, kind: 'mismatch', tone: 'danger', title: `Amount differs on ${s.reference}`,
      detail: `The bank has ${rs(s.amount)} and the books ${rs(l.amount)}, ${rs(gap < 0n ? -gap : gap)} apart. Correct the entry or ask the bank; it cannot be matched as it stands.`,
      statementIds: [s.id], ledgerIds: [l.id],
    });
  }
  for (const s of unmatchedStatement) {
    if (claimedS.has(s.id)) continue;
    const twin = statement.find((o) => o.id !== s.id && o.date.day === s.date.day && o.amount === s.amount && sameText(o.reference, s.reference) && (usedS.has(o.id) || o.id < s.id));
    if (!twin) continue;
    claimedS.add(s.id);
    out.push({
      id: `X-duplicate-${s.id}`, kind: 'duplicate', tone: 'warn', title: `Possible duplicate bank line, ${s.reference}`,
      detail: `${s.description} for ${rs(s.amount < 0n ? -s.amount : s.amount)} appears twice on ${s.date.day} Oct with the same reference. Ask the bank to reverse one.`,
      statementIds: [s.id], ledgerIds: [],
    });
  }
  for (const l of unmatchedLedger) {
    if (claimedL.has(l.id) || l.amount >= 0n || hasCounterpart(l)) continue;
    const age = dayNumber(today) - dayNumber(l.date);
    if (age <= AGED_DAYS) continue;
    out.push({
      id: `X-aged-${l.id}`, kind: 'aged', tone: 'warn', title: `Payment outstanding ${age} days, ${l.reference}`,
      detail: `${l.description} for ${rs(-l.amount)} has not reached the bank. Chase the payee, or void and reissue it.`,
      statementIds: [], ledgerIds: [l.id],
    });
  }
  // Bank charges, interest and receipts the books have not recorded (nothing in the ledger queue can be their other half).
  const unrecorded = unmatchedStatement.filter((s) => !claimedS.has(s.id) && !hasCounterpartL(s));
  if (unrecorded.length > 0) {
    out.push({
      id: 'X-unrecorded', kind: 'unrecorded', tone: 'info', title: `${unrecorded.length} bank ${unrecorded.length === 1 ? 'line' : 'lines'} not in the books`,
      detail: `${unrecorded.map((s) => s.reference).join(', ')}. Book charges, interest and receipts from the queue.`,
      statementIds: unrecorded.map((s) => s.id), ledgerIds: [],
    });
  }
  return out;
}

export interface Derived {
  statement: readonly ReconcileItem[];
  ledger: readonly ReconcileItem[];
  summary: ReconciliationSummary;
  suggestions: ReconcileMatch[];
  exceptions: ReconException[];
  /** Exceptions a person has acknowledged. */
  acknowledged: ReconException[];
  /** The books' closing balance including entries booked here. */
  ledgerClosing: bigint;
  matchedStatement: number;
  /** Matched share of the statement's lines, a whole number of percent. */
  percent: number;
  /** Every line matched and the reconciliation statement closes to zero. */
  reconciled: boolean;
}

export function derive(state: ReconState): Derived {
  const ledger = [...LEDGER, ...state.booked];
  const ledgerClosing = LEDGER_CLOSING + sumAmounts(state.booked);
  const summary = reconciliationSummary({ statement: STATEMENT, ledger, matches: state.matches, statementBalance: STATEMENT_CLOSING, ledgerBalance: ledgerClosing });
  const matchedStatement = STATEMENT.length - summary.unmatchedStatement.length;
  const all = exceptionsOf(summary.unmatchedStatement, summary.unmatchedLedger, state.matches, STATEMENT);
  const exceptions = all.filter((e) => !state.acknowledged.includes(e.id));
  const acknowledged = all.filter((e) => state.acknowledged.includes(e.id));
  const covered = new Set(acknowledged.flatMap((e) => e.statementIds));
  return {
    statement: STATEMENT,
    ledger,
    summary,
    suggestions: suggestMatches(STATEMENT, ledger, { matched: state.matches, dateWindow: 3, idPrefix: 'G' }),
    exceptions,
    acknowledged,
    ledgerClosing,
    matchedStatement,
    percent: Math.floor((matchedStatement * 100) / STATEMENT.length),
    reconciled: summary.reconciled && exceptions.length === 0 && summary.unmatchedStatement.every((s) => covered.has(s.id)),
  };
}

export interface ReconContext {
  state: ReconState;
  derived: Derived;
  dispatch: Dispatch<Action>;
  go: (screen: Screen) => void;
}
export const ReconContext = createContext<ReconContext | null>(null);
export function useRecon(): ReconContext {
  const value = useContext(ReconContext);
  if (!value) throw new Error('useRecon needs the reconciliation desk');
  return value;
}

export { OPENING, STATEMENT_CLOSING };
