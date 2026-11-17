/**
 * Options payoff maths: pure, exact, bigint. No React, no DOM, no pricing model.
 *
 * Prices are integer minor units (paisa, cents) per unit of the underlying. A leg is a long or short call, put or
 * stock position; its payoff at expiry is piecewise linear in the spot price, so everything here is exact: the
 * value at any spot, the kinks, the extremes and the breakevens (as a ratio of two bigints, never a float).
 *
 *   payoffAt           profit or loss of a strategy at one spot, premiums included
 *   legPayoffAt        the same for one leg
 *   payoffSamples      a sorted list of spots over a range that always includes every strike in it
 *   strategyBreakevens the spots where the payoff crosses or touches zero (exact ratios, plus the nearest minor unit)
 *   strategyExtremes   the best and worst payoff over every spot from 0 up, "unlimited" where it grows without bound
 *   payoffSlopeAbove   how fast the payoff grows per +1 minor unit of spot above the highest strike
 *
 * Spot is never negative. A stock leg's `premium` is its entry price and its `strike` is not used.
 */

const byBigint = (a: bigint, b: bigint): number => (a < b ? -1 : a > b ? 1 : 0);

export type PayoffLegKind = 'call' | 'put' | 'stock';
export type PayoffSide = 'long' | 'short';

export interface PayoffLeg {
  /** 'call', 'put' or 'stock'. */
  kind: PayoffLegKind;
  /** 'long' (bought) or 'short' (sold). */
  side: PayoffSide;
  /** Contracts (or shares for stock): a positive whole number. */
  quantity: number;
  /** Units of the underlying per contract. Default 1. A whole number. */
  multiplier?: number;
  /** The strike, in minor units. Required for a call or a put; ignored for stock. */
  strike?: bigint;
  /** Premium paid (long) or received (short) per unit, in minor units; for stock, the entry price. */
  premium: bigint;
}

/** A whole number of units in a leg (quantity times multiplier), as a bigint. Throws a RangeError for anything else. */
export function legUnits(leg: PayoffLeg): bigint {
  const { quantity, multiplier = 1 } = leg;
  if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new RangeError('A leg quantity must be a positive whole number');
  if (!Number.isSafeInteger(multiplier) || multiplier <= 0) throw new RangeError('A leg multiplier must be a positive whole number');
  return BigInt(quantity) * BigInt(multiplier);
}

function strikeOf(leg: PayoffLeg): bigint {
  if (leg.kind === 'stock') return 0n;
  if (typeof leg.strike !== 'bigint' || leg.strike < 0n) throw new RangeError(`A ${leg.kind} leg needs a strike of zero or more`);
  return leg.strike;
}

function assertSpot(spot: bigint): void {
  if (typeof spot !== 'bigint' || spot < 0n) throw new RangeError('A spot price must be a bigint of zero or more');
}

/** Intrinsic value of one unit at expiry, before premium. */
function intrinsic(leg: PayoffLeg, spot: bigint): bigint {
  if (leg.kind === 'stock') return spot;
  const strike = strikeOf(leg);
  const raw = leg.kind === 'call' ? spot - strike : strike - spot;
  return raw > 0n ? raw : 0n;
}

/** Profit or loss of one leg at expiry, premium included, in minor units. A long leg gains `intrinsic - premium`; a short leg the opposite. */
export function legPayoffAt(leg: PayoffLeg, spot: bigint): bigint {
  assertSpot(spot);
  const each = intrinsic(leg, spot) - leg.premium;
  const total = each * legUnits(leg);
  return leg.side === 'long' ? total : -total;
}

/** Profit or loss of a strategy at expiry for one spot, in minor units. An empty strategy is zero everywhere. */
export function payoffAt(legs: readonly PayoffLeg[], spot: bigint): bigint {
  let sum = 0n;
  for (const leg of legs) sum += legPayoffAt(leg, spot);
  return sum;
}

/** The change in payoff per +1 minor unit of spot above the highest strike: positive means profit without a ceiling, negative means loss without a floor. */
export function payoffSlopeAbove(legs: readonly PayoffLeg[]): bigint {
  let slope = 0n;
  for (const leg of legs) {
    if (leg.kind === 'put') continue;
    const units = legUnits(leg);
    slope += leg.side === 'long' ? units : -units;
  }
  return slope;
}

/** The spots where the payoff changes slope: zero and every strike, ascending, no repeats. */
export function payoffKnots(legs: readonly PayoffLeg[]): bigint[] {
  const set = new Set<bigint>([0n]);
  for (const leg of legs) if (leg.kind !== 'stock') set.add(strikeOf(leg));
  return [...set].toSorted(byBigint);
}

/**
 * `steps + 1` evenly spaced spots from `from` to `to` (whole minor units, repeats removed), plus every strike that falls
 * inside the range, ascending. Because the payoff is linear between strikes, joining these points draws it exactly.
 */
