// The accounting app's books: a chart of accounts and sixteen months of journals for Sagarmatha Digital (FY 2082/83
// from Shrawan 1, and FY 2083/84 to 15 Kartik 2083), generated from a seed so the server and the browser build the
// same ledger. Every business event is one balanced journal: invoices with 13% VAT, receipts net of the 1.5% TDS the
// customer withholds, contractor bills, rent with 10% TDS, monthly payroll (the shared payroll, so it agrees with the
// business app), VAT, TDS and SSF deposits on the 25th, depreciation, bank charges and interest. Pure TypeScript.
import { applyRate } from '@punji/ui/calculations';
import { journalsToEntries, type JournalEntry, type JournalLine, type LedgerEntry, type NormalSide, type StatementRow } from '@punji/ui/ledger';
import { nepalFiscalMonthPeriods, nepalFiscalQuarterPeriods, nepalFiscalYearPeriods, type FinancialPeriod } from '@punji/ui/period-selector';
import type { AgingItem, TdsEntryInput } from '@punji/ui/tax';
import type { ReconcileItem } from '@punji/ui/reconciliation-matcher';
import type { CalendarDate } from '@punji/ui/nepal/date-only';
import { CUSTOMERS, PAYROLL, PAYROLL_TOTALS, TODAY, addDays, compareDates, dayNumber, fromDayNumber } from '../shared/books.ts';
import { hashString, seeded } from '../shared/sim.ts';

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export interface Account {
  code: string;
  name: string;
  type: AccountType;
  /** The side that increases it. A contra account (accumulated depreciation) sits on the other side of its type. */
  normal: NormalSide;
  group: string;
}

export const ACCOUNTS: readonly Account[] = [
  { code: '1000', name: 'Cash in hand', type: 'asset', normal: 'debit', group: 'Current assets' },
  { code: '1010', name: 'NIC Asia Bank, current', type: 'asset', normal: 'debit', group: 'Current assets' },
  { code: '1100', name: 'Accounts receivable', type: 'asset', normal: 'debit', group: 'Current assets' },
  { code: '1150', name: 'Input VAT', type: 'asset', normal: 'debit', group: 'Current assets' },
  { code: '1160', name: 'Advance tax (TDS by others)', type: 'asset', normal: 'debit', group: 'Current assets' },
  { code: '1500', name: 'Office equipment', type: 'asset', normal: 'debit', group: 'Non-current assets' },
  { code: '1510', name: 'Accumulated depreciation', type: 'asset', normal: 'credit', group: 'Non-current assets' },
  { code: '2000', name: 'Accounts payable', type: 'liability', normal: 'credit', group: 'Current liabilities' },
  { code: '2100', name: 'Output VAT', type: 'liability', normal: 'credit', group: 'Current liabilities' },
  { code: '2200', name: 'TDS payable', type: 'liability', normal: 'credit', group: 'Current liabilities' },
  { code: '2300', name: 'SSF payable', type: 'liability', normal: 'credit', group: 'Current liabilities' },
  { code: '2310', name: 'CIT payable', type: 'liability', normal: 'credit', group: 'Current liabilities' },
  { code: '3000', name: 'Share capital', type: 'equity', normal: 'credit', group: 'Equity' },
  { code: '3100', name: 'Retained earnings', type: 'equity', normal: 'credit', group: 'Equity' },
  { code: '4000', name: 'Service revenue', type: 'income', normal: 'credit', group: 'Income' },
  { code: '4100', name: 'Interest income', type: 'income', normal: 'credit', group: 'Income' },
  { code: '5000', name: 'Salaries and allowances', type: 'expense', normal: 'debit', group: 'Expenses' },
  { code: '5010', name: 'Employer SSF contribution', type: 'expense', normal: 'debit', group: 'Expenses' },
  { code: '5100', name: 'Office rent', type: 'expense', normal: 'debit', group: 'Expenses' },
  { code: '5200', name: 'Contractor fees', type: 'expense', normal: 'debit', group: 'Expenses' },
  { code: '5300', name: 'Internet and electricity', type: 'expense', normal: 'debit', group: 'Expenses' },
  { code: '5400', name: 'Office supplies', type: 'expense', normal: 'debit', group: 'Expenses' },
  { code: '5500', name: 'Depreciation', type: 'expense', normal: 'debit', group: 'Expenses' },
  { code: '5600', name: 'Bank charges', type: 'expense', normal: 'debit', group: 'Expenses' },
];
export const accountByCode = new Map(ACCOUNTS.map((a) => [a.code, a]));
export const accountName = (code: string) => {
  const a = accountByCode.get(code);
  return a ? `${a.code} · ${a.name}` : code;
};
export const BANK = '1010';

