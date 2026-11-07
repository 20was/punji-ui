// The reconciliation desk: a deterministic fixture whose two sides close to the printed balances, auto-matching that
// only pairs exact reference and amount, matches that are refused unless both sides agree to the paisa, many-to-one
// payroll, booking from the statement (and its refusals), exceptions with acknowledge and reopen, control totals that
// reconcile against the closing balances, and CSV that neutralises formulas.
import { describe, expect, it } from 'vitest';
import { toCsv } from '@punji/ui/export';
import { matchDifference, sumAmounts } from '@punji/ui/reconciliation-matcher';
import { reconcileTotals } from '@punji/ui/table-core';
import { EXCEPTION_COLUMNS, LINE_COLUMNS, exceptionRows, lineRows } from './reconciliation-desk/exports.ts';
import { LEDGER, LEDGER_CLOSING, OPENING, STATEMENT, STATEMENT_CLOSING, paisa } from './reconciliation-desk/recon.ts';
import { autoMatches, derive, initialState, reducer, type ReconState } from './reconciliation-desk/store.ts';
import { nprMoney } from './shared/moneyCells.tsx';

const run = (state: ReconState, ...actions: Parameters<typeof reducer>[1][]) => actions.reduce(reducer, state);
const idOf = (reference: string, side: 'statement' | 'ledger', nth = 0) => (side === 'statement' ? STATEMENT : LEDGER).filter((x) => x.reference === reference)[nth]!.id;

describe('reconciliation desk fixture', () => {
  it('is deterministic, with unique ids and exact amounts', () => {
    expect(STATEMENT.length).toBe(33);
    expect(LEDGER.length).toBe(29);
    expect(new Set(STATEMENT.map((x) => x.id)).size).toBe(STATEMENT.length);
    expect(new Set(LEDGER.map((x) => x.id)).size).toBe(LEDGER.length);
    expect(paisa('-1,234.5')).toBe(-123_450n);
    expect(() => paisa('12.345')).toThrow('Not an amount');
  });

  it('closes both sides to the printed balances', () => {
    expect(OPENING + sumAmounts(STATEMENT)).toBe(STATEMENT_CLOSING);
    expect(OPENING + sumAmounts(LEDGER)).toBe(LEDGER_CLOSING);
  });
});

describe('reconciliation desk matching', () => {
  it('matches on arrival only where the reference and the exact amount agree', () => {
    const auto = autoMatches(STATEMENT, LEDGER);
    expect(auto.length).toBe(20);
    for (const m of auto) expect(matchDifference(STATEMENT, LEDGER, m)).toBe(0n);
    // The keyed amount (same reference, different amount) is not matched, and neither are references written differently.
    expect(auto.some((m) => m.statementIds.includes(idOf('RTGS-77290', 'statement')))).toBe(false);
    expect(auto.some((m) => m.statementIds.includes(idOf('CHQ-004211', 'statement')))).toBe(false);
    // The bank repeated the pantry line: only one of the two is matched.
    expect(auto.filter((m) => m.ledgerIds.includes(idOf('POS-4521', 'ledger'))).length).toBe(1);
  });

  it('starts with suggestions, a queue and the four kinds of exception', () => {
    const d = derive(initialState());
    expect(d.suggestions.length).toBe(4);
    expect(d.summary.unmatchedStatement.length).toBe(13);
    expect(d.exceptions.map((e) => e.kind).toSorted()).toEqual(['aged', 'duplicate', 'mismatch', 'unrecorded']);
    expect(d.exceptions.find((e) => e.kind === 'mismatch')!.detail).toContain('1,800.00');
    expect(d.reconciled).toBe(false);
  });

  it('accepts suggestions once and then has none left', () => {
    const s = run(initialState(), { type: 'suggest' });
    expect(derive(s).suggestions.length).toBe(0);
    expect(s.matches.length).toBe(initialState().matches.length + 4);
    expect(run(s, { type: 'suggest' }).notice).toBe('No exact-amount suggestions left.');
  });

  it('refuses a match whose sides differ by even one paisa, and names the gap', () => {
    const before = initialState();
    const s = run(before, { type: 'match', statementIds: [idOf('RTGS-77290', 'statement')], ledgerIds: [idOf('RTGS-77290', 'ledger')] });
    expect(s.matches).toBe(before.matches);
    expect(s.notice).toContain('1,800.00 apart');
    expect(run(before, { type: 'match', statementIds: [], ledgerIds: ['L-01'] }).notice).toContain('at least one line on each side');
  });

  it('matches payroll paid as three transfers to the one entry (many to one) and unmatches it', () => {
    const parts = ['SAL-1007-A', 'SAL-1007-B', 'SAL-1007-C'].map((r) => idOf(r, 'statement'));
    const entry = idOf('SAL-1007', 'ledger');
    const s = run(initialState(), { type: 'match', statementIds: parts, ledgerIds: [entry] });
    const m = s.matches.at(-1)!;
    expect(m.id).toBe('M-01');
    expect(m.statementIds).toEqual(parts);
    expect(derive(s).summary.unmatchedStatement.length).toBe(10);
    // The same line cannot be matched twice.
    expect(run(s, { type: 'match', statementIds: [parts[0]!], ledgerIds: [entry] }).notice).toContain('already matched');
    const back = run(s, { type: 'unmatch', id: 'M-01' });
    expect(back.matches).toEqual(initialState().matches);
    expect(run(back, { type: 'unmatch', id: 'nope' })).toBe(back);
  });

  it('books the bank charge from the statement, moves the books balance, and unmatching removes the entry again', () => {
    const charge = idOf('CHG-1030', 'statement');
    const s = run(initialState(), { type: 'book', id: charge });
    const d = derive(s);
    expect(s.booked.length).toBe(1);
    expect(d.ledgerClosing).toBe(LEDGER_CLOSING - 118_000n);
    expect(d.summary.unmatchedStatement.some((x) => x.id === charge)).toBe(false);
    expect(d.summary.difference).toBe(0n);
    const back = run(s, { type: 'unmatch', id: `B-${charge}` });
    expect(back.booked.length).toBe(0);
    expect(derive(back).ledgerClosing).toBe(LEDGER_CLOSING);
  });

  it('refuses to book a repeated bank line or an amount that differs from the books', () => {
    const base = initialState();
    const open = derive(base).summary.unmatchedStatement;
    const dup = open.find((x) => x.reference === 'POS-4521')!;
    expect(run(base, { type: 'book', id: dup.id }).booked.length).toBe(0);
    expect(run(base, { type: 'book', id: dup.id }).notice).toContain('Not booked');
    const keyed = idOf('RTGS-77290', 'statement');
    expect(run(base, { type: 'book', id: keyed }).notice).toContain('Resolve the exception first');
    expect(run(base, { type: 'book', id: base.matches[0]!.statementIds[0]! }).notice).toContain('already matched');
  });
});

