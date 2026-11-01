/**
 * NEPSE trade costs, exact. Amounts are integer minor units (paisa) as bigint and every rate is a decimal
 * fraction string ('0.0036' is 0.36%), so nothing passes through a float. Every figure the regulator can change
 * lives in a `NepseFeeSchedule` you can replace: `nepseFeeSchedule` is a dated example, not an authority.
 * Verify it against the current SEBON and CDSC notices before you show a person a payable amount.
 */
import { divideRounded, parseRate, type ExactRate, type RoundingMode } from '../calculations/rounding.ts';

/** One commission band. `upTo` is the inclusive upper bound of the transaction amount in minor units; null means no bound (the last band). */
export interface CommissionSlab {
  upTo: bigint | null;
  /** Decimal fraction string: '0.0036' is 0.36%. */
  rate: string;
}

export interface CommissionRule {
  /** Bands in ascending order; the last has `upTo: null`. */
  slabs: readonly CommissionSlab[];
  /** The smallest commission charged on a trade, in minor units. */
  minimum: bigint;
  /**
   * 'whole' (NEPSE's practice): the band the amount falls in sets one rate for the whole amount.
   * 'marginal': each band's rate applies only to the part of the amount inside it, like income-tax slabs.
   */
  method: 'whole' | 'marginal';
}

export interface CapitalGainsRule {
  /** Individual, held for at most `longTermAfterDays` days. */
  individualShortTerm: string;
  /** Individual, held for more than `longTermAfterDays` days. */
  individualLongTerm: string;
  /** Institutions (a company, a fund), any holding period. */
  institution: string;
  /** A holding longer than this many days is long term. */
  longTermAfterDays: number;
}

export interface NepseFeeSchedule {
  /** Where these figures come from and from when, shown nowhere by the library: keep it for your audit trail. */
  source: string;
  /** Broker commission bands, minimum and method. */
  commission: CommissionRule;
  /** SEBON regulatory fee as a fraction of the amount. */
  sebonRate: string;
  /** CDSC depository (DP) charge per scrip per trading day, in minor units. */
  dpCharge: bigint;
  /** Which side pays the DP charge. Brokers commonly charge it on a sell; some charge both sides. */
  dpChargeOn: 'sell' | 'both' | 'none';
  /** Capital gains tax rates by investor type and holding period. */
  capitalGains: CapitalGainsRule;
  /** Rounding for every fraction of a paisa (commission, SEBON fee, CGT). */
  rounding: RoundingMode;
}

/**
 * An example schedule from the rates published in 2024 (commission bands effective Magh 2080): verify before use.
 * Commission 0.36% up to Rs 50,000, 0.33% to Rs 5 lakh, 0.31% to Rs 20 lakh, 0.27% to Rs 1 crore, 0.24% above,
 * minimum Rs 10; SEBON fee 0.015%; DP charge Rs 25 per scrip on a sell; CGT 7.5% (held up to 365 days) and 5%
 * (longer) for individuals, 10% for institutions.
 */
export const nepseFeeSchedule: NepseFeeSchedule = Object.freeze({
  source: 'Example: SEBON/NEPSE rates as published in 2024. Verify against current notices.',
  commission: Object.freeze({
    slabs: Object.freeze([
      Object.freeze({ upTo: 5_000_000n, rate: '0.0036' }),
      Object.freeze({ upTo: 50_000_000n, rate: '0.0033' }),
      Object.freeze({ upTo: 200_000_000n, rate: '0.0031' }),
      Object.freeze({ upTo: 1_000_000_000n, rate: '0.0027' }),
      Object.freeze({ upTo: null, rate: '0.0024' }),
    ]),
    minimum: 1_000n,
    method: 'whole' as const,
  }),
  sebonRate: '0.00015',
  dpCharge: 2_500n,
  dpChargeOn: 'sell' as const,
  capitalGains: Object.freeze({ individualShortTerm: '0.075', individualLongTerm: '0.05', institution: '0.10', longTermAfterDays: 365 }),
  rounding: 'half-up' as const,
});

