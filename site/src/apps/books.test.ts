// The accounting and billing apps (site/src/apps/accounting, business, shared/books): every journal balances, the
// reports agree with each other to the paisa, the bank statement reconciles, payroll and the salary journal match,
// and the billing store's balances agree across screens.
import { describe, expect, it } from 'vitest';
import { ACCOUNTS, MONTHS, PERIODS, balanceSheetRows, generateBooks, ledgerOf, netByAccount, onNormal, profitAndLossRows, profitOf, rangeOf } from './accounting/books.ts';
import { BOOKS, comparisonOf, derive, initialState, reducer } from './accounting/store.ts';
import { derive as deriveBiz, initialState as bizState, reducer as bizReducer, totalsOf } from './business/store.ts';
import { PAYROLL, PAYROLL_TOTALS, SLABS, TODAY } from './shared/books.ts';
import { isBalanced, rollUp, trialBalance, type StatementRow } from '@punji/ui/ledger';
import { reconciliationSummary, suggestMatches } from '@punji/ui/reconciliation-matcher';
import { computeIncomeTax, summariseTds, taxableIncome } from '@punji/ui/tax';

const subtotal = (rows: readonly StatementRow[], id: string, key = 'cur'): bigint => {
  for (const row of rows) {
    if (row.kind !== 'section') continue;
    if (row.id === id) return row.subtotal?.values?.[key] ?? 0n;
    const inner = subtotal(row.rows, id, key);
    if (inner !== 0n) return inner;
  }
  return 0n;
};

describe('accounting books', () => {
  it('are deterministic and every journal balances', () => {
    expect(generateBooks()).toEqual(generateBooks());
    expect(BOOKS.journals.length).toBeGreaterThan(250);
    for (const j of BOOKS.journals) expect(isBalanced(j) ? j.id : `unbalanced ${j.id}`).toBe(j.id);
    expect(trialBalance(BOOKS.journals).balanced).toBe(true);
    expect(BOOKS.journals.every((j) => j.date.year < 2026 || j.date.month < 11 || (j.date.month === 11 && j.date.day <= TODAY.day))).toBe(true);
  });

  it('balances the balance sheet at every period end, with profit equal to the P&L', () => {
    const ledger = ledgerOf(BOOKS.journals);
    for (const period of PERIODS) {
      const column = { key: 'cur', ...rangeOf(period) };
      const bs = rollUp(balanceSheetRows(ledger, [column]));
      expect([period.id, subtotal(bs, 'assets')]).toEqual([period.id, subtotal(bs, 'le')]);
      const pl = rollUp(profitAndLossRows(ledger, [column]));
      expect(subtotal(pl, 'pl')).toBe(profitOf(netByAccount(ledger, column.from, column.to)).profit);
    }
    // Monthly profits add up to the year's.
    const fy = PERIODS.find((p) => p.id === 'fy-2082')!;
    const months = MONTHS.slice(0, 12).reduce((s, m) => s + profitOf(netByAccount(ledger, m.start!, m.end!)).profit, 0n);
    expect(months).toBe(profitOf(netByAccount(ledger, fy.start!, fy.end!)).profit);
  });

  it('ties receivables and payables to open invoices and bills, and TDS to the TDS payable account', () => {
    const d = derive(initialState());
    expect(onNormal(d.now, '1100')).toBe(d.receivables.reduce((s, i) => s + i.total, 0n));
    expect(onNormal(d.now, '2000')).toBe(d.payables.reduce((s, i) => s + i.total, 0n));
    expect(d.receivables.length).toBeGreaterThan(2);
    const credits = d.ledger.entries.filter((e) => e.account === '2200').reduce((s, e) => s + e.credit, 0n);
    expect(summariseTds(BOOKS.tds, { rounding: 'half-up' }).totals.tds).toBe(credits);
  });

  it('posts the shared payroll as the salary journal every month', () => {
    const payroll = BOOKS.journals.filter((j) => j.id.startsWith('PR-'));
    expect(payroll.length).toBe(15);
    for (const j of payroll) {
      expect(j.lines.find((l) => l.account === '1010')!.credit).toBe(PAYROLL_TOTALS.net);
      expect(j.lines.find((l) => l.account === '2200')!.credit).toBe(PAYROLL_TOTALS.tds);
    }
    for (const row of PAYROLL) {
      expect(row.gross - row.ssf - row.cit - row.tds).toBe(row.net);
      const ded = taxableIncome({ income: row.annual.income, retirement: [{ id: 'ssf', label: 'SSF', amount: row.annual.ssf }, { id: 'cit', label: 'CIT', amount: row.annual.cit }], retirementRule: { cap: 50_000_000n, fraction: { numerator: 1n, denominator: 3n } }, rounding: 'half-up' });
      expect(ded.taxable).toBe(row.annual.taxable);
      expect(row.annual.tax.tax).toBe(computeIncomeTax(ded.taxable, SLABS[row.employee.status], { rounding: 'half-up', waive: true }).tax);
      expect(row.tds).toBe((row.annual.tax.tax * 2n + 12n) / 24n); // one twelfth, rounded half up
    }
  });

  it('reconciles the bank statement once every line is matched or booked', () => {
    let s = initialState();
    let d = derive(s);
    const { lines, closing } = BOOKS.statement;
    const auto = suggestMatches(lines, d.bankItems);
    expect(auto.length).toBeGreaterThan(5);
    // Book the two charges the books do not have, then match what is left by hand: the payroll and the charges.
    for (const id of ['st-sms', 'st-chq-book']) s = reducer(s, { type: 'book', item: lines.find((l) => l.id === id)! });
    d = derive(s);
    const matches = suggestMatches(lines, d.bankItems);
    const salary = d.bankItems.find((i) => i.reference?.startsWith('PR-'))!;
    matches.push({ id: 'payroll', statementIds: lines.filter((l) => l.reference === salary.reference).map((l) => l.id), ledgerIds: [salary.id] });
    const sum = reconciliationSummary({ statement: lines, ledger: d.bankItems, matches, statementBalance: closing, ledgerBalance: d.bankAtStatement });
    expect(sum.reconciled).toBe(true);
    expect(sum.unmatchedStatement).toEqual([]);
    expect(sum.unmatchedLedger.map((i) => i.reference?.slice(0, 2)).toSorted()).toEqual(['PV', 'RV']);
    expect(sum.adjustedLedger).toBe(sum.adjustedStatement);
  });

  it('refuses an unbalanced journal and moves every report with a balanced one', () => {
    const s0 = initialState();
    const bad = reducer(s0, { type: 'post', journal: { id: '', date: TODAY, memo: 'x', lines: [{ account: '5400', debit: 100n, credit: 0n }, { account: '1000', debit: 0n, credit: 99n }] } });
    expect(bad.journals.length).toBe(s0.journals.length);
    const s1 = reducer(s0, { type: 'post', journal: { id: '', date: TODAY, memo: 'Tea', lines: [{ account: '5400', debit: 12_345n, credit: 0n }, { account: '1000', debit: 0n, credit: 12_345n }] } });
    expect(s1.posted).toEqual(['JV-0001']);
    expect(derive(s0).ytd.profit - derive(s1).ytd.profit).toBe(12_345n);
    expect(trialBalance(s1.journals).balanced).toBe(true);
  });

  it('compares a period with the same days a year earlier', () => {
    const fy = PERIODS.find((p) => p.id === 'fy-2083')!;
    const cmp = comparisonOf(fy, 'last-year')!;
    expect(cmp.period.id).toBe('fy-2082');
    expect(cmp.column.to).toEqual({ year: 2025, month: 11, day: 1 });
    expect(comparisonOf(PERIODS.find((p) => p.id === 'q-2083-1')!, 'previous')!.period.id).toBe('q-2082-4');
    expect(comparisonOf(fy, 'none')).toBeNull();
    expect(ACCOUNTS.every((a) => a.code.length === 4)).toBe(true);
  });
});