describe('reconciliation desk exceptions', () => {
  it('acknowledges what cannot be fixed here, refuses to wave through unbooked lines, and reopens', () => {
    const d0 = derive(initialState());
    const mismatch = d0.exceptions.find((e) => e.kind === 'mismatch')!;
    const s = run(initialState(), { type: 'acknowledge', id: mismatch.id });
    expect(derive(s).exceptions.some((e) => e.id === mismatch.id)).toBe(false);
    expect(derive(s).acknowledged.map((e) => e.id)).toEqual([mismatch.id]);
    expect(run(s, { type: 'reopen', id: mismatch.id }).acknowledged).toEqual([]);
    const unrecorded = d0.exceptions.find((e) => e.kind === 'unrecorded')!;
    expect(run(initialState(), { type: 'acknowledge', id: unrecorded.id }).notice).toContain('book these lines');
  });

  it('reaches Reconciled only when every line is matched or acknowledged and nothing is open', () => {
    let s = run(initialState(), { type: 'suggest' });
    const parts = ['SAL-1007-A', 'SAL-1007-B', 'SAL-1007-C'].map((r) => idOf(r, 'statement'));
    s = run(s, { type: 'match', statementIds: parts, ledgerIds: [idOf('SAL-1007', 'ledger')] });
    // Book every bank line the books lack: charges, interest and receipts.
    for (const e of derive(s).exceptions.filter((x) => x.kind === 'unrecorded')) for (const id of e.statementIds) s = run(s, { type: 'book', id });
    expect(derive(s).reconciled).toBe(false);
    for (const e of derive(s).exceptions) s = run(s, { type: 'acknowledge', id: e.id });
    const d = derive(s);
    expect(d.exceptions).toEqual([]);
    expect(d.reconciled).toBe(true);
    expect(d.summary.difference).toBe(0n);
    // The timing items (a recent cheque, a deposit in transit) remain on the books side and do not block it.
    expect(d.summary.unmatchedLedger.length).toBeGreaterThan(0);
  });
});

const totalsOf = (amounts: readonly bigint[]) => ({ amount: nprMoney(amounts.reduce((a, b) => a + b, 0n)) });

describe('reconciliation desk control totals and export', () => {
  it('each side\'s total equals the closing balance less the opening balance, with booked entries included', () => {
    const base = derive(initialState());
    expect(reconcileTotals(totalsOf(base.statement.map((x) => x.amount)), { amount: nprMoney(STATEMENT_CLOSING - OPENING) }).amount!.status).toBe('ok');
    const booked = derive(run(initialState(), { type: 'book', id: idOf('INT-OCT', 'statement') }));
    expect(reconcileTotals(totalsOf(booked.ledger.map((x) => x.amount)), { amount: nprMoney(booked.ledgerClosing - OPENING) }).amount!.status).toBe('ok');
    // A control total that is one paisa off is named, not hidden.
    const off = reconcileTotals(totalsOf(base.ledger.map((x) => x.amount)), { amount: nprMoney(LEDGER_CLOSING - OPENING + 1n) }).amount!;
    expect(off.status).toBe('mismatch');
    expect(off.difference.minor).toBe(-1n);
  });

  it('writes exact amounts and neutralises formulas in bank narrations', () => {
    const state = initialState();
    const d = derive(state);
    const csv = toCsv(lineRows(d.statement, d.ledger, state.matches), LINE_COLUMNS);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+977 9841000000 eSewa settlement");
    expect(csv).toContain('-85000.00');
    expect(csv).not.toMatch(/(^|,)=HYPERLINK/m);
    expect(csv.split('\r\n').length).toBe(1 + 33 + 29);
    const rows = exceptionRows(d.exceptions, d.acknowledged);
    expect(toCsv(rows, EXCEPTION_COLUMNS)).toContain('Amount differs on RTGS-77290');
  });
});
