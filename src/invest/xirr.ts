/**
 * XIRR: the annual rate at which a dated series of cash flows has a net present value of zero, the figure Groww,
 * Kuvera and every mutual fund statement print as "XIRR". Day count actual/365 from the first flow (Excel's XIRR).
 *
 * How it is solved, and how precise it is:
 *   - Amounts stay bigint minor units. Discount factors are fixed-point bigints with 36 decimal places (a scale of
 *     10^36), computed with exp and ln series on bigints, never a float.
 *   - The rate is found by bisection on a bracket where the net present value changes sign, so it always converges and
 *     never jumps to a far root the way Newton's method can. The search runs until the bracket is narrower than
 *     10^-(digits + 2), then the midpoint is rounded half-even to `digits` decimal places (default 8, that is 0.000001%).
 *   - The answer is therefore within one unit in the last place shown of the true root. Series and fixed-point errors
 *     are below 10^-30 of the largest amount, far under that.
 * Flows with no change of sign have no rate (null). Flows with more than one sign change can have more than one rate;
 * bisection returns the one in the first bracket it finds, searching up from -99.9999%.
 */
import { divideRounded } from '../calculations/rounding.ts';
import { parseCalendarDate, type CalendarDate } from '../nepal/date-only.ts';

export interface CashFlow {
  /** The day of the flow: 'YYYY-MM-DD' or a CalendarDate. */
  date: string | CalendarDate;
  /** Signed minor units: money you put in is negative, money you take out (or the current value) positive. */
  amount: bigint;
}

export interface XirrOptions {
  /** Decimal places of the rate as a fraction (8 gives 0.12345678, which is 12.345678%). 2 to 12, default 8. */
  digits?: number;
}

export interface XirrResult {
  /** The annual rate as a decimal fraction string with `digits` places ('0.12345678'). */
  rate: string;
  /** The same rate in percent with `digits - 2` places ('12.345678'). */
  percent: string;
  /** The rate exactly as shown: numerator / 10^digits. */
  numerator: bigint;
  denominator: bigint;
  /** Bisection steps taken. */
  iterations: number;
}

const SCALE = 10n ** 36n;
const MS_PER_DAY = 86_400_000;

/** atanh(z) for a fixed-point |z| < 1 (series z + z^3/3 + z^5/5 ...). */
function atanh(z: bigint): bigint {
  const z2 = (z * z) / SCALE;
  let power = z;
  let sum = 0n;
  for (let k = 1n; power !== 0n; k += 2n) {
    sum += power / k;
    power = (power * z2) / SCALE;
  }
  return sum;
}

/** ln 2 at the working scale: 2·atanh(1/3). */
const LN2 = 2n * atanh(SCALE / 3n);

/** Natural log of a positive fixed-point value. */
function ln(x: bigint): bigint {
  if (x <= 0n) throw new RangeError('ln of a non-positive value');
  let k = 0n;
  let y = x;
  while (y > 2n * SCALE) { y /= 2n; k += 1n; }
  while (y < SCALE / 2n) { y *= 2n; k -= 1n; }
  return 2n * atanh(((y - SCALE) * SCALE) / (y + SCALE)) + k * LN2;
}

/** e^x for a fixed-point x: x = k·ln2 + r with |r| ≤ ln2/2, a Taylor series for e^r, then a shift by k. */
function exp(x: bigint): bigint {
  const k = divideRounded(x, LN2, 'half-even');
  const r = x - k * LN2;
  let term = SCALE;
  let sum = SCALE;
  for (let n = 1n; term !== 0n; n += 1n) {
    term = (term * r) / (SCALE * n);
    sum += term;
  }
  return k >= 0n ? sum << k : sum >> -k;
}

function dayNumber(date: string | CalendarDate): number {
  const d = typeof date === 'string' ? parseCalendarDate(date) : date;
  if (!d) throw new TypeError(`Expected a date 'YYYY-MM-DD', got ${JSON.stringify(date)}`);
  return Date.UTC(d.year, d.month - 1, d.day) / MS_PER_DAY;
}

interface Prepared { days: bigint; amount: bigint }

