// The personal finance app's fixture: one invented household's net worth over 24 months, savings goals, a monthly
// budget and the bills it pays on repeat. Pure TypeScript: no React, no clock (the app's date is 15 November 2026), no
// randomness. Amounts are bigint paisa; a rupee figure is written as whole rupees and scaled once.
import type { CalendarDate } from '@punji/ui/nepal/date-only';
import { compareDates, dayNumber } from '../shared/books.ts';

export const NOW: CalendarDate = { year: 2026, month: 11, day: 15 };
/** Whole rupees to paisa. */
export const rupees = (n: number): bigint => BigInt(n) * 100n;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = (year: number, month: number) => `${MONTHS[month - 1]} ${year}`;

// ---- Net worth, month by month ----
export interface WorthMonth {
  key: string;
  label: string;
  year: number;
  month: number;
  cash: bigint;
  deposits: bigint;
  shares: bigint;
  retirement: bigint;
  property: bigint;
  /** What is owed: the home loan. */
  loan: bigint;
}
const WOBBLE = [0, 1, -1, 2, -2, 1];
export const MONTHS_OF_WORTH = 24;
/** December 2024 to November 2026. Shares swing with the market; the loan falls by a fixed instalment of principal. */
export const WORTH: readonly WorthMonth[] = Array.from({ length: MONTHS_OF_WORTH }, (_, i) => {
  const at = 11 + i;
  const year = 2024 + Math.floor(at / 12);
  const month = (at % 12) + 1;
  return {
    key: `m${year}-${String(month).padStart(2, '0')}`,
    label: monthLabel(year, month),
    year,
    month,
    cash: rupees(480_000 + 22_000 * i + 9_000 * WOBBLE[i % 6]!),
    deposits: rupees(1_500_000 + 25_000 * i),
    shares: rupees(900_000 + 38_000 * i + 60_000 * WOBBLE[(i * 5) % 6]!),
    retirement: rupees(1_100_000 + 30_000 * i),
    property: rupees(8_500_000 + 20_000 * i),
    loan: rupees(4_600_000 - 42_000 * i),
  };
});
export const assetsOf = (m: WorthMonth) => m.cash + m.deposits + m.shares + m.retirement + m.property;
export const netOf = (m: WorthMonth) => assetsOf(m) - m.loan;
export const CLASSES = [
  { key: 'property', label: 'Property' },
  { key: 'deposits', label: 'Fixed deposits' },
  { key: 'retirement', label: 'Retirement funds' },
  { key: 'shares', label: 'Shares and funds' },
  { key: 'cash', label: 'Cash and savings' },
] as const satisfies readonly { key: keyof WorthMonth; label: string }[];

// ---- Goals ----
export interface Goal {
  id: string;
  name: string;
  target: bigint;
  saved: bigint;
  monthly: bigint;
  due: CalendarDate;
}
export const GOALS: readonly Goal[] = [
  { id: 'emergency', name: 'Emergency fund', target: rupees(600_000), saved: rupees(412_000), monthly: rupees(15_000), due: { year: 2027, month: 6, day: 30 } },
  { id: 'study', name: 'Masters in Melbourne', target: rupees(2_400_000), saved: rupees(640_000), monthly: rupees(40_000), due: { year: 2028, month: 7, day: 15 } },
  { id: 'bike', name: 'New motorbike', target: rupees(450_000), saved: rupees(450_000), monthly: rupees(0), due: { year: 2026, month: 12, day: 31 } },
  { id: 'retire', name: 'Retirement top-up', target: rupees(1_000_000), saved: rupees(180_000), monthly: rupees(12_000), due: { year: 2031, month: 12, day: 31 } },
];
/** Whole months from `from` to `to`, at least zero. */
export function monthsBetween(from: CalendarDate, to: CalendarDate): number {
  return Math.max(0, (to.year - from.year) * 12 + (to.month - from.month) - (to.day < from.day ? 1 : 0));
}
/** Months of saving `monthly` needed to close the gap: a bigint ceiling. Infinity when nothing is set aside. */
export function monthsNeeded(goal: Goal, saved: bigint): number {
  const gap = goal.target - saved;
  if (gap <= 0n) return 0;
  if (goal.monthly <= 0n) return Infinity;
  return Number((gap + goal.monthly - 1n) / goal.monthly);
}
/** The monthly amount that reaches the target by the due date (a bigint ceiling), zero if it is met. */
export function monthlyNeeded(goal: Goal, saved: bigint, now = NOW): bigint {
  const gap = goal.target - saved;
  if (gap <= 0n) return 0n;
  const left = BigInt(Math.max(1, monthsBetween(now, goal.due)));
  return (gap + left - 1n) / left;
}
/** Percent to one decimal, as a number for display only. */
export const percentOf = (part: bigint, whole: bigint) => (whole > 0n ? Number((part * 1000n) / whole) / 10 : 0);

