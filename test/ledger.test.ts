import { describe, expect, it } from 'vitest';

import {
  accountBalance, findRollUpMismatches, isBalanced, journalImbalance, journalTotals, journalsToEntries, ledgerToCsv, rollUp, runningBalance, signedMovement,
  statementPeriods, trialBalance, type JournalEntry, type LedgerEntry, type StatementRow,
} from '../src/ledger/ledger.ts';
import * as fc from 'fast-check';
import { NUM_RUNS } from './fc.ts';

fc.configureGlobal({ numRuns: NUM_RUNS });

const date = { year: 2024, month: 8, day: 1 };
const amountArb = fc.bigInt({ min: 1n, max: 10n ** 15n });
const accountArb = fc.constantFrom('Cash', 'NIC Asia Bank', 'Sales', 'Purchases', 'VAT Payable');

/** A balanced journal: n debit lines to random accounts, then credit lines that split the same total. */
const balancedJournal = fc.record({
  debits: fc.array(fc.record({ account: accountArb, amount: amountArb }), { minLength: 1, maxLength: 5 }),
  credits: fc.array(accountArb, { minLength: 1, maxLength: 5 }),
}).map(({ debits, credits }) => {
  const total = debits.reduce((sum, line) => sum + line.amount, 0n);
  const share = total / BigInt(credits.length);
  const rest = total - share * BigInt(credits.length);
  const creditLines = credits.map((account, index) => ({ account, debit: 0n, credit: share + (index === 0 ? rest : 0n) }));
  const lines = [...debits.map(line => ({ account: line.account, debit: line.amount, credit: 0n })), ...creditLines].filter(line => line.debit + line.credit > 0n);
  return { id: 'J', date, lines } satisfies JournalEntry;
});

const entryArb = fc.record({ id: fc.string(), account: fc.constant('Cash'), debit: fc.bigInt({ min: 0n, max: 10n ** 12n }), credit: fc.bigInt({ min: 0n, max: 10n ** 12n }) })
  .map((e): LedgerEntry => (e.debit > 0n && e.credit > 0n ? { ...e, date, credit: 0n } : { ...e, date }));

describe('ledger arithmetic', () => {
  it('sums a journal exactly and compares the sides', () => {
    const journal: JournalEntry = { id: 'JV-1', date, lines: [{ account: 'Cash', debit: 11300000n, credit: 0n }, { account: 'Sales', debit: 0n, credit: 10000000n }, { account: 'VAT Payable', debit: 0n, credit: 1300000n }] };
    expect(journalTotals(journal)).toEqual({ debit: 11300000n, credit: 11300000n });
    expect(isBalanced(journal)).toBe(true);
    expect(journalImbalance({ lines: [...journal.lines, { account: 'Cash', debit: 5n, credit: 0n }] })).toBe(5n);
  });

  it('is exact beyond Number.MAX_SAFE_INTEGER', () => {
    const big = 2n ** 80n + 1n;
    expect(isBalanced({ lines: [{ account: 'A', debit: big, credit: 0n }, { account: 'B', debit: 0n, credit: big }] })).toBe(true);
    expect(isBalanced({ lines: [{ account: 'A', debit: big, credit: 0n }, { account: 'B', debit: 0n, credit: big - 1n }] })).toBe(false);
  });

  it('rejects negative amounts, two-sided lines and non-bigint values', () => {
    expect(() => journalTotals({ lines: [{ account: 'A', debit: -1n, credit: 0n }] })).toThrow(RangeError);
    expect(() => journalTotals({ lines: [{ account: 'A', debit: 0n, credit: -1n }] })).toThrow(RangeError);
    expect(() => isBalanced({ lines: [{ account: 'A', debit: 5n, credit: 5n }] })).toThrow(/not both/);
    expect(() => journalTotals({ lines: [{ account: 'A', debit: 5 as unknown as bigint, credit: 0n }] })).toThrow(TypeError);
    expect(() => trialBalance([{ id: '1', date, account: 'A', debit: -1n, credit: 0n }])).toThrow(RangeError);
    expect(() => runningBalance([{ id: '1', date, account: 'A', debit: 1n, credit: 1n }], { normal: 'debit' })).toThrow(RangeError);
  });

  it('allows an empty journal and zero lines', () => {
    expect(isBalanced({ lines: [] })).toBe(true);
    expect(isBalanced({ lines: [{ account: 'A', debit: 0n, credit: 0n }] })).toBe(true);
  });

  it('runs a balance on the normal side and goes negative past zero', () => {
    const entries: LedgerEntry[] = [
      { id: '1', date, account: 'Cash', debit: 500000n, credit: 0n },
      { id: '2', date, account: 'Cash', debit: 0n, credit: 800000n },
    ];
    expect(runningBalance(entries, { normal: 'debit', opening: 100000n }).map(row => row.balance)).toEqual([600000n, -200000n]);
    expect(runningBalance(entries, { normal: 'credit' }).map(row => row.balance)).toEqual([-500000n, 300000n]);
    expect(signedMovement(entries[1]!, 'debit')).toBe(-800000n);
    expect(accountBalance(entries, 'Cash', { normal: 'debit', opening: 100000n })).toBe(-200000n);
    expect(accountBalance(entries, 'Sales', { normal: 'credit' })).toBe(0n);
  });

  it('builds a trial balance from entries or journals and flags a difference', () => {
    const journals: JournalEntry[] = [
      { id: 'J1', date, lines: [{ account: 'Cash', debit: 1000n, credit: 0n }, { account: 'Sales', debit: 0n, credit: 1000n }] },
      { id: 'J2', date, lines: [{ account: 'Purchases', debit: 400n, credit: 0n }, { account: 'Cash', debit: 0n, credit: 300n }] },
    ];
    const result = trialBalance(journals);
    expect(result.accounts.map(a => [a.account, a.debit, a.credit, a.net])).toEqual([['Cash', 1000n, 300n, 700n], ['Sales', 0n, 1000n, -1000n], ['Purchases', 400n, 0n, 400n]]);
    expect(result.totals).toEqual({ debit: 1400n, credit: 1300n });
    expect(result.netTotals).toEqual({ debit: 1100n, credit: 1000n });
    expect(result.balanced).toBe(false);
    expect(result.difference).toBe(100n);
    expect(trialBalance(journalsToEntries(journals))).toEqual(result);
    expect(trialBalance([]).balanced).toBe(true);
    expect(() => trialBalance([journals[0]!, { id: '1', date, account: 'A', debit: 0n, credit: 0n }] as unknown as JournalEntry[])).toThrow(TypeError);
  });

  it('turns journals into postings with stable ids and references', () => {
    const [first] = journalsToEntries([{ id: 'JV-7', date, memo: 'Cash sale', lines: [{ account: 'Cash', debit: 5n, credit: 0n }] }]);
    expect(first).toMatchObject({ id: 'JV-7:0', reference: 'JV-7', description: 'Cash sale', account: 'Cash', debit: 5n });
  });
});

