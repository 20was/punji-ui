/**
 * How far a price is from an alert's target, the one rule every alert view reads: the alerts page, an overview's
 * "Your alerts" and a watchlist panel draw the same bar from the same numbers.
 *
 *   alertDistance   target minus price, that as a percentage of the price, and whether the price is already past the
 *                   target.
 *   alertCloseness  how full the distance bar draws: 1 at the target, 0 at ALERT_BAR_SCALE_PCT (10%) away or further,
 *                   straight in between (no curve that makes a far alert look close).
 *
 * Prices are bigint minor units (paisa); the difference stays exact at any size. Only the percentage is a `number`,
 * and it is for display and the bar, never for money. Pure: no React.
 */

/** The distance bar is empty at this far from the target (percent of the price). */
export const ALERT_BAR_SCALE_PCT = 10;

export type AlertDirection = 'above' | 'below';

export interface AlertDistance {
  /** Target minus price in minor units, exact (positive: the price has to rise). */
  diff: bigint;
  /** The same as a percentage of the price (signed), truncated at four decimals. Display only. */
  pct: number;
  /** The price is already on the target's side: the alert fires on its next check. */
  crossed: boolean;
  /** 0 (10% or more away) to 1 (at or past the target), for the bar. */
  closeness: number;
}

const positive = (n: unknown): n is bigint => typeof n === 'bigint' && n > 0n;

/**
 * How full the bar draws for a distance in percent (sign ignored); a crossed alert is full; an unknown distance is empty.
 *
 * @stability beta
 */
export function alertCloseness(distancePct: number | null | undefined, crossed = false): number {
  if (crossed) return 1;
  if (typeof distancePct !== 'number' || !Number.isFinite(distancePct)) return 0;
  return Math.max(0, Math.min(1, 1 - Math.abs(distancePct) / ALERT_BAR_SCALE_PCT));
}

/**
 * Null when the target or the price is unknown or not above zero (the view says so in words, never "0.00%").
 *
 * @stability beta
 */
export function alertDistance(direction: AlertDirection, target: bigint | null | undefined, price: bigint | null | undefined): AlertDistance | null {
  if (!positive(target) || !positive(price)) return null;
  const diff = target - price;
  const pct = Number((diff * 1_000_000n) / price) / 10_000;
  const crossed = direction === 'above' ? price >= target : price <= target;
  return { diff, pct, crossed, closeness: alertCloseness(pct, crossed) };
}