const times = (amount: bigint, rate: ExactRate, mode: RoundingMode) => divideRounded(amount * rate.numerator, rate.denominator, mode);

function checkSlabs(slabs: readonly CommissionSlab[]): void {
  if (slabs.length === 0) throw new RangeError('commission needs at least one slab');
  let previous = -1n;
  slabs.forEach((slab, index) => {
    const last = index === slabs.length - 1;
    if (slab.upTo === null ? !last : slab.upTo <= previous) throw new RangeError('commission slabs must ascend and only the last may have upTo: null');
    if (last && slab.upTo !== null) throw new RangeError('the last commission slab must have upTo: null');
    if (slab.upTo !== null) previous = slab.upTo;
  });
}

function checkAmount(amount: bigint): void {
  if (amount < 0n) throw new RangeError('amount must not be negative');
}

/** The rate band an amount falls in. */
export function commissionSlabFor(amount: bigint, schedule: Pick<NepseFeeSchedule, 'commission'> = nepseFeeSchedule): CommissionSlab {
  checkAmount(amount);
  checkSlabs(schedule.commission.slabs);
  return schedule.commission.slabs.find((slab) => slab.upTo === null || amount <= slab.upTo)!;
}

/** Broker commission on a transaction amount (quantity × price) in minor units. Zero for a zero amount; otherwise at least the minimum. */
export function brokerCommission(amount: bigint, schedule: Pick<NepseFeeSchedule, 'commission' | 'rounding'> = nepseFeeSchedule): bigint {
  checkAmount(amount);
  if (amount === 0n) return 0n;
  const { slabs, minimum, method } = schedule.commission;
  checkSlabs(slabs);
  let fee: bigint;
  if (method === 'whole') {
    fee = times(amount, parseRate(commissionSlabFor(amount, schedule).rate), schedule.rounding);
  } else if (method === 'marginal') {
    // Sum the exact fractions band by band, then round once.
    let lower = 0n;
    let numerator = 0n;
    let denominator = 1n;
    for (const slab of slabs) {
      const top = slab.upTo === null || amount < slab.upTo ? amount : slab.upTo;
      if (top > lower) {
        const rate = parseRate(slab.rate);
        numerator = numerator * rate.denominator + (top - lower) * rate.numerator * denominator;
        denominator *= rate.denominator;
      }
      if (slab.upTo === null || amount <= slab.upTo) break;
      lower = slab.upTo;
    }
    fee = divideRounded(numerator, denominator, schedule.rounding);
  } else {
    throw new TypeError('commission.method must be "whole" or "marginal"');
  }
  return fee < minimum ? minimum : fee;
}

/** SEBON regulatory fee on a transaction amount in minor units. */
export function sebonFee(amount: bigint, schedule: Pick<NepseFeeSchedule, 'sebonRate' | 'rounding'> = nepseFeeSchedule): bigint {
  checkAmount(amount);
  return times(amount, parseRate(schedule.sebonRate), schedule.rounding);
}

export type InvestorType = 'individual' | 'institution';

/** The capital gains tax rate (a decimal fraction string) for a holding period in whole days and an investor type. */
export function capitalGainsTaxRate(holdingDays: number, investor: InvestorType = 'individual', schedule: Pick<NepseFeeSchedule, 'capitalGains'> = nepseFeeSchedule): string {
  if (!Number.isInteger(holdingDays) || holdingDays < 0) throw new RangeError('holdingDays must be a whole number of days, 0 or more');
  const rule = schedule.capitalGains;
  if (investor === 'institution') return rule.institution;
  if (investor !== 'individual') throw new TypeError('investor must be "individual" or "institution"');
  return holdingDays > rule.longTermAfterDays ? rule.individualLongTerm : rule.individualShortTerm;
}