// ---- Periods: BS fiscal years, quarters and months that have started by the session date ----
export const FISCAL_YEARS = nepalFiscalYearPeriods(2082, 2083);
const started = (p: FinancialPeriod) => compareDates(p.start!, TODAY) <= 0;
export const MONTHS = [...nepalFiscalMonthPeriods(2082), ...nepalFiscalMonthPeriods(2083)].filter(started);
export const PERIODS: readonly FinancialPeriod[] = [
  ...FISCAL_YEARS,
  ...[...nepalFiscalQuarterPeriods(2082), ...nepalFiscalQuarterPeriods(2083)].filter(started),
  ...MONTHS,
];
export const DATA_START = FISCAL_YEARS[0]!.start!;
/** Inclusive range of a period, cut at the session date. */
export const rangeOf = (p: FinancialPeriod): { from: CalendarDate; to: CalendarDate } => ({ from: p.start!, to: compareDates(p.end!, TODAY) > 0 ? TODAY : p.end! });
export const fiscalYearOf = (d: CalendarDate) => FISCAL_YEARS.find((fy) => compareDates(fy.start!, d) <= 0 && compareDates(d, fy.end!) <= 0) ?? FISCAL_YEARS[0]!;

// ---- Generation ----
export interface OpenItem extends AgingItem {
  /** The invoice or bill date. */
  issued: CalendarDate;
  /** Total including VAT, paisa. */
  total: bigint;
  /** When it was settled, if it was by the session date. */
  settled?: CalendarDate;
}

export interface Books {
  journals: JournalEntry[];
  invoices: OpenItem[];
  bills: OpenItem[];
  /** Every withholding the company made (TDS payable), dated by payment. */
  tds: (TdsEntryInput & { date: CalendarDate })[];
  /** The bank statement for the reconciliation month, and its opening and closing balances. */
  statement: { lines: ReconcileItem[]; month: FinancialPeriod; opening: bigint; closing: bigint };
}

const CONTRACTOR = { name: 'Kathmandu Dev Studio', pan: '307654321' };
const LANDLORD = { name: 'Ram Prasad Shrestha', pan: '112233445' };
const RENT = 15_000_000n; // Rs 1,50,000 a month
const DELAY: Record<string, number> = { 'c-everest': 22, 'c-himal': 34, 'c-lumbini': 48, 'c-fewa': 12, 'c-janakpur': 130, 'c-koshi': 38 };
const rupees = (n: number) => BigInt(Math.round(n)) * 100n;

/** The reconciliation month: Ashwin 2083 (17 Sep to 17 Oct 2026), the last full month. */
export const RECON_MONTH_INDEX = 14;