function prepare(flows: readonly CashFlow[]): Prepared[] {
  if (flows.length < 2) throw new RangeError('XIRR needs at least two cash flows');
  const numbered = flows.map((f) => {
    if (typeof f.amount !== 'bigint') throw new TypeError('Cash flow amounts must be bigint minor units');
    return { day: dayNumber(f.date), amount: f.amount };
  });
  const first = Math.min(...numbered.map((f) => f.day));
  return numbered.map((f) => ({ days: BigInt(f.day - first), amount: f.amount }));
}

/** The net present value at continuous rate L = ln(1 + r), scaled by SCALE (sign is what matters). */
function npvAtLog(flows: readonly Prepared[], logRate: bigint): bigint {
  let sum = 0n;
  // Each flow times e^(-L·t): a far-future flow at a high rate underflows to 0, which is its value to 36 places.
  for (const f of flows) sum += f.days === 0n ? f.amount * SCALE : f.amount * exp(-(logRate * f.days) / 365n);
  return sum;
}

const sign = (v: bigint) => (v > 0n ? 1 : v < 0n ? -1 : 0);

function decimal(numerator: bigint, places: number): string {
  const negative = numerator < 0n;
  const digits = (negative ? -numerator : numerator).toString().padStart(places + 1, '0');
  const text = places > 0 ? `${digits.slice(0, -places)}.${digits.slice(-places)}` : digits;
  return negative ? `-${text}` : text;
}

/** Parse a rate fraction ('0.12', '-0.05') into a fixed-point value at SCALE. */
function parseSignedRate(rate: string): bigint {
  const m = /^(-)?(\d{1,7})(?:\.(\d{1,30}))?$/.exec(rate);
  if (!m) throw new TypeError(`Expected a rate such as "0.12", got ${JSON.stringify(rate)}`);
  const fraction = (m[3] ?? '').padEnd(36, '0');
  const value = BigInt(m[2]!) * SCALE + BigInt(fraction);
  return m[1] ? -value : value;
}

/**
 * The net present value of the flows at an annual rate (a decimal fraction string, '0.12' for 12%), discounted to
 * the first flow's date, in minor units rounded with `rounding` (default half-even). At the XIRR it is zero to within
 * the rounding of the rate.
 */
export function xnpv(flows: readonly CashFlow[], rate: string, rounding: 'half-even' | 'half-up' | 'floor' | 'ceil' | 'trunc' = 'half-even'): bigint {
  const prepared = prepare(flows);
  const r = parseSignedRate(rate);
  if (r <= -SCALE) throw new RangeError('The rate must be above -100%');
  return divideRounded(npvAtLog(prepared, ln(SCALE + r)), SCALE, rounding);
}

/** The XIRR of dated cash flows, or null when they have no rate (all one sign, or no root in range). */
export function xirr(flows: readonly CashFlow[], options: XirrOptions = {}): XirrResult | null {
  const digits = options.digits ?? 8;
  if (!Number.isInteger(digits) || digits < 2 || digits > 12) throw new RangeError('digits must be a whole number from 2 to 12');
  const prepared = prepare(flows);
  if (!prepared.some((f) => f.amount > 0n) || !prepared.some((f) => f.amount < 0n)) return null;
  const at = (r: bigint) => sign(npvAtLog(prepared, ln(SCALE + r)));
  // Bracket: from -99.9999% up, doubling the upper end from 100% to at most 2^20 (about 10^8 %).
  let lo = -SCALE + SCALE / 1_000_000n;
  let hi = SCALE;
  const sLo = at(lo);
  if (sLo === 0) return result(lo, digits, 0);
  let sHi = at(hi);
  let iterations = 0;
  while (sHi === sLo && hi < SCALE << 20n) {
    lo = hi;
    hi *= 2n;
    sHi = at(hi);
    iterations += 1;
  }
  if (sHi === 0) return result(hi, digits, iterations);
  if (sHi === sLo) return null;
  const width = SCALE / 10n ** BigInt(digits + 2);
  while (hi - lo > width) {
    const mid = (lo + hi) / 2n;
    const s = at(mid);
    iterations += 1;
    if (s === 0) return result(mid, digits, iterations);
    if (s === sLo) lo = mid; else hi = mid;
  }
  return result((lo + hi) / 2n, digits, iterations);
}

function result(rate: bigint, digits: number, iterations: number): XirrResult {
  const denominator = 10n ** BigInt(digits);
  const numerator = divideRounded(rate * denominator, SCALE, 'half-even');
  return { rate: decimal(numerator, digits), percent: decimal(numerator, digits - 2), numerator, denominator, iterations };
}
