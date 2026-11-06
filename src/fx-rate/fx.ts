/**
 * Exact foreign-exchange arithmetic. A rate is a decimal STRING ("133.40"), never a float; conversion is bigint
 * minor units scaled by the rate's decimal places and rounded once with an explicit mode. No React, no Date maths.
 */
import { divideRounded, parseRate, type ExactRate, type RoundingMode } from '../calculations/rounding.ts';
import { currencyExponent, money, type CurrencyCode, type Money } from '../money/money.ts';

/** Which side of the spread a rate is: mid-market, the price the provider buys at, or sells at. */
export type FxRateKind = 'mid' | 'buy' | 'sell';

/**
 * One exchange rate: 1 `base` = `rate` `quote`.
 * @stability beta
 */
export interface FxRate {
  /** The currency being priced: 1 unit of this. */
  base: CurrencyCode;
  /** The currency the price is in. */
  quote: CurrencyCode;
  /** Exact decimal string, greater than zero, at most 18 decimals ("133.40", "0.0075"). Never a number. */
  rate: string;
  /** When the rate was quoted: a Date or an ISO 8601 string. */
  asOf: Date | string;
  /** Who quoted it ("Nepal Rastra Bank"). */
  source?: string;
  /** mid (default), buy or sell. */
  kind?: FxRateKind;
}

/** True for a positive decimal such as "133.40" or "0.0075" (digits, optional fraction up to 18 places, not zero). */
export function isValidFxRate(rate: string): boolean {
  try {
    return parseFxRate(rate).numerator > 0n;
  } catch {
    return false;
  }
}

/**
 * Parses a decimal rate string into an exact fraction. Throws a TypeError for a float-like, signed, exponent,
 * grouped or empty string, and a RangeError for zero.
 * @stability beta
 */
export function parseFxRate(rate: string): ExactRate {
  if (typeof rate !== 'string') throw new TypeError('An FX rate is a decimal string, not a number');
  const exact = parseRate(rate);
  if (exact.numerator === 0n) throw new RangeError('An FX rate must be greater than zero');
  return exact;
}

/**
 * Converts `amount` from the rate's base currency to its quote currency, in bigint only: the minor-unit scale of
 * each currency (JPY 0, USD 2, KWD 3) and the rate's decimal places go into one numerator and denominator, which
 * `divideRounded` rounds once with `rounding`. Throws a TypeError when `amount` is not in `rate.base`.
 * @stability beta
 */
export function convertMoney(amount: Money, rate: FxRate, rounding: RoundingMode): Money {
  if (amount.currency.toUpperCase() !== rate.base.toUpperCase()) {
    throw new TypeError(`Cannot convert ${amount.currency} with a ${rate.base}/${rate.quote} rate`);
  }
  const { numerator, denominator } = parseFxRate(rate.rate);
  const from = 10n ** BigInt(currencyExponent(rate.base));
  const to = 10n ** BigInt(currencyExponent(rate.quote));
  return money(divideRounded(amount.minor * numerator * to, denominator * from, rounding), rate.quote);
}

/**
 * The reciprocal rate as a decimal string with exactly `places` fraction digits (default 6), rounded once.
 * Throws a RangeError when the result would round to zero.
 * @stability beta
 */
export function invertRate(rate: string, places = 6, rounding: RoundingMode = 'half-even'): string {
  if (!Number.isInteger(places) || places < 0 || places > 18) throw new RangeError('places must be an integer from 0 to 18');
  const { numerator, denominator } = parseFxRate(rate);
  const scaled = divideRounded(denominator * 10n ** BigInt(places), numerator, rounding);
  if (scaled === 0n) throw new RangeError('The inverse rate rounds to zero at this precision');
  const digits = scaled.toString().padStart(places + 1, '0');
  return places === 0 ? digits : `${digits.slice(0, -places)}.${digits.slice(-places)}`;
}

/** The same quote seen from the other side: base and quote swap, buy and sell swap, the rate is inverted. */
export function invertFxRate(rate: FxRate, places = 6, rounding: RoundingMode = 'half-even'): FxRate {
  const kind = rate.kind === 'buy' ? 'sell' : rate.kind === 'sell' ? 'buy' : rate.kind;
  return { ...rate, base: rate.quote, quote: rate.base, rate: invertRate(rate.rate, places, rounding), ...(kind ? { kind } : {}) };
}

/**
 * Rate text for display, exact (no rounding): at least `minFraction` fraction digits (default 2, zeros padded),
 * trailing zeros beyond that dropped, integer part grouped and digits localised by `locale`.
 * @stability beta
 */
export function formatFxRate(rate: string, locale = 'en', minFraction = 2): string {
  parseFxRate(rate);
  const [whole = '0', fraction = ''] = rate.split('.');
  let trimmed = fraction.replace(/0+$/, '');
  if (trimmed.length < minFraction) trimmed = trimmed.padEnd(minFraction, '0');
  const format = new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 0 });
  const parts = new Intl.NumberFormat(locale, { minimumFractionDigits: 1 }).formatToParts(1.1);
  const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.';
  const digits = new Intl.NumberFormat(locale, { useGrouping: false });
  const integer = format.format(BigInt(whole));
  if (!trimmed) return integer;
  return `${integer}${decimal}${trimmed.replace(/\d/g, (digit) => digits.format(BigInt(digit)))}`;
}