export function generateBooks(): Books {
  const rng = seeded(hashString('sagarmatha-digital-books'));
  const between = (lo: number, hi: number, step = 500) => rupees(Math.round((lo + rng() * (hi - lo)) / step) * step);
  const journals: JournalEntry[] = [];
  const invoices: OpenItem[] = [];
  const bills: OpenItem[] = [];
  const tds: Books['tds'] = [];
  const monthOf = (d: CalendarDate) => MONTHS.findIndex((m) => compareDates(m.start!, d) <= 0 && compareDates(d, m.end!) <= 0);
  const acc = { vatOut: [] as bigint[], vatIn: [] as bigint[], tds: [] as bigint[], ssf: [] as bigint[], cit: [] as bigint[] };
  const add = (key: keyof typeof acc, d: CalendarDate, amount: bigint) => {
    const k = monthOf(d);
    if (k >= 0) acc[key][k] = (acc[key][k] ?? 0n) + amount;
  };
  const post = (id: string, date: CalendarDate, memo: string, lines: [string, bigint, bigint][]) => {
    if (compareDates(date, TODAY) > 0) return false;
    journals.push({ id, date, memo, lines: lines.filter(([, dr, cr]) => dr > 0n || cr > 0n).map(([account, debit, credit]): JournalLine => ({ account, debit, credit })) });
    return true;
  };

  post('OB-0001', DATA_START, 'Opening balances, FY 2082/83', [
    ['1000', 4_000_000n, 0n],
    ['1010', 350_000_000n, 0n],
    ['1500', 180_000_000n, 0n],
    ['1510', 0n, 45_000_000n],
    ['3000', 0n, 300_000_000n],
    ['3100', 0n, 189_000_000n],
  ]);

  let invoiceNo = 0;
  let billNo = 0;
  MONTHS.forEach((month, k) => {
    const s = month.start!;
    const end = month.end!;
    const fy = k < 12 ? '2082' : '2083';
    // Sales: three or four invoices, customers in turn.
    const count = 3 + (rng() < 0.5 ? 1 : 0);
    for (let i = 0; i < count; i += 1) {
      const customer = CUSTOMERS[(k * 3 + i * 2) % CUSTOMERS.length]!;
      const date = addDays(s, 2 + i * 7);
      if (compareDates(date, TODAY) > 0) continue;
      const net = between(240_000 + k * 6_000, 520_000 + k * 8_000);
      const vat = applyRate(net, '0.13', 'half-up');
      const total = net + vat;
      invoiceNo += 1;
      const id = `SI-${fy}-${String(invoiceNo).padStart(4, '0')}`;
      post(id, date, `Invoice ${id}, ${customer.name}`, [['1100', total, 0n], ['4000', 0n, net], ['2100', 0n, vat]]);
      add('vatOut', date, vat);
      const paidOn = addDays(date, Math.max(5, DELAY[customer.id]! + Math.round((rng() - 0.5) * 16)));
      const item: OpenItem = { id, party: customer.name, date: addDays(date, customer.terms), issued: date, amount: total, total };
      const withheld = applyRate(net, '0.015', 'half-up');
      if (post(`RV-${id.slice(3)}`, paidOn, `Receipt for ${id}, ${customer.name} (1.5% TDS withheld)`, [['1010', total - withheld, 0n], ['1160', withheld, 0n], ['1100', 0n, total]])) item.settled = paidOn;
      invoices.push(item);
    }
    // Contractor bill on the 13th, paid 30 days later less 1.5% TDS.
    {
      const date = addDays(s, 12);
      if (compareDates(date, TODAY) <= 0) {
        const net = between(260_000, 420_000);
        const vat = applyRate(net, '0.13', 'half-up');
        billNo += 1;
        const id = `PB-${fy}-${String(billNo).padStart(4, '0')}`;
        post(id, date, `Bill ${id}, ${CONTRACTOR.name}`, [['5200', net, 0n], ['1150', vat, 0n], ['2000', 0n, net + vat]]);
        add('vatIn', date, vat);
        const item: OpenItem = { id, party: CONTRACTOR.name, date: addDays(date, 30), issued: date, amount: net + vat, total: net + vat };
        const paidOn = addDays(date, 30);
        const withheld = applyRate(net, '0.015', 'half-up');
        if (post(`PV-${id.slice(3)}`, paidOn, `Cheque to ${CONTRACTOR.name} for ${id} (1.5% TDS)`, [['2000', net + vat, 0n], ['2200', 0n, withheld], ['1010', 0n, net + vat - withheld]])) {
          item.settled = paidOn;
          add('tds', paidOn, withheld);
          tds.push({ id: `PV-${id.slice(3)}`, date: paidOn, party: CONTRACTOR.name, pan: CONTRACTOR.pan, category: 'Contract payment', gross: net, rate: '0.015' });
        }
        bills.push(item);
      }
    }
    // Rent on the 2nd, 10% TDS.
    const rentDate = addDays(s, 1);
    const rentTds = applyRate(RENT, '0.1', 'half-up');
    if (post(`RN-${month.id.slice(2)}`, rentDate, `Office rent, ${month.label} (10% TDS)`, [['5100', RENT, 0n], ['2200', 0n, rentTds], ['1010', 0n, RENT - rentTds]])) {
      add('tds', rentDate, rentTds);
      tds.push({ id: `RN-${month.id.slice(2)}`, date: rentDate, party: LANDLORD.name, pan: LANDLORD.pan, category: 'House rent', gross: RENT, rate: '0.1' });
    }
    // Internet (with VAT), electricity (exempt), supplies from petty cash.
    const net = between(11_000, 13_000, 100);
    const netVat = applyRate(net, '0.13', 'half-up');
    if (post(`EX-${month.id.slice(2)}-1`, addDays(s, 5), `Worldlink internet, ${month.label}`, [['5300', net, 0n], ['1150', netVat, 0n], ['1010', 0n, net + netVat]])) add('vatIn', addDays(s, 5), netVat);
    const power = between(7_000, 11_000, 10);
    post(`EX-${month.id.slice(2)}-2`, addDays(s, 19), `NEA electricity, ${month.label}`, [['5300', power, 0n], ['1010', 0n, power]]);
    post(`PC-${month.id.slice(2)}`, addDays(s, 13), 'Petty cash top-up', [['1000', 1_000_000n, 0n], ['1010', 0n, 1_000_000n]]);
    const sup = between(3_000, 6_000, 50);
    const supVat = applyRate(sup, '0.13', 'half-up');
    if (post(`EX-${month.id.slice(2)}-3`, addDays(s, 15), 'Stationery and pantry, cash', [['5400', sup, 0n], ['1150', supVat, 0n], ['1000', 0n, sup + supVat]])) add('vatIn', addDays(s, 15), supVat);
    // Equipment: laptops in Ashwin 2082.
    if (k === 2) {
      const cost = 72_000_000n;
      const vat = applyRate(cost, '0.13', 'half-up');
      if (post('FA-2082-0001', addDays(s, 8), 'Laptops for the engineering team', [['1500', cost, 0n], ['1150', vat, 0n], ['1010', 0n, cost + vat]])) add('vatIn', addDays(s, 8), vat);
    }
    // Month end: payroll, depreciation, bank charges, quarterly interest.
    if (compareDates(end, TODAY) <= 0) {
      const t = PAYROLL_TOTALS;
      post(`PR-${month.id.slice(2)}`, end, `Payroll, ${month.label}`, [['5000', t.salary, 0n], ['5010', t.employerSsf, 0n], ['2300', 0n, t.ssf], ['2310', 0n, t.cit], ['2200', 0n, t.tds], ['1010', 0n, t.net]]);
      add('tds', end, t.tds);
      add('ssf', end, t.ssf);
      add('cit', end, t.cit);
      for (const row of PAYROLL) {
        tds.push({ id: `PR-${month.id.slice(2)}-${row.employee.code}`, date: end, party: row.employee.name, pan: row.employee.pan, category: 'Salary', gross: row.gross, rate: (Number((row.tds * 10_000n) / row.gross) / 10_000).toFixed(4), withheld: row.tds });
      }
      post(`DP-${month.id.slice(2)}`, end, `Depreciation, ${month.label}`, [['5500', k < 2 ? 3_000_000n : 4_200_000n, 0n], ['1510', 0n, k < 2 ? 3_000_000n : 4_200_000n]]);
      post(`BC-${month.id.slice(2)}`, end, 'Bank service charge', [['5600', 50_000n, 0n], ['1010', 0n, 50_000n]]);
      if (k % 3 === 2) {
        const interest = between(18_000, 30_000, 10);
        const withheld = applyRate(interest, '0.06', 'half-up');
        post(`IN-${month.id.slice(2)}`, end, 'Interest on the current account (6% TDS by the bank)', [['1010', interest - withheld, 0n], ['1160', withheld, 0n], ['4100', 0n, interest]]);
      }
    }
  });
  // Deposits on the 25th of the next BS month: VAT return, TDS, SSF and CIT.
  MONTHS.forEach((month, k) => {
    const next = MONTHS[k + 1];
    const date = next ? addDays(next.start!, 24) : addDays(month.end!, 25);
    const id = month.id.slice(2);
    const out = acc.vatOut[k] ?? 0n;
    const inp = acc.vatIn[k] ?? 0n;
    if (out > 0n || inp > 0n) post(`VT-${id}`, date, `VAT return, ${month.label}`, [['2100', out, 0n], ['1150', 0n, inp], ['1010', out > inp ? 0n : inp - out, out > inp ? out - inp : 0n]]);
    if (acc.tds[k]) post(`TD-${id}`, date, `TDS deposited, ${month.label}`, [['2200', acc.tds[k]!, 0n], ['1010', 0n, acc.tds[k]!]]);
    if (acc.ssf[k]) post(`SS-${id}`, date, `SSF and CIT deposited, ${month.label}`, [['2300', acc.ssf[k]!, 0n], ['2310', acc.cit[k] ?? 0n, 0n], ['1010', 0n, acc.ssf[k]! + (acc.cit[k] ?? 0n)]]);
  });
  journals.sort((a, b) => compareDates(a.date, b.date) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { journals, invoices, bills, tds, statement: bankStatement(journals) };
}

/** A bank statement for the reconciliation month built from the books: each payroll paid as one transfer per person,
 *  the last cheque not yet presented, the last receipt still in transit, and two charges the books do not have. */
function bankStatement(journals: readonly JournalEntry[]): Books['statement'] {
  const month = MONTHS[RECON_MONTH_INDEX]!;
  const from = dayNumber(month.start!);
  const to = dayNumber(month.end!);
  const bank = journalsToEntries(journals).filter((e) => e.account === BANK);
  const opening = bank.filter((e) => dayNumber(e.date) < from).reduce((s, e) => s + e.debit - e.credit, 0n);
  const inMonth = bank.filter((e) => dayNumber(e.date) >= from && dayNumber(e.date) <= to);
  const lastCheque = inMonth.filter((e) => e.reference?.startsWith('PV-')).at(-1);
  const lastReceipt = inMonth.filter((e) => e.reference?.startsWith('RV-')).at(-1);
  const lines: ReconcileItem[] = [];
  const clamp = (n: number) => fromDayNumber(Math.min(to, n));
  for (const e of inMonth) {
    if (e === lastCheque || e === lastReceipt) continue;
    const amount = e.debit - e.credit;
    const ref = e.reference ?? e.id;
    if (ref.startsWith('PR-')) {
      for (const row of PAYROLL) lines.push({ id: `st-${ref}-${row.employee.code}`, date: e.date, description: `Salary transfer ${row.employee.name.toUpperCase()} A/C ••${row.employee.account}`, reference: ref, amount: -row.net });
      continue;
    }
    const lag = amount > 0n ? 1 : ref.startsWith('PV-') ? 2 : 0;
    lines.push({ id: `st-${ref}`, date: clamp(dayNumber(e.date) + lag), description: narrate(ref, e), reference: ref.startsWith('PV-') ? `CHQ ${ref.slice(-4)}` : ref, amount });
  }
  lines.push({ id: 'st-sms', date: fromDayNumber(to - 3), description: 'SMS banking charge, quarterly', amount: -22_600n });
  lines.push({ id: 'st-chq-book', date: fromDayNumber(from + 6), description: 'Cheque book issue charge', amount: -50_000n });
  const sorted = lines.toSorted((a, b) => dayNumber(a.date) - dayNumber(b.date));
  const closing = opening + sorted.reduce((s, l) => s + l.amount, 0n);
  return { lines: sorted, month, opening, closing };
}

function narrate(ref: string, e: LedgerEntry): string {
  const kind = ref.slice(0, 2);
  const words: Record<string, string> = {
    RV: 'Deposit, customer transfer', PV: 'Cheque paid', RN: 'Standing order, rent', EX: 'Card or online payment', PC: 'Cash withdrawal',
    VT: 'IRD VAT payment', TD: 'IRD TDS payment', SS: 'SSF and CIT payment', BC: 'Service charge', IN: 'Interest credited', FA: 'Online payment',
  };
  return `${words[kind] ?? 'Transaction'}${e.description ? `: ${e.description.split(',')[0]}` : ''}`;
}

// ---- Reading the books ----
export interface Ledger {
  entries: LedgerEntry[];
  /** Day number of each entry, same order. */
  days: number[];
}

export function ledgerOf(journals: readonly JournalEntry[]): Ledger {
  const entries = journalsToEntries(journals.toSorted((a, b) => compareDates(a.date, b.date)));
  return { entries, days: entries.map((e) => dayNumber(e.date)) };
}

/** Debit minus credit per account over an inclusive date range (from null: from the beginning). */
export function netByAccount(ledger: Ledger, from: CalendarDate | null, to: CalendarDate): Map<string, bigint> {
  const lo = from ? dayNumber(from) : -Infinity;
  const hi = dayNumber(to);
  const out = new Map<string, bigint>();
  ledger.entries.forEach((e, i) => {
    const d = ledger.days[i]!;
    if (d < lo || d > hi) return;
    out.set(e.account, (out.get(e.account) ?? 0n) + e.debit - e.credit);
  });
  return out;
}

/** Balance on the account's normal side. */
export const onNormal = (net: Map<string, bigint>, code: string) => {
  const value = net.get(code) ?? 0n;
  return accountByCode.get(code)?.normal === 'credit' ? -value : value;
};

export function profitOf(net: Map<string, bigint>): { income: bigint; expenses: bigint; profit: bigint } {
  let income = 0n, expenses = 0n;
  for (const a of ACCOUNTS) {
    if (a.type === 'income') income += onNormal(net, a.code);
    if (a.type === 'expense') expenses += onNormal(net, a.code);
  }
  return { income, expenses, profit: income - expenses };
}

const group = (name: string, type: AccountType) => ACCOUNTS.filter((a) => a.group === name && a.type === type);

export interface Column { key: string; from: CalendarDate; to: CalendarDate }

const line = (a: Account, values: Record<string, bigint>, effect?: 'subtract'): StatementRow => ({ kind: 'line', id: a.code, label: a.name, values, ...(effect ? { effect } : {}) });

/** Income statement rows (subtotals left for `rollUp`). */
export function profitAndLossRows(ledger: Ledger, columns: readonly Column[]): StatementRow[] {
  const nets = columns.map((c) => netByAccount(ledger, c.from, c.to));
  const values = (code: string) => Object.fromEntries(columns.map((c, i) => [c.key, onNormal(nets[i]!, code)]));
  const of = (type: AccountType) => ACCOUNTS.filter((a) => a.type === type).map((a) => line(a, values(a.code)));
  return [
    {
      kind: 'section', id: 'pl', label: 'Profit and loss', subtotal: { label: 'Net profit', grand: true },
      rows: [
        { kind: 'section', id: 'income', label: 'Income', rows: of('income'), subtotal: { label: 'Total income' } },
        { kind: 'section', id: 'expenses', label: 'Expenses', rows: of('expense'), subtotal: { label: 'Total expenses' }, effect: 'subtract' },
      ],
    },
  ];
}

/** Balance sheet rows at each column's `to` date (subtotals left for `rollUp`). */
export function balanceSheetRows(ledger: Ledger, columns: readonly Column[]): StatementRow[] {
  const nets = columns.map((c) => netByAccount(ledger, null, c.to));
  const values = (code: string) => Object.fromEntries(columns.map((c, i) => [c.key, onNormal(nets[i]!, code)]));
  const assetLine = (a: Account) => line(a, values(a.code), a.normal === 'credit' ? 'subtract' : undefined);
  const fyStartNets = columns.map((c) => netByAccount(ledger, null, addDays(fiscalYearOf(c.to).start!, -1)));
  const yearNets = columns.map((c) => netByAccount(ledger, fiscalYearOf(c.to).start!, c.to));
  // Retained earnings at the date, split: what came into the year (and any entry posted to the account) and this year's profit.
  const broughtForward = Object.fromEntries(columns.map((c, i) => [c.key, onNormal(nets[i]!, '3100') + profitOf(fyStartNets[i]!).profit]));
  const yearToDate = Object.fromEntries(columns.map((c, i) => [c.key, profitOf(yearNets[i]!).profit]));
  return [
    {
      kind: 'section', id: 'assets', label: 'Assets', subtotal: { label: 'Total assets', grand: true },
      rows: [
        { kind: 'section', id: 'current', label: 'Current assets', rows: group('Current assets', 'asset').map(assetLine), subtotal: { label: 'Total current assets' } },
        { kind: 'section', id: 'noncurrent', label: 'Non-current assets', rows: group('Non-current assets', 'asset').map(assetLine), subtotal: { label: 'Net non-current assets' } },
      ],
    },
    {
      kind: 'section', id: 'le', label: 'Liabilities and equity', subtotal: { label: 'Total liabilities and equity', grand: true },
      rows: [
        { kind: 'section', id: 'liabilities', label: 'Current liabilities', rows: group('Current liabilities', 'liability').map((a) => line(a, values(a.code))), subtotal: { label: 'Total liabilities' } },
        {
          kind: 'section', id: 'equity', label: 'Equity', subtotal: { label: 'Total equity' },
          rows: [
            line(accountByCode.get('3000')!, values('3000')),
            { kind: 'line', id: 're', label: 'Retained earnings brought forward', values: broughtForward },
            { kind: 'line', id: 'ytd', label: 'Profit for the year to date', values: yearToDate },
          ],
        },
      ],
    },
  ];
}
