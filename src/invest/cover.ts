/**
 * Term life cover needed, the income-replacement method insurers' and aggregators' calculators use: enough to
 * replace the income the family relies on for a number of years, clear what is owed and fund the goals that must
 * still happen, less what is already there (savings and investments, existing life cover). Exact bigint minor units;
 * the suggestion is rounded up to `roundTo` (a lakh is 10_000_000n paisa). It is a starting point for a conversation
 * with an adviser, not underwriting.
 */
import { divideRounded } from '../calculations/rounding.ts';

export interface CoverInput {
  /** Yearly income the family would lose, in minor units. */
  annualIncome: bigint;
  /** Years of income to replace (usually until the youngest dependant is independent or until retirement). 0 to 60. */
  years: number;
  /** Share of the income the family needs, in percent ('70' when the earner's own costs go). Default '100'. */
  incomeSharePercent?: string;
  /** Loans outstanding: home, vehicle, personal. */
  liabilities?: bigint;
  /** Goals that must still be funded: children's education, a wedding. */
  goals?: bigint;
  /** Savings and investments the family could draw on. */
  savings?: bigint;
  /** Life cover already held. */
  existingCover?: bigint;
  /** Round the suggestion up to a multiple of this. Default 1n. */
  roundTo?: bigint;
}

export interface CoverResult {
  /** annualIncome × share × years. */
  incomeNeed: bigint;
  /** incomeNeed + liabilities + goals. */
  totalNeed: bigint;
  /** savings + existingCover. */
  available: bigint;
  /** totalNeed − available, never below zero, rounded up to `roundTo`. */
  gap: bigint;
  /** Whether what is held already covers the need. */
  covered: boolean;
}

const check = (value: bigint, name: string) => {
  if (typeof value !== 'bigint' || value < 0n) throw new RangeError(`${name} must be a non-negative bigint of minor units`);
};

/** Life cover still needed. */
export function termCoverNeeded({ annualIncome, years, incomeSharePercent = '100', liabilities = 0n, goals = 0n, savings = 0n, existingCover = 0n, roundTo = 1n }: CoverInput): CoverResult {
  for (const [v, n] of [[annualIncome, 'annualIncome'], [liabilities, 'liabilities'], [goals, 'goals'], [savings, 'savings'], [existingCover, 'existingCover']] as const) check(v, n);
  if (!Number.isInteger(years) || years < 0 || years > 60) throw new RangeError('years must be a whole number from 0 to 60');
  if (typeof roundTo !== 'bigint' || roundTo < 1n) throw new RangeError('roundTo must be a positive bigint');
  const m = /^(\d{1,3})(?:\.(\d{1,4}))?$/.exec(incomeSharePercent);
  if (!m) throw new TypeError(`Expected a percent such as "70", got ${JSON.stringify(incomeSharePercent)}`);
  const fraction = m[2] ?? '';
  const share = BigInt(m[1]! + fraction);
  const shareDen = 100n * 10n ** BigInt(fraction.length);
  if (share > shareDen) throw new RangeError('incomeSharePercent cannot be over 100');
  const incomeNeed = divideRounded(annualIncome * share * BigInt(years), shareDen, 'ceil');
  const totalNeed = incomeNeed + liabilities + goals;
  const available = savings + existingCover;
  const raw = totalNeed > available ? totalNeed - available : 0n;
  const gap = divideRounded(raw, roundTo, 'ceil') * roundTo;
  return { incomeNeed, totalNeed, available, gap, covered: raw === 0n };
}
