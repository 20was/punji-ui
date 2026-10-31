/**
 * Circuit-limit arithmetic. Pure: prices are integer minor units (bigint), so
 * a limit is exact; only the 0..1 position is a float, for drawing.
 */
import { applyRate } from '../calculations/rounding.ts';

export interface CircuitLimits { lower: bigint; upper: bigint }

/**
 * Limits as a band around the previous close: close ± close × rate. `rate` is a decimal
 * fraction string as in `applyRate` ('0.10' is ±10%). Both limits round toward the close, so a
 * limit never lies outside the band. Many exchanges round to a tick instead: if yours does,
 * pass the limits it publishes (`lowerLimit`, `upperLimit`) rather than computing them. The
 * exchange's own figure is the authority; this is for when none is supplied.
 */
export function circuitLimits(previousClose: bigint, rate: string): CircuitLimits {
  if (previousClose < 0n) throw new RangeError('previousClose must not be negative');
  const move = applyRate(previousClose, rate, 'floor');
  const lower = previousClose - move;
  return { lower, upper: previousClose + move };
}

export type LimitState = 'at-upper' | 'at-lower' | 'within' | 'unknown';

export interface LimitPosition {
  state: LimitState;
  /** Where the price sits between the limits, 0 at the lower and 1 at the upper (clamped). Null when unknown. */
  position: number | null;
  /** The price is beyond a limit (a stale limit or a price outside the band), not merely at it. */
  outside: boolean;
}

/** Where `ltp` sits in `[lower, upper]`. Unknown when any input is missing or the limits do not form a band. */
export function limitPosition(ltp: bigint | null | undefined, lower: bigint | null | undefined, upper: bigint | null | undefined): LimitPosition {
  if (ltp == null || lower == null || upper == null || upper <= lower) return { state: 'unknown', position: null, outside: false };
  if (ltp >= upper) return { state: 'at-upper', position: 1, outside: ltp > upper };
  if (ltp <= lower) return { state: 'at-lower', position: 0, outside: ltp < lower };
  return { state: 'within', position: Number(((ltp - lower) * 10_000n) / (upper - lower)) / 10_000, outside: false };
}