// ---- Budget ----
export const BUDGET_MONTH = 'November 2026';
export interface Category {
  id: string;
  name: string;
  budget: bigint;
  /** Spent so far this month, up to the app's date. */
  actual: bigint;
}
export const INCOME = rupees(185_000);
export const CATEGORIES: readonly Category[] = [
  { id: 'housing', name: 'Housing', budget: rupees(28_000), actual: rupees(28_000) },
  { id: 'debt', name: 'Loan instalment', budget: rupees(42_000), actual: 0n },
  { id: 'groceries', name: 'Groceries', budget: rupees(24_000), actual: rupees(13_420) },
  { id: 'education', name: 'Education', budget: rupees(12_000), actual: rupees(12_000) },
  { id: 'transport', name: 'Transport', budget: rupees(9_000), actual: rupees(5_230) },
  { id: 'utilities', name: 'Utilities', budget: rupees(8_000), actual: rupees(2_150) },
  { id: 'eating', name: 'Eating out', budget: rupees(8_000), actual: rupees(8_940) },
  { id: 'insurance', name: 'Insurance', budget: rupees(6_200), actual: 0n },
  { id: 'fun', name: 'Entertainment', budget: rupees(5_000), actual: rupees(1_980) },
  { id: 'health', name: 'Health', budget: rupees(4_000), actual: rupees(1_150) },
];

// ---- Recurring bills ----
export interface Bill {
  id: string;
  name: string;
  categoryId: string;
  amount: bigint;
  /** Months between payments: 1, 3 or 12. */
  every: 1 | 3 | 12;
  /** The next date it falls due. */
  due: CalendarDate;
  autopay: boolean;
}
export const BILLS: readonly Bill[] = [
  { id: 'rent', name: 'House rent', categoryId: 'housing', amount: rupees(28_000), every: 1, due: { year: 2026, month: 12, day: 5 }, autopay: true },
  { id: 'internet', name: 'Internet, Worldlink', categoryId: 'utilities', amount: rupees(1_695), every: 1, due: { year: 2026, month: 11, day: 17 }, autopay: false },
  { id: 'power', name: 'Electricity, NEA', categoryId: 'utilities', amount: rupees(3_840), every: 1, due: { year: 2026, month: 11, day: 18 }, autopay: false },
  { id: 'emi', name: 'Home loan instalment', categoryId: 'debt', amount: rupees(42_000), every: 1, due: { year: 2026, month: 11, day: 20 }, autopay: true },
  { id: 'mobile', name: 'Mobile data', categoryId: 'utilities', amount: rupees(799), every: 1, due: { year: 2026, month: 11, day: 22 }, autopay: false },
  { id: 'stream', name: 'Streaming subscription', categoryId: 'fun', amount: rupees(649), every: 1, due: { year: 2026, month: 11, day: 25 }, autopay: true },
  { id: 'life', name: 'Life insurance premium', categoryId: 'insurance', amount: rupees(18_500), every: 3, due: { year: 2026, month: 12, day: 1 }, autopay: false },
  { id: 'vehicle', name: 'Vehicle tax', categoryId: 'transport', amount: rupees(6_500), every: 12, due: { year: 2027, month: 1, day: 15 }, autopay: false },
];
/** A date `months` later, the day kept or clamped to the month's last day. */
export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const at = date.year * 12 + (date.month - 1) + months;
  const year = Math.floor(at / 12);
  const month = (at % 12) + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day: Math.min(date.day, last) };
}
export const daysFromNow = (date: CalendarDate) => dayNumber(date) - dayNumber(NOW);
export const isDueSoon = (date: CalendarDate, days = 30) => compareDates(date, NOW) >= 0 && daysFromNow(date) <= days;

/** The months a chart range shows: the last 12, this year so far, or all 24. */
export const inRange = (range: string): readonly WorthMonth[] => (range === '1Y' ? WORTH.slice(-12) : range === 'YTD' ? WORTH.filter((m) => m.year === 2026) : WORTH);
