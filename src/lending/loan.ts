/**
 * Loan maths on exact minor units: the equated monthly instalment (EMI), a full reducing-balance amortisation
 * schedule and part-prepayments that shorten the tenure or lower the instalment. Every figure is a bigint; every
 * step that can produce a fraction takes the caller's RoundingMode.
 *
 * Model: interest accrues monthly at annual rate / 12 on the opening balance of each month (the convention most EMI
 * calculators and loan offer letters use). Banks that accrue daily (actual/365) will differ by a few paisa to rupees
 * a month. Floating rates, fees, insurance and penal interest are out of scope: pass the rate that applies.
 */
import { divideRounded, type RoundingMode } from '../calculations/rounding.ts';
import { assertMonths, parsePercentRate } from './rate.ts';

export interface EmiInput {
  /** The amount borrowed, in minor units (paisa). Must be positive. */
  principal: bigint;
  /** Annual interest rate in percent, a plain decimal string ('11.5' is 11.5% a year). */
  ratePercent: string;
  /** The tenure in months (1 to 600). */
  months: number;
  /** How the instalment is rounded. Lenders usually round up ('ceil') so the last instalment is the smaller one. */
  rounding: RoundingMode;
  /** Round the instalment to a multiple of this many minor units (100n for whole rupees). Default 1n. */
  roundTo?: bigint;
}

/** Monthly rate as an exact fraction n / d of one. */
function monthly(ratePercent: string): { n: bigint; d: bigint } {
  const rate = parsePercentRate(ratePercent);
  return { n: rate.numerator, d: rate.denominator * 1200n };
}

function check(principal: bigint, months: number, roundTo: bigint) {
  if (typeof principal !== 'bigint' || principal <= 0n) throw new RangeError('principal must be a positive bigint of minor units');
  assertMonths(months);
  if (typeof roundTo !== 'bigint' || roundTo < 1n) throw new RangeError('roundTo must be a positive bigint');
}

function emiFor(principal: bigint, n: bigint, d: bigint, months: number, rounding: RoundingMode, roundTo: bigint): bigint {
  if (n === 0n) return divideRounded(principal, BigInt(months) * roundTo, rounding) * roundTo;
  // EMI = P·r·(1+r)^m / ((1+r)^m − 1) with r = n/d: P·n·(d+n)^m / (d·((d+n)^m − d^m)).
  const grown = (d + n) ** BigInt(months);
  const base = d ** BigInt(months);
  return divideRounded(principal * n * grown, d * (grown - base) * roundTo, rounding) * roundTo;
}

/** The equated monthly instalment, exact to the minor unit and rounded with the mode you pass. */
export function calculateEmi({ principal, ratePercent, months, rounding, roundTo = 1n }: EmiInput): bigint {
  check(principal, months, roundTo);
  const { n, d } = monthly(ratePercent);
  return emiFor(principal, n, d, months, rounding, roundTo);
}

export interface Prepayment {
  /** The instalment number (1-based) after which the lump sum is paid. */
  period: number;
  /** The extra amount in minor units. More than the balance left is capped at the balance. */
  amount: bigint;
}

export interface AmortisationInput extends EmiInput {
  /** Lump-sum part-prepayments, each paid straight after the instalment of its period. */
  prepayments?: readonly Prepayment[];
  /** After a prepayment: 'reduce-tenure' keeps the instalment and ends the loan sooner (default); 'reduce-emi' keeps the end date and lowers the instalment. */
  strategy?: 'reduce-tenure' | 'reduce-emi';
}

export interface AmortisationRow {
  /** The instalment number, from 1. */
  period: number;
  /** Balance owed at the start of the month. */
  opening: bigint;
  /** The instalment paid this month (the last one is usually smaller or larger by the rounding). */
  payment: bigint;
  /** The interest part of the instalment. */
  interest: bigint;
  /** The principal part of the instalment. */
  principal: bigint;
  /** A lump sum paid after the instalment, 0n when none. */
  prepayment: bigint;
  /** Balance owed after the instalment and any prepayment. */
  closing: bigint;
}

export interface AmortisationSchedule {
  /** The starting instalment. With 'reduce-emi' prepayments it changes; each row carries what was paid. */
  emi: bigint;
  /** One row per month until the balance reaches zero. */
  rows: AmortisationRow[];
  /** Sum of the interest column. */
  totalInterest: bigint;
  /** Sum of instalments and prepayments: principal plus total interest. */
  totalPaid: bigint;
  /** Sum of prepayments. */
  totalPrepaid: bigint;
  /** How many instalments were paid (shorter than `months` after a 'reduce-tenure' prepayment). */
  periods: number;
}

/**
 * The month-by-month reducing-balance schedule. Interest is the opening balance times the monthly rate, rounded with
 * `rounding`; the principal part is the instalment minus the interest; the final row clears the balance exactly, so
 * the principal column always sums to the amount borrowed.
 */
export function amortise({ principal, ratePercent, months, rounding, roundTo = 1n, prepayments = [], strategy = 'reduce-tenure' }: AmortisationInput): AmortisationSchedule {
  check(principal, months, roundTo);
  const { n, d } = monthly(ratePercent);
  const extra = new Map<number, bigint>();
  for (const p of prepayments) {
    if (!Number.isInteger(p.period) || p.period < 1) throw new RangeError('A prepayment period must be a whole number from 1');
    if (typeof p.amount !== 'bigint' || p.amount < 0n) throw new RangeError('A prepayment amount must be a non-negative bigint');
    extra.set(p.period, (extra.get(p.period) ?? 0n) + p.amount);
  }
  const first = emiFor(principal, n, d, months, rounding, roundTo);
  let emi = first;
  let balance = principal;
  const rows: AmortisationRow[] = [];
  let totalInterest = 0n;
  let totalPrepaid = 0n;
  // The row for the last month (or any month whose instalment covers the balance) clears the loan, so the loop ends by `months`.
  for (let period = 1; balance > 0n; period++) {
    const opening = balance;
    const interest = divideRounded(opening * n, d, rounding);
    let payment = emi;
    let part = payment - interest;
    if (period >= months || part >= opening) {
      part = opening;
      payment = opening + interest;
    }
    balance = opening - part;
    let prepayment = extra.get(period) ?? 0n;
    if (prepayment > balance) prepayment = balance;
    balance -= prepayment;
    totalInterest += interest;
    totalPrepaid += prepayment;
    rows.push({ period, opening, payment, interest, principal: part, prepayment, closing: balance });
    if (prepayment > 0n && strategy === 'reduce-emi' && balance > 0n && period < months) emi = emiFor(balance, n, d, months - period, rounding, roundTo);
  }
  return { emi: first, rows, totalInterest, totalPaid: principal + totalInterest, totalPrepaid, periods: rows.length };
}
