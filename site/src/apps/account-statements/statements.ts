// The statements app's data: two accounts and three months each (August to October 2026), generated from fixed
// templates with a tiny seeded generator, so the same statement comes out on the server and in the browser. Pure
// TypeScript, no clock. Amounts are bigint paisa; money in is `credit`, money out is `debit`, both positive. Each
// month carries the totals the bank "declares" in its header, written as the lines are generated, so the table can
// check the lines it prints against an independent figure.
import type { CalendarDate } from '@punji/ui/nepal/date-only';

export interface Holder {
  id: string;
  name: string;
  address: string;
  product: string;
  account: string;
  /** Interest per year in percent for a savings product; 0 for none. */
  rate: number;
  opening: bigint;
}

export const BANK_NAME = 'Kanchenjunga Development Bank Ltd.';
export const BANK_CONTACT = 'Customer care 01-5550199 · care@example.com.np · Durbar Marg, Kathmandu';
/** The date every statement here was issued: the session date shared by the apps. */
export const ISSUED: CalendarDate = { year: 2026, month: 11, day: 1 };

export const ACCOUNTS: readonly Holder[] = [
  { id: 'savings', name: 'Sunita Karki', address: 'Kupondole-10, Lalitpur', product: 'Savings account', account: '0456-7788-1203', rate: 4, opening: 18_642_075n },
  { id: 'current', name: 'Himal Print Studio', address: 'New Baneshwor-31, Kathmandu', product: 'Current account', account: '0912-3300-4417', rate: 0, opening: 52_000_000n },
];

export interface MonthDef {
  id: string;
  year: number;
  month: number;
  label: string;
  days: number;
}
export const MONTHS: readonly MonthDef[] = [
  { id: '2026-08', year: 2026, month: 8, label: 'August 2026', days: 31 },
  { id: '2026-09', year: 2026, month: 9, label: 'September 2026', days: 30 },
  { id: '2026-10', year: 2026, month: 10, label: 'October 2026', days: 31 },
];

export type Category = 'Income' | 'Housing' | 'Utilities' | 'Cash' | 'Food' | 'Shopping' | 'Savings' | 'Transfers' | 'Business' | 'Tax' | 'Salaries' | 'Charges' | 'Interest';

export interface Line {
  id: string;
  date: CalendarDate;
  text: string;
  reference: string;
  category: Category;
  /** Money in, paisa, or 0. */
  credit: bigint;
  /** Money out, paisa, or 0. */
  debit: bigint;
  /** The balance after this line. */
  balance: bigint;
}

export interface Declared {
  count: number;
  credits: bigint;
  debits: bigint;
  closing: bigint;
}

export interface Statement {
  holder: Holder;
  month: MonthDef;
  opening: bigint;
  lines: readonly Line[];
  /** The totals in the bank's header, written while the lines were generated. */
  declared: Declared;
}

// ---- A tiny seeded generator (mulberry32) so a statement is the same everywhere ----
function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

interface Template {
  /** Day of the month, or 'last'. */
  day: number | 'last';
  text: string;
  prefix: string;
  category: Category;
  dir: 'in' | 'out';
  /** Paisa. min === max for a fixed amount. */
  min: bigint;
  max: bigint;
  step?: bigint;
  /** Only these months (1-12). Default every month. */
  months?: readonly number[];
  /** Interest: the opening balance at `rate` percent a year for the month, rounded down to the paisa. */
  interest?: boolean;
}
const rs = (n: number) => BigInt(n) * 100n;
const fixed = (amount: bigint) => ({ min: amount, max: amount });