describe('ledger properties', () => {
  it('a balanced journal has zero imbalance, and adding one unit to a side breaks it', () => {
    fc.assert(fc.property(balancedJournal, journal => {
      const { debit, credit } = journalTotals(journal);
      expect(debit - credit).toBe(0n);
      expect(isBalanced(journal)).toBe(true);
      expect(isBalanced({ lines: [...journal.lines, { account: 'Cash', debit: 1n, credit: 0n }] })).toBe(false);
    }));
  });

  it('the last running balance is opening + Σ(normal side − other side)', () => {
    fc.assert(fc.property(fc.array(entryArb, { maxLength: 20 }), fc.bigInt({ min: -(10n ** 12n), max: 10n ** 12n }), fc.constantFrom('debit', 'credit'), (entries, opening, normal) => {
      const rows = runningBalance(entries, { normal, opening });
      const normalSum = entries.reduce((sum, e) => sum + (normal === 'debit' ? e.debit : e.credit), 0n);
      const otherSum = entries.reduce((sum, e) => sum + (normal === 'debit' ? e.credit : e.debit), 0n);
      const expected = opening + normalSum - otherSum;
      expect(rows.length === 0 ? opening : rows.at(-1)!.balance).toBe(expected);
      expect(accountBalance(entries, 'Cash', { normal, opening })).toBe(expected);
    }));
  });

  it('trial balance totals are equal whenever every journal balances, and net totals agree', () => {
    fc.assert(fc.property(fc.array(balancedJournal, { maxLength: 8 }), journals => {
      const result = trialBalance(journals);
      expect(result.balanced).toBe(true);
      expect(result.totals.debit).toBe(result.totals.credit);
      expect(result.netTotals.debit).toBe(result.netTotals.credit);
      expect(result.difference).toBe(0n);
    }));
  });

  it('one unbalanced journal in balanced books makes the trial balance unbalanced by exactly its imbalance', () => {
    fc.assert(fc.property(fc.array(balancedJournal, { maxLength: 6 }), amountArb, (journals, extra) => {
      const bad: JournalEntry = { id: 'BAD', date, lines: [{ account: 'Cash', debit: extra, credit: 0n }] };
      const result = trialBalance([...journals, bad]);
      expect(result.balanced).toBe(false);
      expect(result.difference).toBe(extra);
      expect(result.netTotals.debit - result.netTotals.credit).toBe(extra);
    }));
  });

  it('trial balance debit total equals the sum of account debits (entries and journals agree)', () => {
    fc.assert(fc.property(fc.array(balancedJournal, { maxLength: 6 }), journals => {
      const fromJournals = trialBalance(journals);
      expect(trialBalance(journalsToEntries(journals))).toEqual(fromJournals);
      expect(fromJournals.accounts.reduce((sum, a) => sum + a.debit, 0n)).toBe(fromJournals.totals.debit);
    }));
  });
});