describe('billing and payroll store', () => {
  it('keeps the invoice list, customers and payments in agreement', () => {
    const s = bizState();
    const d = deriveBiz(s);
    expect(d.invoiced - d.received).toBe(d.outstanding);
    expect([...d.byCustomer.values()].reduce((x, c) => x + c.outstanding, 0n)).toBe(d.outstanding);
    expect(s.payments.reduce((x, p) => x + p.amount + p.tds, 0n)).toBe(d.received);
    expect(d.rows.some((r) => r.status === 'overdue')).toBe(true);
  });

  it('issues an invoice with exact 13% VAT and settles it with a payment and TDS', () => {
    let s = bizState();
    const lines = [{ id: 'a', description: 'Development', quantity: '12.5', rate: 250_000n }, { id: 'b', description: 'Manuals', quantity: 3n, rate: 75_000n, taxable: false }];
    s = bizReducer(s, { type: 'issue', lines });
    const issued = s.invoices.at(-1)!;
    expect(issued.number).toBe('INV-2083/84-0013');
    const t = totalsOf(issued);
    expect(t.taxable).toBe(3_125_000n);
    expect(t.vat).toBe(406_250n);
    expect(t.total).toBe(3_125_000n + 225_000n + 406_250n);
    const before = deriveBiz(s).outstanding;
    s = bizReducer(s, { type: 'pay', payment: { invoiceId: issued.id, date: TODAY, amount: t.total - 46_875n, tds: 46_875n, mode: 'bank' } });
    const d = deriveBiz(s);
    expect(before - d.outstanding).toBe(t.total);
    expect(d.rows.find((r) => r.invoice.id === issued.id)!.status).toBe('paid');
  });
});
