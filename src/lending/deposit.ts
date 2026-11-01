/**
 * Fixed and recurring deposit maths on exact minor units: interest credited monthly, quarterly, half-yearly, yearly
 * or at maturity, tax deducted at source (TDS) on each credit, and the maturity amount.
 *
 * Model: interest accrues every month at annual rate / 12 on the balance, is kept exact (as a fraction) between
 * credits, and is rounded once per credit with your RoundingMode. TDS is the configured percent of each credit,
 * rounded with the same mode. With `payout: 'compound'` the net interest is added to the balance and earns interest
 * from then on; with 'pay-out' it is paid away (a non-cumulative deposit) and the balance stays the same.
 * Banks that accrue daily (actual/365) differ by a little. Rates and the TDS percent change: pass what applies.
 */
import { divideRounded, type RoundingMode } from '../calculations/rounding.ts';
import { assertMonths, parsePercentRate } from './rate.ts';

export type CompoundingFrequency = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly' | 'at-maturity';

/** Months between interest credits for each frequency (at-maturity credits once, at the end). */
export const COMPOUNDING_MONTHS: Readonly<Record<Exclude<CompoundingFrequency, 'at-maturity'>, number>> = Object.freeze({ monthly: 1, quarterly: 3, 'half-yearly': 6, yearly: 12 });

export interface DepositInput {
  /** Opening deposit in minor units (the fixed deposit amount). 0n for a pure recurring deposit. */
  principal?: bigint;
  /** Deposited at the start of every month, in minor units (the recurring deposit instalment). Default 0n. */
  monthlyDeposit?: bigint;
  /** The term in months (1 to 600). */
  months: number;
  /** Annual interest rate in percent, a plain decimal string ('8.5'). */
  ratePercent: string;
  /** When interest is credited. Default 'quarterly', the usual Nepali bank practice. */
  compounding?: CompoundingFrequency;
  /** Tax deducted at source on each credit, in percent ('6' for 6%). Default '0'. Use the rate that applies to the depositor. */
  tdsPercent?: string;
  /** 'compound' (default) adds net interest to the balance; 'pay-out' pays it away each credit. */
  payout?: 'compound' | 'pay-out';
  /** How each interest credit and each TDS amount is rounded. */
  rounding: RoundingMode;
}

export interface DepositCredit {
  /** The credit number, from 1. */
  period: number;
  /** Months since the start at this credit (3, 6, 9 ... for quarterly). */
  month: number;
  /** Balance just after the previous credit (0n before the first deposit); `deposited` is added on top. */
  opening: bigint;
  /** Deposits made since the previous credit. */
  deposited: bigint;
  /** Gross interest credited. */
  interest: bigint;
  /** Tax deducted from this credit. */
  tds: bigint;
  /** Interest after tax. */
  net: bigint;
  /** Balance after the credit (unchanged by interest with 'pay-out'). */
  closing: bigint;
}

export interface DepositResult {
  /** One row per interest credit. */
  credits: DepositCredit[];
  /** Everything deposited. */
  totalDeposited: bigint;
  /** All gross interest. */
  grossInterest: bigint;
  /** All tax deducted. */
  totalTds: bigint;
  /** Gross interest minus tax. */
  netInterest: bigint;
  /** What the account holds at the end. With 'pay-out' the interest was paid away, so this equals the deposits. */
  maturity: bigint;
  /** Net interest paid away during the term ('pay-out'), 0n when compounding. */
  paidOut: bigint;
}

function nonNegative(value: bigint, name: string) {
  if (typeof value !== 'bigint' || value < 0n) throw new RangeError(`${name} must be a non-negative bigint of minor units`);
}

/** Simulate a fixed deposit (principal), a recurring deposit (monthlyDeposit) or both, credit by credit. */
export function simulateDeposit({ principal = 0n, monthlyDeposit = 0n, months, ratePercent, compounding = 'quarterly', tdsPercent = '0', payout = 'compound', rounding }: DepositInput): DepositResult {
  nonNegative(principal, 'principal');
  nonNegative(monthlyDeposit, 'monthlyDeposit');
  assertMonths(months);
  if (principal === 0n && monthlyDeposit === 0n) throw new RangeError('A deposit needs a principal or a monthly deposit');
  const rate = parsePercentRate(ratePercent);
  const tds = parsePercentRate(tdsPercent);
  if (tds.numerator > 100n * tds.denominator) throw new RangeError('tdsPercent cannot be over 100');
  const step = compounding === 'at-maturity' ? months : COMPOUNDING_MONTHS[compounding];
  if (step === undefined) throw new RangeError(`Unknown compounding: ${String(compounding)}`);
  // Interest for one month on balance B is B·rate/1200; accrue the numerator exactly over this denominator.
  const denominator = rate.denominator * 1200n;
  let balance = principal;
  let totalDeposited = principal;
  let accrued = 0n;
  let deposited = principal;
  let opening = 0n;
  const credits: DepositCredit[] = [];
  let grossInterest = 0n;
  let totalTds = 0n;
  let paidOut = 0n;
  for (let month = 1; month <= months; month++) {
    if (monthlyDeposit > 0n) { balance += monthlyDeposit; totalDeposited += monthlyDeposit; deposited += monthlyDeposit; }
    accrued += balance * rate.numerator;
    if (month % step === 0 || month === months) {
      const interest = divideRounded(accrued, denominator, rounding);
      const tax = divideRounded(interest * tds.numerator, 100n * tds.denominator, rounding);
      const net = interest - tax;
      if (payout === 'compound') balance += net; else paidOut += net;
      credits.push({ period: credits.length + 1, month, opening, deposited, interest, tds: tax, net, closing: balance });
      grossInterest += interest;
      totalTds += tax;
      accrued = 0n;
      deposited = 0n;
      opening = balance;
    }
  }
  return { credits, totalDeposited, grossInterest, totalTds, netInterest: grossInterest - totalTds, maturity: balance, paidOut };
}
