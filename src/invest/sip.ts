/**
 * SIP (systematic investment plan) and lump-sum projections on exact minor units.
 *
 * Model, the one Groww, Zerodha Coin and most fund houses' calculators use: an expected annual return compounded
 * monthly at annual / 12, each instalment invested at the start of its month. The balance is carried as an exact
 * fraction (no intermediate rounding), and every figure reported is rounded once from that exact value with your
 * RoundingMode. A step-up raises the instalment by a percent every `stepUpEvery` months; each new instalment is a real
 * debit, so it is rounded to `roundTo` minor units (whole rupees with 100n) and the next step-up builds on it.
 * Projections are illustrations: fund returns are not fixed.
 */
import { divideRounded, type RoundingMode } from '../calculations/rounding.ts';
import { assertMonths, parsePercentRate } from '../lending/rate.ts';

export interface SipInput {
  /** The first monthly instalment in minor units. */
  monthly: bigint;
  /** How many monthly instalments (1 to 600). */
  months: number;
  /** Expected annual return in percent ('12'). */
  annualReturnPercent: string;
  /** Raise the instalment by this percent every `stepUpEvery` months ('10'). Default '0'. */
  stepUpPercent?: string;
  /** Months between step-ups. Default 12. */
  stepUpEvery?: number;
  /** Round each stepped-up instalment to a multiple of this many minor units. Default 1n. */
  roundTo?: bigint;
  /** How reported figures and stepped-up instalments are rounded. */
  rounding: RoundingMode;
}

export interface SipYear {
  /** Year number from 1 (the last may be part of a year). */
  year: number;
  /** Months since the start at the end of this row. */
  month: number;
  /** The instalment during this year (the last one if it changed within the row). */
  instalment: bigint;
  /** Invested this year. */
  invested: bigint;
  /** Invested since the start. */
  totalInvested: bigint;
  /** Projected value at the end of the row, rounded once from the exact balance. */
  value: bigint;
}

export interface SipProjection {
  /** Every instalment in order (length `months`). */
  instalments: bigint[];
  /** One row per year (12 months or the remainder). */
  years: SipYear[];
  /** The exact sum of the instalments. */
  invested: bigint;
  /** Projected value at the end of the last month. */
  value: bigint;
  /** value − invested. */
  gain: bigint;
}

function nonNegative(value: bigint, name: string) {
  if (typeof value !== 'bigint' || value < 0n) throw new RangeError(`${name} must be a non-negative bigint of minor units`);
}

function roundToMultiple(value: bigint, step: bigint, rounding: RoundingMode): bigint {
  return divideRounded(value, step, rounding) * step;
}

/** Project a monthly SIP with an optional yearly step-up. */
export function projectSip({ monthly, months, annualReturnPercent, stepUpPercent = '0', stepUpEvery = 12, roundTo = 1n, rounding }: SipInput): SipProjection {
  nonNegative(monthly, 'monthly');
  assertMonths(months);
  assertMonths(stepUpEvery, 'stepUpEvery');
  if (typeof roundTo !== 'bigint' || roundTo < 1n) throw new RangeError('roundTo must be a positive bigint');
  const rate = parsePercentRate(annualReturnPercent);
  const step = parsePercentRate(stepUpPercent);
  // One month's growth is (q + p) / q with p / q = rate / 1200.
  const q = rate.denominator * 1200n;
  const growth = q + rate.numerator;
  let num = 0n;
  let den = 1n;
  let instalment = monthly;
  let invested = 0n;
  let yearInvested = 0n;
  const instalments: bigint[] = [];
  const years: SipYear[] = [];
  for (let month = 1; month <= months; month++) {
    if (month > 1 && (month - 1) % stepUpEvery === 0 && step.numerator > 0n) {
      instalment = roundToMultiple(instalment + divideRounded(instalment * step.numerator, 100n * step.denominator, rounding), roundTo, rounding);
    }
    instalments.push(instalment);
    invested += instalment;
    yearInvested += instalment;
    num = (num + instalment * den) * growth;
    den *= q;
    if (month % 12 === 0 || month === months) {
      years.push({ year: years.length + 1, month, instalment, invested: yearInvested, totalInvested: invested, value: divideRounded(num, den, rounding) });
      yearInvested = 0n;
    }
  }
  const value = divideRounded(num, den, rounding);
  return { instalments, years, invested, value, gain: value - invested };
}

export interface LumpSumInput {
  /** Invested once at the start, in minor units. */
  amount: bigint;
  months: number;
  annualReturnPercent: string;
  rounding: RoundingMode;
}

/** A one-time investment grown at the same monthly-compounded rate as `projectSip`, rounded once. */
export function projectLumpSum({ amount, months, annualReturnPercent, rounding }: LumpSumInput): { invested: bigint; value: bigint; gain: bigint } {
  nonNegative(amount, 'amount');
  assertMonths(months);
  const rate = parsePercentRate(annualReturnPercent);
  const q = rate.denominator * 1200n;
  const growth = q + rate.numerator;
  const value = divideRounded(amount * growth ** BigInt(months), q ** BigInt(months), rounding);
  return { invested: amount, value, gain: value - amount };
}

export interface SipGoalInput extends Omit<SipInput, 'monthly' | 'rounding'> {
  /** The corpus wanted at the end, in minor units. */
  goal: bigint;
  /** How projections are rounded while checking (the instalment itself is always rounded up). Default 'half-even'. */
  rounding?: RoundingMode;
}

/**
 * The smallest first instalment, a multiple of `roundTo`, whose projection reaches `goal`. Starts from the exact
 * no-step-up answer and checks with `projectSip`, so the answer agrees with the projection shown next to it.
 */
export function sipForGoal({ goal, rounding = 'half-even', ...rest }: SipGoalInput): bigint {
  nonNegative(goal, 'goal');
  const roundTo = rest.roundTo ?? 1n;
  if (goal === 0n) return 0n;
  const reaches = (monthly: bigint) => projectSip({ ...rest, monthly, rounding }).value >= goal;
  // Value of a 1-unit level SIP, exactly: a geometric series. The stepped-up instalments only add, so this is an upper bound.
  const unit = projectSip({ ...rest, monthly: 1_000_000n, stepUpPercent: '0', rounding: 'floor' }).value;
  let guess = roundToMultiple(unit > 0n ? divideRounded(goal * 1_000_000n, unit, 'ceil') : goal, roundTo, 'ceil');
  if (guess < roundTo) guess = roundTo;
  // Walk down while a smaller instalment still reaches the goal (step-ups), with a binary search over the range.
  let lo = 0n;
  let hi = guess;
  while (!reaches(hi)) { lo = hi; hi *= 2n; }
  while (hi - lo > roundTo) {
    const mid = roundToMultiple((lo + hi) / 2n, roundTo, 'floor');
    if (mid <= lo || mid >= hi) break;
    if (reaches(mid)) hi = mid; else lo = mid;
  }
  return hi;
}
