// Illustrative small-business books in NPR (paisa). Invented for tests and docs; not real figures.
import type { JournalEntry, LedgerEntry, StatementRow } from '../src/ledger/ledger.ts';

const d = (year: number, month: number, day: number) => ({ year, month, day });

/** Cash account, Shrawan 2081 (mid-Aug 2024 in AD), debit-normal. */
export const cashEntries: LedgerEntry[] = [
  { id: 'c1', date: d(2024, 8, 2), account: 'Cash', reference: 'SI-0101', description: 'Cash sale, Thamel counter', debit: 11300000n, credit: 0n },
  { id: 'c2', date: d(2024, 8, 4), account: 'Cash', reference: 'PV-0044', description: 'Purchase of stock from Bhatbhateni Traders', debit: 0n, credit: 4520000n },
  { id: 'c3', date: d(2024, 8, 7), account: 'Cash', reference: 'RV-0019', description: 'Received from Himalayan Stationers', debit: 7800050n, credit: 0n },
  { id: 'c4', date: d(2024, 8, 9), account: 'Cash', reference: 'PV-0045', description: 'Deposited to NIC Asia Bank', debit: 0n, credit: 10000000n },
];

export const saleJournal: JournalEntry = {
  id: 'JV-2081-0101', date: d(2024, 8, 2), memo: 'Cash sale with VAT, Thamel counter',
  lines: [
    { account: 'Cash', debit: 11300000n, credit: 0n },
    { account: 'Sales', debit: 0n, credit: 10000000n },
    { account: 'VAT Payable', debit: 0n, credit: 1300000n },
  ],
};

export const purchaseJournal: JournalEntry = {
  id: 'JV-2081-0102', date: d(2024, 8, 4), memo: 'Stock purchase',
  lines: [
    { account: 'Purchases', debit: 4000000n, credit: 0n },
    { account: 'VAT Payable', debit: 520000n, credit: 0n },
    { account: 'Cash', debit: 0n, credit: 4520000n },
  ],
};

export const depositJournal: JournalEntry = {
  id: 'JV-2081-0103', date: d(2024, 8, 9), memo: 'Bank deposit',
  lines: [
    { account: 'NIC Asia Bank', debit: 10000000n, credit: 0n },
    { account: 'Cash', debit: 0n, credit: 10000000n },
  ],
};

/** 5.00 short on the credit side. */
export const unbalancedJournal: JournalEntry = {
  id: 'JV-2081-0104', date: d(2024, 8, 10), memo: 'Rent paid (draft)',
  lines: [
    { account: 'Rent Expense', debit: 2500000n, credit: 0n },
    { account: 'Cash', debit: 0n, credit: 2499500n },
  ],
};

export const journals: JournalEntry[] = [saleJournal, purchaseJournal, depositJournal];

export const periods = [{ key: '2080/81', label: 'FY 2080/81' }, { key: '2081/82', label: 'FY 2081/82' }] as const;

/** An income statement as a caller-built tree; subtotals are rolled up with rollUp(). */
export const incomeStatement: StatementRow[] = [{
  kind: 'section', id: 'profit', label: 'Profit for the year', subtotal: { label: 'Net profit', grand: true }, rows: [
    { kind: 'section', id: 'income', label: 'Income', subtotal: { label: 'Total income' }, rows: [
      { kind: 'line', id: 'sales', label: 'Sales', values: { '2080/81': 842000000n, '2081/82': 961250000n } },
      { kind: 'line', id: 'interest', label: 'Interest received', values: { '2080/81': 1250000n, '2081/82': 1840050n } },
    ] },
    { kind: 'section', id: 'expenses', label: 'Expenses', effect: 'subtract', subtotal: { label: 'Total expenses' }, rows: [
      { kind: 'line', id: 'purchases', label: 'Purchases', values: { '2080/81': 531000000n, '2081/82': 602500000n } },
      { kind: 'line', id: 'salaries', label: 'Salaries and wages', values: { '2080/81': 120000000n, '2081/82': 138000000n } },
      { kind: 'line', id: 'rent', label: 'Rent', values: { '2080/81': 30000000n, '2081/82': 32400000n } },
      { kind: 'line', id: 'bank', label: 'Bank charges', values: { '2080/81': 480000n, '2081/82': null } },
    ] },
  ],
}];
