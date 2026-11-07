/**
 * Exact arithmetic the statement charts (SankeyChart, EarningsChart, BalanceHistoryChart) share: decimal strings as
 * scaled bigints, and ratios rounded once, at the point they are printed. Not exported from the package.
 */

const DECIMAL = /^([+-]?)(\d+)(?:\.(\d+))?$/;

export interface ScaledDecimal {
  /** The value times 10^scale. */
  units: bigint;
  scale: number;
}

/** "12.34" as { units: 1234n, scale: 2 }; null when it is not a plain decimal ("1e3", "", "1,5", NaN). */
export function parseDecimal(text: string): ScaledDecimal | null {
  const m = DECIMAL.exec(text.trim());
  if (!m) return null;
  const frac = m[3] ?? '';
  const units = BigInt(`${m[2]}${frac}`);
  return { units: m[1] === '-' ? -units : units, scale: frac.length };
}

export const pow10 = (n: number): bigint => 10n ** BigInt(n);

/** The same value at a larger scale. */
export const rescale = (d: ScaledDecimal, scale: number): bigint => d.units * pow10(scale - d.scale);

/** Integer division rounding half away from zero. */
export function divRound(n: bigint, d: bigint): bigint {
  if (d < 0n) return divRound(-n, -d);
  const neg = n < 0n;
  const a = neg ? -n : n;
  const q = (2n * a + d) / (2n * d);
  return neg ? -q : q;
}

function place(q: bigint, digits: number): string {
  const neg = q < 0n;
  const s = (neg ? -q : q).toString().padStart(digits + 1, '0');
  const cut = s.length - digits;
  return `${neg ? '-' : ''}${s.slice(0, cut)}${digits > 0 ? `.${s.slice(cut)}` : ''}`;
}

/** `n / d` as a decimal string with `digits` places, rounded half away from zero ("0.62", "-1.5"). d must not be 0. */
export const ratioText = (n: bigint, d: bigint, digits: number): string => place(divRound(n * pow10(digits), d), digits);

/** `n / d` as a percentage ("54.3"). d must not be 0. */
export const percentText = (n: bigint, d: bigint, digits = 1): string => ratioText(n * 100n, d, digits);

/** The value of n/d as a number, for a pixel coordinate only (the quotient is taken in bigint first, to 6 places). */
export const ratioNumber = (n: bigint, d: bigint): number => (d === 0n ? 0 : Number((n * 1_000_000n) / d) / 1_000_000);

/** `units / 10^scale` as an exact decimal string ("-0.05"), at least `minDigits` places. */
export function decimalText(units: bigint, scale: number, minDigits = 0): string {
  const digits = Math.max(scale, minDigits);
  return place(units * pow10(digits - scale), digits);
}
