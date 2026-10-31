/**
 * Exact integer arithmetic for money held as minor units (bigint). Every
 * operation that can produce a fraction takes an explicit rounding mode, so no
 * value is ever rounded without the caller choosing how.
 */
export type RoundingMode = 'half-even' | 'half-up' | 'floor' | 'ceil' | 'trunc';

/** `numerator / denominator` rounded to an integer with the given mode. `half-up` rounds ties away from zero. */
export function divideRounded(numerator: bigint, denominator: bigint, mode: RoundingMode): bigint {
  if (denominator === 0n) throw new RangeError('Division by zero');
  if (denominator < 0n) { numerator = -numerator; denominator = -denominator; }
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder === 0n) return quotient;
  const step = remainder < 0n ? -1n : 1n;
  const twice = (remainder < 0n ? -remainder : remainder) * 2n;
  switch (mode) {
    case 'trunc': return quotient;
    case 'floor': return remainder < 0n ? quotient - 1n : quotient;
    case 'ceil': return remainder > 0n ? quotient + 1n : quotient;
    case 'half-up': return twice >= denominator ? quotient + step : quotient;
    case 'half-even':
      if (twice > denominator) return quotient + step;
      if (twice < denominator) return quotient;
      return quotient % 2n === 0n ? quotient : quotient + step;
    default: throw new RangeError(`Unknown rounding mode: ${String(mode)}`);
  }
}

/** An exact non-negative rate parsed from a decimal fraction string: '0.075' is 7.5%. */
export interface ExactRate { readonly numerator: bigint; readonly denominator: bigint }

/** Parse a decimal fraction ('0.00015', '1', '0.075') without passing it through Number. */
export function parseRate(rate: string): ExactRate {
  if (rate.length > 40 || !/^\d+(?:\.\d{1,18})?$/.test(rate)) throw new TypeError('Expected a non-negative decimal fraction such as "0.075"');
  const [whole, fraction = ''] = rate.split('.');
  const denominator = 10n ** BigInt(fraction.length);
  return { numerator: BigInt(whole!) * denominator + BigInt(fraction || '0'), denominator };
}

/** `amount × rate`, rounded. `rate` is a decimal fraction string, e.g. '0.0027' for 0.27%. */
export function applyRate(amount: bigint, rate: string | ExactRate, mode: RoundingMode): bigint {
  const { numerator, denominator } = typeof rate === 'string' ? parseRate(rate) : rate;
  return divideRounded(amount * numerator, denominator, mode);
}
