/**
 * Exact annual rates in percent units for loans and deposits. '11.5' means 11.5% a year. The rate is parsed from a
 * plain decimal string and kept as a fraction of two bigints, so no figure passes through floating point.
 */

/** An annual percentage rate as an exact fraction: `numerator / denominator` percent. */
export interface PercentRate { readonly numerator: bigint; readonly denominator: bigint }

/** Parse a non-negative percent string ('11.5', '0', '8.25'). At most 3 integer digits and 6 fraction digits. Throws a TypeError otherwise. */
export function parsePercentRate(value: string): PercentRate {
  if (typeof value !== 'string' || !/^\d{1,3}(?:\.\d{1,6})?$/.test(value)) throw new TypeError(`Expected a percent such as "11.5", got ${JSON.stringify(value)}`);
  const [whole = '0', fraction = ''] = value.split('.');
  return { numerator: BigInt(whole + fraction), denominator: 10n ** BigInt(fraction.length) };
}

/** Check a whole number of months (1 to 600, fifty years). */
export function assertMonths(months: number, name = 'months'): void {
  if (!Number.isInteger(months) || months < 1 || months > 600) throw new RangeError(`${name} must be a whole number from 1 to 600`);
}
