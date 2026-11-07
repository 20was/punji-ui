// The statements app: statements that are the same every time, opening balances that chain, running balances that
// follow from the lines, totals that equal the declared figures to the paisa, a statement that is caught when its
// header is one rupee wrong, and month stepping that stays inside the months there are.
import { describe, expect, it } from 'vitest';
import { reconcileTotals } from '@punji/ui/table-core';
import { ACCOUNTS, MONTHS, archiveRows, checkStatement, declaredOf, statementOf, statementsOf, stepMonth } from './account-statements/statements.ts';
import { nprMoney } from './shared/moneyCells.tsx';

describe('account statements data', () => {
  it('are deterministic and in date order, with unique line ids', () => {
    for (const a of ACCOUNTS) {
      for (const m of MONTHS) {
        const s = statementOf(a.id, m.id);
        expect(s.lines.length).toBeGreaterThan(8);
        expect(new Set(s.lines.map((l) => l.id)).size).toBe(s.lines.length);
        expect(s.lines.every((l, i) => i === 0 || l.date.day >= s.lines[i - 1]!.date.day)).toBe(true);
        expect(s.lines.every((l) => (l.credit > 0n) !== (l.debit > 0n))).toBe(true);
        expect(s.lines.every((l) => l.date.year === m.year && l.date.month === m.month && l.date.day <= m.days)).toBe(true);
      }
    }
    expect(statementOf('savings', '2026-10').lines.map((l) => [l.id, l.credit, l.debit, l.balance])).toEqual(statementOf('savings', '2026-10').lines.map((l) => [l.id, l.credit, l.debit, l.balance]));
  });

  it('opens each month at the previous closing balance and never overdraws', () => {
    for (const a of ACCOUNTS) {
      const all = statementsOf(a.id);
      expect(all[0]!.opening).toBe(a.opening);
      expect(all.slice(1).map((s) => s.opening)).toEqual(all.slice(0, -1).map((s) => s.declared.closing));
      expect(all.every((s) => s.lines.every((l) => l.balance >= 0n))).toBe(true);
    }
  });

  it('adds up exactly: opening + money in - money out = closing, and every running balance follows', () => {
    for (const a of ACCOUNTS) {
      for (const s of statementsOf(a.id)) {
        const credits = s.lines.reduce((t, l) => t + l.credit, 0n);
        const debits = s.lines.reduce((t, l) => t + l.debit, 0n);
        expect(s.opening + credits - debits).toBe(s.declared.closing);
        expect(s.lines.at(-1)!.balance).toBe(s.declared.closing);
        const check = checkStatement(s);
        expect(check).toEqual({ arithmetic: true, running: true, totals: true, reconciled: true });
      }
    }
  });

  it('credits savings interest on the opening balance, rounded down to the paisa', () => {
    const s = statementOf('savings', '2026-09');
    const interest = s.lines.find((l) => l.category === 'Interest')!;
    expect(interest.credit).toBe((s.opening * 4n) / 1200n);
    expect(statementOf('current', '2026-09').lines.some((l) => l.category === 'Interest')).toBe(false);
  });
});

describe('account statements checks', () => {
  it('a header that is one rupee wrong is caught, with the table total off by exactly that rupee', () => {
    const s = statementOf('savings', '2026-10');
    const drifted = declaredOf(s, true);
    expect(drifted.credits).toBe(s.declared.credits + 100n);
    const check = checkStatement(s, drifted);
    expect(check.reconciled).toBe(false);
    expect(check.totals).toBe(false);
    expect(check.arithmetic).toBe(false);
    // The totals row compares the lines' sum with the declared figure and names the gap.
    const sums = { credit: nprMoney(s.lines.reduce((t, l) => t + l.credit, 0n)) };
    const result = reconcileTotals(sums, { credit: nprMoney(drifted.credits) }).credit!;
    expect(result.status).toBe('mismatch');
    expect(result.difference.minor).toBe(-100n);
    expect(reconcileTotals(sums, { credit: nprMoney(s.declared.credits) }).credit!.status).toBe('ok');
  });

  it('catches a running balance that does not follow from the line before it', () => {
    const s = statementOf('current', '2026-10');
    const tampered = { ...s, lines: s.lines.map((l, i) => (i === 3 ? { ...l, balance: l.balance + 1n } : l)) };
    const check = checkStatement(tampered);
    expect(check.running).toBe(false);
    expect(check.reconciled).toBe(false);
  });

  it('steps between months and stops at the ends', () => {
    expect(stepMonth('2026-10', -1)).toBe('2026-09');
    expect(stepMonth('2026-09', 1)).toBe('2026-10');
    expect(stepMonth('2026-10', 1)).toBe('2026-10');
    expect(stepMonth('2026-08', -1)).toBe('2026-08');
    expect(stepMonth('nope', -1)).toBe('2026-09');
  });

  it('lists every statement newest first per account, all chained and reconciled', () => {
    const rows = archiveRows();
    expect(rows.length).toBe(ACCOUNTS.length * MONTHS.length);
    expect(rows.every((r) => r.chained && r.reconciled)).toBe(true);
    expect(rows.filter((r) => r.holderId === 'savings').map((r) => r.monthId)).toEqual(['2026-10', '2026-09', '2026-08']);
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });
});