describe('statement roll-up', () => {
  const periods = ['2080/81', '2081/82'];
  const tree: StatementRow[] = [{
    kind: 'section', id: 'profit', label: 'Profit', subtotal: { label: 'Net profit', grand: true }, rows: [
      { kind: 'section', id: 'income', label: 'Income', subtotal: { label: 'Total income' }, rows: [
        { kind: 'line', id: 'sales', label: 'Sales', values: { '2080/81': 900n, '2081/82': 1200n } },
        { kind: 'line', id: 'other', label: 'Other income', values: { '2080/81': 100n } },
      ] },
      { kind: 'section', id: 'costs', label: 'Costs', effect: 'subtract', subtotal: { label: 'Total costs' }, rows: [
        { kind: 'line', id: 'purchases', label: 'Purchases', values: { '2080/81': 400n, '2081/82': 500n } },
      ] },
    ],
  }];

  it('adds sections up, subtracts costs and treats a missing period as zero', () => {
    expect(statementPeriods(tree)).toEqual(periods);
    const rolled = rollUp(tree) as [Extract<StatementRow, { kind: 'section' }>];
    expect(rolled[0].subtotal?.values).toEqual({ '2080/81': 600n, '2081/82': 700n });
    const income = rolled[0].rows[0] as Extract<StatementRow, { kind: 'section' }>;
    expect(income.subtotal?.values).toEqual({ '2080/81': 1000n, '2081/82': 1200n });
    expect((tree[0] as Extract<StatementRow, { kind: 'section' }>).subtotal?.values).toBeUndefined();
  });

  it('reports the subtotals that disagree', () => {
    expect(findRollUpMismatches(rollUp(tree))).toEqual([]);
    const wrong = structuredCloneRows(rollUp(tree));
    (wrong[0] as Extract<StatementRow, { kind: 'section' }>).subtotal = { label: 'Net profit', values: { '2080/81': 600n, '2081/82': 701n } };
    expect(findRollUpMismatches(wrong)).toEqual([{ id: 'profit', period: '2081/82', provided: 701n, computed: 700n }]);
    expect(findRollUpMismatches(tree).length).toBeGreaterThan(0);
  });

  it('rejects non-bigint values', () => {
    expect(() => rollUp([{ kind: 'section', id: 's', label: 'S', subtotal: { label: 'T' }, rows: [{ kind: 'line', id: 'l', label: 'L', values: { p: 1 as unknown as bigint } }] }])).toThrow(TypeError);
  });
});

function structuredCloneRows(rows: StatementRow[]): StatementRow[] { return rows.map(row => (row.kind === 'section' ? { ...row } : row)); }

describe('ledgerToCsv', () => {
  const entries: LedgerEntry[] = [
    { id: '1', date: { year: 2024, month: 8, day: 3 }, account: 'Cash', reference: 'SI-0042', description: 'Sale, "walk-in"', debit: 1130000n, credit: 0n },
    { id: '2', date, account: 'Cash', description: '=HYPERLINK("http://evil")', debit: 0n, credit: 2500000n },
  ];

  it('writes exact decimals, ISO dates and a signed running balance', () => {
    const csv = ledgerToCsv(entries, { currency: 'NPR', balance: true, crlf: false });
    expect(csv.split('\n')).toEqual([
      'Date,Reference,Account,Description,Debit,Credit,Balance',
      '2024-08-03,SI-0042,Cash,"Sale, ""walk-in""",11300.00,0.00,11300.00',
      `2024-08-01,,Cash,'=HYPERLINK("http://evil"),0.00,25000.00,-13700.00`.replace(`'=HYPERLINK("http://evil")`, `"'=HYPERLINK(""http://evil"")"`),
    ]);
  });

  it('keeps formula neutralisation on and honours a zero-decimal currency', () => {
    expect(ledgerToCsv(entries, { currency: 'JPY', crlf: false })).toContain('1130000,0');
    expect(ledgerToCsv([{ ...entries[0]!, account: '-cmd' }], { crlf: false })).toContain("'-cmd");
  });

  it('puts a credit-normal balance on the credit sign', () => {
    const csv = ledgerToCsv([{ id: '1', date, account: 'Sales', debit: 0n, credit: 500n }], { balance: true, normal: 'credit', crlf: false });
    expect(csv.split('\n')[1]).toBe('2024-08-01,,Sales,,0.00,5.00,-5.00');
  });
});

