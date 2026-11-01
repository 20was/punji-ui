/**
 * Order checks for a trading ticket. Pure: prices are integer minor units (bigint) and quantities whole units,
 * so a tick or a circuit check is exact. The exchange's own validation is the authority; these checks catch a
 * mistake before the order leaves the screen.
 */
import { divideRounded, type RoundingMode } from '../calculations/rounding.ts';

/** `price` moved onto the tick grid (multiples of `tick`). 'half-up' snaps to the nearest tick, 'floor' down, 'ceil' up. */
export function snapToTick(price: bigint, tick: bigint, rounding: RoundingMode = 'half-up'): bigint {
  if (tick <= 0n) throw new RangeError('tick must be positive');
  return divideRounded(price, tick, rounding) * tick;
}

/** Whether `price` is a whole number of ticks. */
export function isOnTick(price: bigint, tick: bigint): boolean {
  if (tick <= 0n) throw new RangeError('tick must be positive');
  return price % tick === 0n;
}

export type OrderIssue =
  | 'quantity-missing'
  | 'quantity-lot'
  | 'quantity-min'
  | 'quantity-max'
  | 'price-missing'
  | 'price-tick'
  | 'price-above-upper'
  | 'price-below-lower';

export interface OrderRules {
  /** Price step in minor units. NEPSE: 10n (Rs 0.10). */
  tickSize: bigint;
  /** Quantity must be a multiple of this. Default 1n. */
  lotSize?: bigint;
  /** Smallest quantity. Default the lot size. */
  minQuantity?: bigint;
  /** Largest quantity, when the broker or exchange caps it. */
  maxQuantity?: bigint;
  /** The day's lower circuit limit in minor units. */
  lowerLimit?: bigint | null;
  /** The day's upper circuit limit in minor units. */
  upperLimit?: bigint | null;
}

export interface OrderDraft {
  quantity: bigint | null;
  price: bigint | null;
}

/** Every problem with a draft order, in field order (quantity first). An empty list means it may be sent. */
export function validateOrder(draft: OrderDraft, rules: OrderRules): OrderIssue[] {
  const lot = rules.lotSize ?? 1n;
  if (lot <= 0n) throw new RangeError('lotSize must be positive');
  const min = rules.minQuantity ?? lot;
  const issues: OrderIssue[] = [];
  const { quantity, price } = draft;
  if (quantity === null || quantity <= 0n) issues.push('quantity-missing');
  else if (quantity < min) issues.push('quantity-min');
  else if (rules.maxQuantity !== undefined && quantity > rules.maxQuantity) issues.push('quantity-max');
  else if (quantity % lot !== 0n) issues.push('quantity-lot');
  if (price === null || price <= 0n) issues.push('price-missing');
  else if (rules.upperLimit != null && price > rules.upperLimit) issues.push('price-above-upper');
  else if (rules.lowerLimit != null && price < rules.lowerLimit) issues.push('price-below-lower');
  else if (!isOnTick(price, rules.tickSize)) issues.push('price-tick');
  return issues;
}