export function payoffSamples(legs: readonly PayoffLeg[], from: bigint, to: bigint, steps = 40): bigint[] {
  assertSpot(from);
  if (to < from) throw new RangeError('payoffSamples: `to` must not be below `from`');
  if (!Number.isInteger(steps) || steps < 1) throw new RangeError('payoffSamples: steps must be a whole number of 1 or more');
  const set = new Set<bigint>();
  const span = to - from;
  for (let i = 0; i <= steps; i += 1) set.add(from + (span * BigInt(i)) / BigInt(steps));
  for (const knot of payoffKnots(legs)) if (knot >= from && knot <= to) set.add(knot);
  return [...set].toSorted(byBigint);
}

/** A breakeven spot as an exact ratio (`denominator` is positive, the ratio is in lowest terms) and rounded to the nearest minor unit (halves up). */
export interface Breakeven {
  numerator: bigint;
  denominator: bigint;
  /** The nearest whole minor unit; what you would quote. */
  minor: bigint;
  /** True when the breakeven is exactly a whole minor unit. */
  exact: boolean;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

function ratio(numerator: bigint, denominator: bigint): Breakeven {
  const sign = denominator < 0n ? -1n : 1n;
  let n = numerator * sign;
  let d = denominator * sign;
  const g = gcd(n, d) || 1n;
  n /= g;
  d /= g;
  const minor = (2n * n + d) / (2n * d);
  return { numerator: n, denominator: d, minor, exact: d === 1n };
}

const sign = (v: bigint): -1 | 0 | 1 => (v > 0n ? 1 : v < 0n ? -1 : 0);

/**
 * Every spot from 0 up where the strategy's payoff is zero: a crossing from loss to profit or back, or a touch. Ascending,
 * exact. A flat stretch where the payoff stays exactly zero adds its two end points, not the points between. Empty when
 * the payoff never reaches zero (a net credit that cannot lose, or a net debit that cannot win).
 */
export function strategyBreakevens(legs: readonly PayoffLeg[]): Breakeven[] {
  if (legs.length === 0) return [];
  const knots = payoffKnots(legs);
  const values = knots.map((k) => payoffAt(legs, k));
  const slope = payoffSlopeAbove(legs);
  const found: Breakeven[] = [];
  const last = knots.length - 1;
  for (let i = 0; i <= last; i += 1) {
    const v = values[i]!;
    if (v === 0n) {
      const flatBefore = i > 0 && values[i - 1] === 0n;
      const flatAfter = i < last ? values[i + 1] === 0n : slope === 0n;
      // Inside a flat zero stretch (flat on both sides) is not a point worth naming.
      if (!(flatBefore && flatAfter)) found.push(ratio(knots[i]!, 1n));
    }
    if (i < last) {
      const w = values[i + 1]!;
      if (sign(v) * sign(w) < 0) {
        // Linear between the knots: k0 + (-v) * (k1 - k0) / (w - v).
        const k0 = knots[i]!;
        const k1 = knots[i + 1]!;
        found.push(ratio(k0 * (w - v) - v * (k1 - k0), w - v));
      }
    }
  }
  // Beyond the highest strike the payoff is a ray; it crosses zero there only if it heads toward zero.
  const tail = values[last]!;
  if (tail !== 0n && slope !== 0n && sign(tail) * sign(slope) < 0) found.push(ratio(knots[last]! * slope - tail, slope));
  return found.toSorted((a, b) => {
    const left = a.numerator * b.denominator;
    const right = b.numerator * a.denominator;
    return left < right ? -1 : left > right ? 1 : 0;
  });
}

/** The best or worst payoff: a value and the knots where it is reached, or `unlimited` when it grows without bound. */
export type PayoffExtreme = { unlimited: false; value: bigint; at: bigint[] } | { unlimited: true; value: null; at: [] };

export interface PayoffExtremes {
  maxProfit: PayoffExtreme;
  maxLoss: PayoffExtreme;
}

/**
 * The largest profit and the largest loss over every spot from 0 up. The payoff is piecewise linear, so an extreme is at
 * zero or at a strike, or runs off to infinity above the highest strike (`unlimited`). `maxLoss.value` is the
 * lowest payoff and `maxProfit.value` the highest; a strategy that can never profit has a `maxProfit.value` of zero or
 * less, one that can never lose a `maxLoss.value` of zero or more.
 */
export function strategyExtremes(legs: readonly PayoffLeg[]): PayoffExtremes {
  const knots = payoffKnots(legs);
  const values = knots.map((k) => payoffAt(legs, k));
  const slope = payoffSlopeAbove(legs);
  const pick = (better: (a: bigint, b: bigint) => boolean): { value: bigint; at: bigint[] } => {
    let value = values[0]!;
    for (const v of values) if (better(v, value)) value = v;
    return { value, at: knots.filter((_, i) => values[i] === value) };
  };
  const profit = pick((a, b) => a > b);
  const loss = pick((a, b) => a < b);
  return {
    maxProfit: slope > 0n ? { unlimited: true, value: null, at: [] } : { unlimited: false, ...profit },
    maxLoss: slope < 0n ? { unlimited: true, value: null, at: [] } : { unlimited: false, ...loss },
  };
}