export interface NepseTradeInput {
  side: 'buy' | 'sell';
  /** Units, a positive whole number. */
  quantity: bigint;
  /** Price per unit in minor units. */
  price: bigint;
  /** Scrips (companies) traded that day for the DP charge on this estimate. Default 1; pass 0 when the charge was already counted on another order. */
  dpScrips?: number;
  /** Sell only: what these units cost, fees included, in minor units (WACC × quantity). Needed for capital gains tax. */
  costBasis?: bigint;
  /** Sell only: days the units were held. Needed with `costBasis` for capital gains tax. */
  holdingDays?: number;
  /** Default 'individual'. */
  investor?: InvestorType;
}

export interface NepseTradeEstimate {
  /** The side estimated. */
  side: 'buy' | 'sell';
  /** quantity × price. */
  amount: bigint;
  /** Broker commission, at least the schedule's minimum. */
  commission: bigint;
  /** The commission rate applied ('whole' method) or null ('marginal'). */
  commissionRate: string | null;
  /** SEBON regulatory fee. */
  sebonFee: bigint;
  /** CDSC DP charge, zero when this side does not pay it. */
  dpCharge: bigint;
  /** commission + SEBON fee + DP charge. */
  fees: bigint;
  /** Sell with a cost basis: net proceeds before tax minus the cost basis. Otherwise null. */
  capitalGain: bigint | null;
  /** The CGT rate applied, or null when no tax was computed. */
  capitalGainsTaxRate: string | null;
  /** Zero on a buy, a loss, or when no cost basis was given. */
  capitalGainsTax: bigint;
  /** Buy: the amount payable (amount + fees). Sell: the amount receivable (amount − fees − tax). */
  total: bigint;
  /** total ÷ quantity, rounded with the schedule's mode: the effective cost (buy) or proceeds (sell) per unit. */
  perUnit: bigint;
}

/** Every cost of one order, exact: commission, SEBON fee, DP charge and, on a sell with a cost basis, capital gains tax. */
export function estimateNepseTrade(input: NepseTradeInput, schedule: NepseFeeSchedule = nepseFeeSchedule): NepseTradeEstimate {
  const { side, quantity, price, dpScrips = 1, costBasis, holdingDays, investor = 'individual' } = input;
  if (side !== 'buy' && side !== 'sell') throw new TypeError('side must be "buy" or "sell"');
  if (quantity <= 0n) throw new RangeError('quantity must be positive');
  if (price < 0n) throw new RangeError('price must not be negative');
  if (!Number.isInteger(dpScrips) || dpScrips < 0) throw new RangeError('dpScrips must be a whole number, 0 or more');
  if (costBasis !== undefined && costBasis < 0n) throw new RangeError('costBasis must not be negative');
  const amount = quantity * price;
  const commission = brokerCommission(amount, schedule);
  const sebon = sebonFee(amount, schedule);
  const paysDp = schedule.dpChargeOn === 'both' || schedule.dpChargeOn === side;
  const dpCharge = paysDp ? schedule.dpCharge * BigInt(dpScrips) : 0n;
  const fees = commission + sebon + dpCharge;
  let capitalGain: bigint | null = null;
  let taxRate: string | null = null;
  let tax = 0n;
  if (side === 'sell' && costBasis !== undefined) {
    capitalGain = amount - fees - costBasis;
    if (holdingDays !== undefined || investor === 'institution') {
      taxRate = capitalGainsTaxRate(holdingDays ?? 0, investor, schedule);
      tax = capitalGain > 0n ? times(capitalGain, parseRate(taxRate), schedule.rounding) : 0n;
    }
  }
  const total = side === 'buy' ? amount + fees : amount - fees - tax;
  return {
    side, amount, commission,
    commissionRate: schedule.commission.method === 'whole' && amount > 0n ? commissionSlabFor(amount, schedule).rate : null,
    sebonFee: sebon, dpCharge, fees, capitalGain, capitalGainsTaxRate: taxRate, capitalGainsTax: tax, total,
    perUnit: divideRounded(total, quantity, schedule.rounding),
  };
}
