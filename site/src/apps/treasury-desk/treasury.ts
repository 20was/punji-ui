// The treasury desk's fixture: one invented company's bank accounts (NPR and one USD account), the payments and
// receipts it expects over the next 13 weeks, and the liquidity policy it is held to. Pure TypeScript: no React, no
// clock (the session date is 1 November 2026), no randomness. NPR is in paisa and USD in cents, both bigint; a USD
// amount becomes rupees only through the fx-rate module, at one rate, rounded once.
import { convertMoney, type FxRate } from '@punji/ui/fx-rate';
import { formatMoney, money, type Money } from '@punji/ui/money';
import type { CalendarDate } from '@punji/ui/nepal/date-only';
import { addDays, dayNumber } from '../shared/books.ts';

/** Exact text ("-85,000.50") to signed minor units (paisa or cents), without floating point. */
export function minor(text: string): bigint {
  const m = /^([+-]?)([\d,]+)(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!m) throw new RangeError(`Not an amount: ${text}`);
  const value = BigInt(m[2]!.replaceAll(',', '')) * 100n + BigInt((m[3] ?? '').padEnd(2, '0') || '0');
  return m[1] === '-' ? -value : value;
}

export type Ccy = 'NPR' | 'USD';
export const usdText = (cents: bigint) => formatMoney(cents, { currency: 'USD', locale: 'en-US', display: 'code' });
export const nprText = (paisa: bigint) => formatMoney(paisa, { currency: 'NPR', locale: 'en-IN', display: 'code' });
export const moneyText = (m: Money) => (m.currency === 'USD' ? usdText(m.minor) : nprText(m.minor));

// ---- Accounts ----
export interface BankAccount {
  id: string;
  bank: string;
  name: string;
  currency: Ccy;
  /** Closing balance in the account's own currency (paisa or cents). */
  balance: bigint;
  /** Available within a day. A term deposit is not counted towards the liquidity buffer. */
  liquid: boolean;
}
export const ACCOUNTS: readonly BankAccount[] = [
  { id: 'op', bank: 'NIC Asia Bank', name: 'Operating current', currency: 'NPR', balance: minor('28,450,000.00'), liquid: true },
  { id: 'pay', bank: 'Global IME Bank', name: 'Payroll current', currency: 'NPR', balance: minor('6,200,000.00'), liquid: true },
  { id: 'col', bank: 'Nabil Bank', name: 'Collections current', currency: 'NPR', balance: minor('11,875,000.00'), liquid: true },
  { id: 'usd', bank: 'Standard Chartered', name: 'USD current', currency: 'USD', balance: minor('148,500.00'), liquid: true },
  { id: 'fd', bank: 'Nabil Bank', name: 'Fixed deposit, 9 months', currency: 'NPR', balance: minor('20,000,000.00'), liquid: false },
];

// ---- Rates ----
/** Mid-market USD in rupees, as quoted on the session date. A 4-decimal string so a percentage shock stays exact. */
export const MID_RATE = '133.4000';
export const rateOf = (rate: string, kind: 'mid' | 'buy' | 'sell' = 'mid'): FxRate => ({ base: 'USD', quote: 'NPR', rate, asOf: '2026-11-01T04:15:00Z', source: 'Nepal Rastra Bank (example)', kind });
/** The mid rate moved by `bps` basis points (100 bps = 1%), exactly: 133.4000 + 5% is 140.0700. */
export function shockedRate(bps: number, rate = MID_RATE): string {
  const [whole, frac = ''] = rate.split('.');
  const scaled = BigInt(whole! + frac.padEnd(4, '0').slice(0, 4));
  const moved = (scaled * BigInt(10_000 + bps)) / 10_000n;
  return `${moved / 10_000n}.${String(moved % 10_000n).padStart(4, '0')}`;
}
/** USD cents to paisa at `rate`, rounded once, half-even. */
export const toNpr = (cents: bigint, rate: string): bigint => convertMoney(money(cents, 'USD'), rateOf(rate), 'half-even').minor;

// ---- Policy ----
export const POLICY = {
  /** Liquid cash (rupee equivalent) must not fall below this in any week. */
  minimum: minor('50,000,000.00'),
  /** The level the desk aims to hold. */
  target: minor('60,000,000.00'),
  /** The largest open position in a foreign currency, in rupees. */
  fxLimit: minor('32,500,000.00'),
};
export const FORECAST_WEEKS = 13;
/** Weeks start on Monday 2 November 2026. */
export const START: CalendarDate = { year: 2026, month: 11, day: 2 };
export const DEFER_DAYS = 14;
export const LATE_DAYS = 14;

// ---- Expected payments and receipts ----
export type Category = 'Payroll' | 'Tax and statutory' | 'Suppliers' | 'Rent and utilities' | 'Debt service' | 'Customers' | 'Export customers';
export interface CashItem {
  id: string;
  due: CalendarDate;
  direction: 'in' | 'out';
  party: string;
  category: Category;
  currency: Ccy;
  /** The size in the item's own currency, always positive. */
  amount: bigint;
  /** A supplier payment the desk may move two weeks later. */
  deferrable?: boolean;
}