const SAVINGS: readonly Template[] = [
  { day: 1, text: 'Salary credit, Sagarmatha Digital Pvt. Ltd.', prefix: 'SAL', category: 'Income', dir: 'in', ...fixed(rs(142_500)) },
  { day: 3, text: 'Rent transfer, Kupondole flat', prefix: 'FT', category: 'Housing', dir: 'out', ...fixed(rs(35_000)) },
  { day: 5, text: 'Nepal Electricity Authority bill', prefix: 'NEA', category: 'Utilities', dir: 'out', min: rs(1_800), max: rs(3_200), step: rs(50) },
  { day: 6, text: 'Worldlink internet', prefix: 'WL', category: 'Utilities', dir: 'out', ...fixed(rs(1_695)) },
  { day: 7, text: 'Ncell recharge', prefix: 'NC', category: 'Utilities', dir: 'out', min: rs(500), max: rs(1_500), step: rs(100) },
  { day: 9, text: 'ATM withdrawal, New Road', prefix: 'ATM', category: 'Cash', dir: 'out', min: rs(10_000), max: rs(15_000), step: rs(5_000) },
  { day: 12, text: 'Bhatbhateni Supermarket, POS', prefix: 'POS', category: 'Food', dir: 'out', min: rs(4_000), max: rs(9_000), step: rs(25) },
  { day: 15, text: 'SIP, Nabil Balanced Fund', prefix: 'SIP', category: 'Savings', dir: 'out', ...fixed(rs(10_000)) },
  { day: 18, text: 'Foodmandu, QR payment', prefix: 'QR', category: 'Food', dir: 'out', min: rs(1_200), max: rs(2_800), step: rs(10) },
  { day: 21, text: 'Transfer from Ram Karki', prefix: 'FT', category: 'Transfers', dir: 'in', ...fixed(rs(25_000)), months: [8, 10] },
  { day: 24, text: 'Daraz, online purchase (card)', prefix: 'CARD', category: 'Shopping', dir: 'out', min: rs(3_000), max: rs(8_000), step: rs(50) },
  { day: 27, text: 'ATM withdrawal, Jhamsikhel', prefix: 'ATM', category: 'Cash', dir: 'out', ...fixed(rs(10_000)) },
  { day: 28, text: 'Transfer to fixed deposit', prefix: 'FD', category: 'Savings', dir: 'out', ...fixed(rs(50_000)), months: [9] },
  { day: 'last', text: 'SMS alerts and card fee', prefix: 'CHG', category: 'Charges', dir: 'out', ...fixed(11_800n) },
  { day: 'last', text: 'Interest on balance', prefix: 'INT', category: 'Interest', dir: 'in', min: 0n, max: 0n, interest: true },
];

const CURRENT: readonly Template[] = [
  { day: 2, text: 'Receipt, Everest Stores Pvt. Ltd.', prefix: 'INV', category: 'Business', dir: 'in', min: rs(90_000), max: rs(180_000), step: rs(500) },
  { day: 4, text: 'Supplier, Paper Mart Pvt. Ltd.', prefix: 'CHQ', category: 'Business', dir: 'out', min: rs(60_000), max: rs(110_000), step: rs(500) },
  { day: 5, text: 'Rent, New Baneshwor shop', prefix: 'FT', category: 'Housing', dir: 'out', ...fixed(rs(48_000)) },
  { day: 8, text: 'Receipt, Himal Traders', prefix: 'INV', category: 'Business', dir: 'in', min: rs(70_000), max: rs(150_000), step: rs(500) },
  { day: 10, text: 'VAT deposit to IRD', prefix: 'IRD', category: 'Tax', dir: 'out', min: rs(25_000), max: rs(45_000), step: rs(100) },
  { day: 14, text: 'Staff salaries', prefix: 'SAL', category: 'Salaries', dir: 'out', ...fixed(rs(160_000)) },
  { day: 16, text: 'SSF contribution', prefix: 'SSF', category: 'Salaries', dir: 'out', ...fixed(rs(31_200)) },
  { day: 19, text: 'Receipt, Annapurna Hospitality', prefix: 'INV', category: 'Business', dir: 'in', min: rs(110_000), max: rs(210_000), step: rs(500) },
  { day: 22, text: 'Supplier, Ink Depot', prefix: 'CHQ', category: 'Business', dir: 'out', min: rs(18_000), max: rs(42_000), step: rs(100) },
  { day: 25, text: 'Electricity and internet', prefix: 'UT', category: 'Utilities', dir: 'out', min: rs(7_500), max: rs(11_500), step: rs(50) },
  { day: 'last', text: 'Cheque book and service charge', prefix: 'CHG', category: 'Charges', dir: 'out', ...fixed(11_800n) },
];

const TEMPLATES: Readonly<Record<string, readonly Template[]>> = { savings: SAVINGS, current: CURRENT };

const pad = (n: number) => String(n).padStart(2, '0');

