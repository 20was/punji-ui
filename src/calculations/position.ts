/**
 * Exact position accounting from a trade list. Prices, fees and results are
 * integer minor units (paisa, cents); quantity is an integer count of the
 * smallest tradable unit. Currency-agnostic: no fee schedules, tax rates or
 * market rules are built in. Short positions are not modelled.
 */
import { divideRounded, parseRate, type ExactRate, type RoundingMode } from './rounding.ts';

export interface Trade {
  side: 'buy' | 'sell';
  quantity: bigint;
  /** Minor units per unit. A bonus share issue is a buy at price 0n. */
  price: bigint;
  /** Total fees for this trade in minor units: added to cost on buys, deducted from proceeds on sells. */
  fees?: bigint;
}

export type CostMethod = 'average' | 'fifo';

export interface Lot { quantity: bigint; cost: bigint }

export interface Position {
  quantity: bigint;
  /** Cost of the units still held, fees included. */
  costBasis: bigint;
  /** Sum of (net sale proceeds − cost removed) over every sell. */
  realisedPnL: bigint;
  totalFees: bigint;
  /** costBasis / quantity rounded with the chosen mode; null when flat. A display figure: costBasis stays exact. */
  averageCost: bigint | null;
  /** Open lots, oldest first. With the average method this is one pooled lot. */
  lots: Lot[];
}

export interface PositionOptions {
  method: CostMethod;
  /** Applied wherever a sell removes part of a lot's cost, and to averageCost. Cost is conserved: removed + remaining = original. */
  rounding: RoundingMode;
}

function check(trade: Trade, index: number): bigint {
  const fees = trade.fees ?? 0n;
  if (trade.side !== 'buy' && trade.side !== 'sell') throw new TypeError(`Trade ${index}: side must be "buy" or "sell"`);
  if (trade.quantity <= 0n) throw new RangeError(`Trade ${index}: quantity must be positive`);
  if (trade.price < 0n || fees < 0n) throw new RangeError(`Trade ${index}: price and fees must not be negative`);
  return fees;
}

/** Replay trades in order and return the open position. Throws when a sell exceeds the units held. */
export function computePosition(trades: readonly Trade[], options: PositionOptions): Position {
  const { method, rounding } = options;
  if (method !== 'average' && method !== 'fifo') throw new TypeError('method must be "average" or "fifo"');
  const lots: Lot[] = [];
  let realisedPnL = 0n, totalFees = 0n;
  trades.forEach((trade, index) => {
    const fees = check(trade, index);
    totalFees += fees;
    const amount = trade.quantity * trade.price;
    if (trade.side === 'buy') {
      if (method === 'average' && lots[0]) { lots[0].quantity += trade.quantity; lots[0].cost += amount + fees; }
      else lots.push({ quantity: trade.quantity, cost: amount + fees });
      return;
    }
    const held = lots.reduce((sum, lot) => sum + lot.quantity, 0n);
    if (trade.quantity > held) throw new RangeError(`Trade ${index}: sells ${trade.quantity} but only ${held} held`);
    let remaining = trade.quantity, removed = 0n;
    while (remaining > 0n) {
      const lot = lots[0]!;
      const take = remaining < lot.quantity ? remaining : lot.quantity;
      const cost = take === lot.quantity ? lot.cost : divideRounded(lot.cost * take, lot.quantity, rounding);
      lot.quantity -= take;
      lot.cost -= cost;
      removed += cost;
      remaining -= take;
      if (lot.quantity === 0n) lots.shift();
    }
    realisedPnL += amount - fees - removed;
  });
  const quantity = lots.reduce((sum, lot) => sum + lot.quantity, 0n);
  const costBasis = lots.reduce((sum, lot) => sum + lot.cost, 0n);
  return {
    quantity, costBasis, realisedPnL, totalFees,
    averageCost: quantity === 0n ? null : divideRounded(costBasis, quantity, rounding),
    lots: lots.map(lot => ({ ...lot })),
  };
}

export interface Valuation { marketValue: bigint; unrealisedPnL: bigint }

/** Mark a position to a price in minor units per unit. No selling fees are assumed. */
export function valuePosition(position: Pick<Position, 'quantity' | 'costBasis'>, marketPrice: bigint): Valuation {
  if (marketPrice < 0n) throw new RangeError('marketPrice must not be negative');
  const marketValue = position.quantity * marketPrice;
  return { marketValue, unrealisedPnL: marketValue - position.costBasis };
}

/**
 * Lowest price per unit at which selling everything recovers costBasis,
 * rounded up so selling at it never loses. `sellRate` models proportional
 * selling costs only, as a decimal fraction ('0.004'); tiered or flat fees
 * need the caller's own fee schedule. Null when nothing is held.
 */
export function breakEvenPrice(costBasis: bigint, quantity: bigint, options: { sellRate?: string | ExactRate } = {}): bigint | null {
  if (quantity < 0n) throw new RangeError('quantity must not be negative');
  if (quantity === 0n) return null;
  const { numerator, denominator } = typeof options.sellRate === 'string' ? parseRate(options.sellRate) : options.sellRate ?? { numerator: 0n, denominator: 1n };
  if (numerator >= denominator) throw new RangeError('sellRate must be below 1');
  return divideRounded(costBasis * denominator, quantity * (denominator - numerator), 'ceil');
}

export interface GainTaxRule {
  /** Decimal fraction supplied by the caller from a verified source, e.g. a jurisdiction's current schedule. */
  rate: string | ExactRate;
  rounding: RoundingMode;
}

/**
 * Tax on a realised gain under a caller-supplied flat rule. Losses and zero
 * gains owe nothing here; loss carry-forward, holding-period tiers and
 * entity-specific rates belong to the caller's rule selection.
 */
export function taxOnGain(gain: bigint, rule: GainTaxRule): bigint {
  if (gain <= 0n) return 0n;
  const { numerator, denominator } = typeof rule.rate === 'string' ? parseRate(rule.rate) : rule.rate;
  return divideRounded(gain * numerator, denominator, rule.rounding);
}