const d = (month: number, day: number): CalendarDate => ({ year: month === 1 ? 2027 : 2026, month, day });
type Row = [month: number, day: number, party: string, category: Category, amount: string, extra?: { usd?: boolean; deferrable?: boolean }];
const OUT: readonly Row[] = [
  [11, 3, 'Landlord, Jhamsikhel office', 'Rent and utilities', '1,200,000.00'],
  [11, 6, 'Himalayan Cloud Services', 'Suppliers', '2,450,000.00', { deferrable: true }],
  [11, 10, 'Kantipur Print and Packaging', 'Suppliers', '1,380,000.00', { deferrable: true }],
  [11, 14, 'NIC Asia term loan instalment', 'Debt service', '2,100,000.00'],
  [11, 18, 'Annual insurance premium', 'Suppliers', '1,800,000.00', { deferrable: true }],
  [11, 25, 'VAT return, October', 'Tax and statutory', '3,850,000.00'],
  [11, 26, 'TDS deposit, October', 'Tax and statutory', '1,420,000.00'],
  [11, 27, 'Payroll, Kartik', 'Payroll', '14,200,000.00'],
  [11, 30, 'Licence renewal (US vendor)', 'Suppliers', '18,500.00', { usd: true, deferrable: true }],
  [12, 3, 'Landlord, Jhamsikhel office', 'Rent and utilities', '1,200,000.00'],
  [12, 7, 'Everest Hardware Imports', 'Suppliers', '4,600,000.00', { deferrable: true }],
  [12, 11, 'Nepal Electricity Authority', 'Rent and utilities', '640,000.00'],
  [12, 14, 'NIC Asia term loan instalment', 'Debt service', '2,100,000.00'],
  [12, 17, 'Sagarmatha Logistics', 'Suppliers', '2,950,000.00', { deferrable: true }],
  [12, 25, 'VAT return, November', 'Tax and statutory', '3,990,000.00'],
  [12, 26, 'TDS deposit, November', 'Tax and statutory', '1,460,000.00'],
  [12, 27, 'Payroll, Mangsir', 'Payroll', '14,200,000.00'],
  [12, 30, 'Licence renewal (US vendor)', 'Suppliers', '22,000.00', { usd: true, deferrable: true }],
  [1, 4, 'Landlord, Jhamsikhel office', 'Rent and utilities', '1,200,000.00'],
  [1, 8, 'Kantipur Print and Packaging', 'Suppliers', '1,520,000.00', { deferrable: true }],
  [1, 14, 'NIC Asia term loan instalment', 'Debt service', '2,100,000.00'],
  [1, 22, 'Himalayan Cloud Services', 'Suppliers', '2,450,000.00', { deferrable: true }],
  [1, 25, 'VAT return, December', 'Tax and statutory', '4,120,000.00'],
  [1, 26, 'TDS deposit, December', 'Tax and statutory', '1,510,000.00'],
  [1, 27, 'Payroll, Poush', 'Payroll', '14,600,000.00'],
];
const IN: readonly Row[] = [
  [11, 4, 'Everest Stores Pvt. Ltd.', 'Customers', '5,650,000.00'],
  [11, 9, 'Himal Traders', 'Customers', '2,260,000.00'],
  [11, 12, 'Annapurna Retail Group', 'Customers', '7,400,000.00'],
  [11, 17, 'Lumbini Distributors', 'Customers', '3,150,000.00'],
  [11, 20, 'Atlas Imports Ltd. (USD invoice)', 'Export customers', '42,000.00', { usd: true }],
  [11, 24, 'Mahalaxmi Enterprises', 'Customers', '4,780,000.00'],
  [12, 2, 'Everest Stores Pvt. Ltd.', 'Customers', '5,650,000.00'],
  [12, 8, 'Annapurna Retail Group', 'Customers', '7,400,000.00'],
  [12, 13, 'Himal Traders', 'Customers', '2,260,000.00'],
  [12, 18, 'Atlas Imports Ltd. (USD invoice)', 'Export customers', '38,500.00', { usd: true }],
  [12, 21, 'Lumbini Distributors', 'Customers', '3,150,000.00'],
  [12, 28, 'Mahalaxmi Enterprises', 'Customers', '4,780,000.00'],
  [1, 6, 'Everest Stores Pvt. Ltd.', 'Customers', '5,650,000.00'],
  [1, 12, 'Annapurna Retail Group', 'Customers', '7,400,000.00'],
  [1, 15, 'Atlas Imports Ltd. (USD invoice)', 'Export customers', '45,000.00', { usd: true }],
  [1, 19, 'Himal Traders', 'Customers', '2,260,000.00'],
  [1, 23, 'Lumbini Distributors', 'Customers', '3,150,000.00'],
];
const build = (rows: readonly Row[], direction: 'in' | 'out', prefix: string): CashItem[] =>
  rows.map(([month, day, party, category, amount, extra], i) => ({ id: `${prefix}-${String(i + 1).padStart(2, '0')}`, due: d(month, day), direction, party, category, currency: extra?.usd ? 'USD' : 'NPR', amount: minor(amount), deferrable: extra?.deferrable }));