function build(holder: Holder, monthIndex: number, opening: bigint): Statement {
  const month = MONTHS[monthIndex]!;
  const next = rng(hash(`${holder.id}-${month.id}`));
  const raw: Omit<Line, 'balance'>[] = [];
  TEMPLATES[holder.id]!.forEach((tpl, i) => {
    if (tpl.months && !tpl.months.includes(month.month)) return;
    const day = tpl.day === 'last' ? month.days : tpl.day;
    let amount: bigint;
    if (tpl.interest) amount = (opening * BigInt(holder.rate)) / 1200n;
    else if (tpl.max === tpl.min) amount = tpl.min;
    else {
      const step = tpl.step ?? 100n;
      const steps = Number((tpl.max - tpl.min) / step);
      amount = tpl.min + BigInt(Math.floor(next() * (steps + 1))) * step;
    }
    if (amount === 0n) return;
    raw.push({
      id: `${month.id}-${pad(i + 1)}`,
      date: { year: month.year, month: month.month, day },
      text: tpl.text,
      reference: `${tpl.prefix}-${pad(month.month)}${pad(day)}${pad(i + 1)}`,
      category: tpl.category,
      credit: tpl.dir === 'in' ? amount : 0n,
      debit: tpl.dir === 'out' ? amount : 0n,
    });
  });
  // The statement is in date order; lines on the same day keep their template order.
  raw.sort((a, b) => a.date.day - b.date.day || a.id.localeCompare(b.id));
  let balance = opening;
  let credits = 0n;
  let debits = 0n;
  const lines = raw.map((line) => {
    balance += line.credit - line.debit;
    credits += line.credit;
    debits += line.debit;
    return { ...line, balance };
  });
  return { holder, month, opening, lines, declared: { count: lines.length, credits, debits, closing: balance } };
}

const cache = new Map<string, readonly Statement[]>();
/** The months of one account, each opening at the previous month's closing balance. */
export function statementsOf(holderId: string): readonly Statement[] {
  const hit = cache.get(holderId);
  if (hit) return hit;
  const holder = ACCOUNTS.find((a) => a.id === holderId);
  if (!holder) throw new RangeError(`No account ${holderId}`);
  const out: Statement[] = [];
  let opening = holder.opening;
  MONTHS.forEach((_, i) => {
    const s = build(holder, i, opening);
    out.push(s);
    opening = s.declared.closing;
  });
  cache.set(holderId, out);
  return out;
}

export function statementOf(holderId: string, monthId: string): Statement {
  const found = statementsOf(holderId).find((s) => s.month.id === monthId);
  if (!found) throw new RangeError(`No statement ${holderId} ${monthId}`);
  return found;
}

/** The previous or next month's id, staying inside the months there are. */
export function stepMonth(monthId: string, by: -1 | 1): string {
  const i = MONTHS.findIndex((m) => m.id === monthId);
  return MONTHS[Math.min(MONTHS.length - 1, Math.max(0, (i < 0 ? MONTHS.length - 1 : i) + by))]!.id;
}

/**
 * The totals the bank declares, or those totals knocked out by one rupee in the credits when `drift` is set (a demo of a
 * statement whose header and lines disagree). Closing moves with it, as it would in a bad header.
 */
export function declaredOf(statement: Statement, drift: boolean): Declared {
  if (!drift) return statement.declared;
  return { ...statement.declared, credits: statement.declared.credits + 100n, closing: statement.declared.closing + 100n };
}

export interface Check {
  /** opening + credits - debits equals the closing balance. */
  arithmetic: boolean;
  /** Every running balance follows from the one before it. */
  running: boolean;
  /** The lines' own totals equal the declared totals. */
  totals: boolean;
  reconciled: boolean;
}

/** Recomputes the statement from its lines and compares it with the declared totals (exact bigint arithmetic). */
export function checkStatement(statement: Statement, declared: Declared = statement.declared): Check {
  let balance = statement.opening;
  let running = true;
  let credits = 0n;
  let debits = 0n;
  for (const line of statement.lines) {
    balance += line.credit - line.debit;
    credits += line.credit;
    debits += line.debit;
    if (balance !== line.balance) running = false;
  }
  const arithmetic = statement.opening + credits - debits === declared.closing;
  const totals = credits === declared.credits && debits === declared.debits && statement.lines.length === declared.count;
  return { arithmetic, running, totals, reconciled: arithmetic && running && totals };
}

export interface ArchiveRow {
  key: string;
  account: string;
  holderId: string;
  monthId: string;
  period: string;
  opening: bigint;
  credits: bigint;
  debits: bigint;
  closing: bigint;
  /** The opening balance equals the previous statement's closing balance. */
  chained: boolean;
  reconciled: boolean;
}

/** One row per account and month for the archive, newest month first within an account. */
export function archiveRows(): ArchiveRow[] {
  return ACCOUNTS.flatMap((holder) => {
    const all = statementsOf(holder.id);
    return all
      .map((s, i) => ({
        key: `${holder.id}-${s.month.id}`,
        account: `${holder.product} ${holder.account}`,
        holderId: holder.id,
        monthId: s.month.id,
        period: s.month.label,
        opening: s.opening,
        credits: s.declared.credits,
        debits: s.declared.debits,
        closing: s.declared.closing,
        chained: i === 0 || all[i - 1]!.declared.closing === s.opening,
        reconciled: checkStatement(s).reconciled,
      }))
      .toReversed();
  });
}