export const ITEMS: readonly CashItem[] = [...build(IN, 'in', 'R'), ...build(OUT, 'out', 'P')];

// ---- Scenario and forecast ----
export interface Scenario {
  /** Customers pay LATE_DAYS later than invoiced. */
  stress: boolean;
  /** Ids of deferrable payments moved DEFER_DAYS later. */
  deferred: readonly string[];
  /** The USD rate shock in basis points. */
  fxBps: number;
}

export interface Placed {
  item: CashItem;
  /** The date it is expected to move, after the scenario. */
  due: CalendarDate;
  /** Weeks since START, 0-based; null when outside the 13 weeks. */
  week: number | null;
  /** Signed rupee equivalent: positive in, negative out. */
  npr: bigint;
}

const weekOf = (due: CalendarDate): number | null => {
  const n = Math.floor((dayNumber(due) - dayNumber(START)) / 7);
  return n >= 0 && n < FORECAST_WEEKS ? n : null;
};
export const rateFor = (s: Scenario) => shockedRate(s.fxBps);

export function place(s: Scenario): Placed[] {
  const rate = rateFor(s);
  return ITEMS.map((item) => {
    let due = item.due;
    if (s.stress && item.direction === 'in') due = addDays(due, LATE_DAYS);
    if (item.direction === 'out' && s.deferred.includes(item.id)) due = addDays(due, DEFER_DAYS);
    const size = item.currency === 'USD' ? toNpr(item.amount, rate) : item.amount;
    return { item, due, week: weekOf(due), npr: item.direction === 'in' ? size : -size };
  });
}

/** Liquid cash today in rupees: NPR accounts as they are, the USD account at the scenario rate; term deposits left out. */
export function liquidNow(s: Scenario): bigint {
  const rate = rateFor(s);
  return ACCOUNTS.filter((a) => a.liquid).reduce((sum, a) => sum + (a.currency === 'USD' ? toNpr(a.balance, rate) : a.balance), 0n);
}

export interface Week {
  index: number;
  start: CalendarDate;
  opening: bigint;
  moneyIn: bigint;
  moneyOut: bigint;
  net: bigint;
  closing: bigint;
  breach: boolean;
}
export function forecast(s: Scenario, placed = place(s)): Week[] {
  let opening = liquidNow(s);
  return Array.from({ length: FORECAST_WEEKS }, (_, index) => {
    const here = placed.filter((p) => p.week === index);
    const moneyIn = here.filter((p) => p.npr > 0n).reduce((n, p) => n + p.npr, 0n);
    const moneyOut = here.filter((p) => p.npr < 0n).reduce((n, p) => n - p.npr, 0n);
    const closing = opening + moneyIn - moneyOut;
    const week: Week = { index, start: addDays(START, index * 7), opening, moneyIn, moneyOut, net: moneyIn - moneyOut, closing, breach: closing < POLICY.minimum };
    opening = closing;
    return week;
  });
}

// ---- FX exposure ----
export interface Exposure {
  cash: bigint;
  receipts: bigint;
  payments: bigint;
  /** cash + receipts - payments, in USD cents. */
  net: bigint;
  rate: string;
  netNpr: bigint;
}
export function exposure(s: Scenario, placed = place(s)): Exposure {
  const cash = ACCOUNTS.filter((a) => a.currency === 'USD').reduce((n, a) => n + a.balance, 0n);
  const usd = placed.filter((p) => p.item.currency === 'USD' && p.week !== null);
  const receipts = usd.filter((p) => p.item.direction === 'in').reduce((n, p) => n + p.item.amount, 0n);
  const payments = usd.filter((p) => p.item.direction === 'out').reduce((n, p) => n + p.item.amount, 0n);
  const net = cash + receipts - payments;
  const rate = rateFor(s);
  return { cash, receipts, payments, net, rate, netNpr: toNpr(net, rate) };
}
export const SHOCKS: readonly number[] = [-500, -200, 0, 200, 500];
export const shockLabel = (bps: number) => (bps === 0 ? 'No change' : `${bps > 0 ? '+' : '-'}${Math.abs(bps) / 100}%`);

export type Level = 'breach' | 'below-target' | 'ok';
/** Where an amount of liquid cash stands against the policy. */
export function levelOf(amount: bigint): Level {
  return amount < POLICY.minimum ? 'breach' : amount < POLICY.target ? 'below-target' : 'ok';
}
