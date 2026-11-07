/**
 * Exact decimal helpers for the fundamentals charts (FairValueBar, PriceTargetChart): a price is a decimal string
 * ("1234.50") or a `Money` (bigint minor units), held as a bigint and a scale, so sums, gaps and percentages never touch
 * a float. Plot coordinates may use `Number`; every printed or spoken figure comes from the bigint. Not exported.
 */
import { currencyExponent, type Money } from '../money/money.ts';

/** A price: a decimal string such as "1234.50" (it takes the chart's `currency`), or exact `Money`. */
export type PriceInput = string | Money;

export interface Scaled {
  n: bigint;
  /** Digits after the decimal point. */
  scale: number;
}

const DECIMAL = /^([+-]?)(\d+)(?:\.(\d+))?$/;
const pow10 = (k: number): bigint => 10n ** BigInt(k);

/** Parses "1234.50" / "-0.005" exactly; null for anything else (exponent forms, separators, empty, NaN). */
export function parseDecimal(text: string): Scaled | null {
  const m = DECIMAL.exec(text.trim());
  if (!m) return null;
  const frac = m[3] ?? '';
  const n = BigInt(`${m[2]}${frac}`);
  return { n: m[1] === '-' ? -n : n, scale: frac.length };
}

/** A price as a bigint and a scale; null when a string does not parse. */
export function scaledOf(value: PriceInput | null | undefined): Scaled | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return parseDecimal(value);
  if (typeof value.minor !== 'bigint') return null;
  return { n: value.minor, scale: currencyExponent(value.currency) };
}

/** The currency of the Money values given, or `fallback`; a TypeError when they disagree. */
export function currencyOf(values: readonly (PriceInput | null | undefined)[], fallback: string): string {
  let found: string | undefined;
  for (const v of values) {
    if (v === null || v === undefined || typeof v === 'string') continue;
    const code = v.currency.toUpperCase();
    if (found && found !== code) throw new TypeError(`Cannot chart ${found} and ${code} together: convert first`);
    found = code;
  }
  return (found ?? fallback).toUpperCase();
}

/** Brings values to one scale (the largest), exactly. */
export function alignScale(values: readonly Scaled[]): { units: bigint[]; scale: number } {
  const scale = Math.max(0, ...values.map((v) => v.scale));
  return { units: values.map((v) => v.n * pow10(scale - v.scale)), scale };
}

/** a / b rounded half away from zero; b must not be zero. */
export function divRound(a: bigint, b: bigint): bigint {
  const neg = a < 0n !== b < 0n;
  const x = a < 0n ? -a : a;
  const y = b < 0n ? -b : b;
  const q = (2n * x + y) / (2n * y);
  return neg ? -q : q;
}

/** A plot coordinate. Display only. */
export const plotValue = (n: bigint, scale: number): number => Number(n) / 10 ** scale;

export interface DecimalText {
  /** "NPR 1,234.50" (a true minus before the code when negative). */
  plain: (n: bigint, scale: number) => string;
  /** "1,234.50" without the currency, for tight labels. */
  bare: (n: bigint, scale: number) => string;
  /** "+NPR 1,234.50" or "−NPR 1,234.50". */
  signed: (n: bigint, scale: number) => string;
  /** A number for an axis tick: display-rounded, no exactness claim. */
  tick: (v: number, scale: number) => string;
}

/** Prints a bigint at a scale with at least the currency's own digits, grouping from the locale, a true minus. */
export function decimalText(currency: string, locale = 'en-IN'): DecimalText {
  const exp = currencyExponent(currency);
  const ints = new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 0 });
  const point = new Intl.NumberFormat(locale, { minimumFractionDigits: 1 }).formatToParts(1.1).find((p) => p.type === 'decimal')?.value ?? '.';
  const bare = (n: bigint, scale: number) => {
    const neg = n < 0n;
    const a = neg ? -n : n;
    const div = pow10(scale);
    let frac = scale > 0 ? (a % div).toString().padStart(scale, '0') : '';
    while (frac.length > exp && frac.endsWith('0')) frac = frac.slice(0, -1);
    frac = frac.padEnd(exp, '0');
    return `${neg ? '−' : ''}${ints.format(a / div)}${frac ? point + frac : ''}`;
  };
  const plain = (n: bigint, scale: number) => `${n < 0n ? '−' : ''}${currency} ${bare(n < 0n ? -n : n, scale)}`;
  return {
    bare,
    plain,
    signed: (n, scale) => (n > 0n ? `+${plain(n, scale)}` : plain(n, scale)),
    tick: (v, scale) => new Intl.NumberFormat(locale, { maximumFractionDigits: Math.min(scale, 4) }).format(v),
  };
}

/** (a - b) / b as tenths of a percent, rounded half away from zero; null when b is zero. Both must share a scale. */
export function gapTenths(a: bigint, b: bigint): bigint | null {
  return b === 0n ? null : divRound((a - b) * 1000n, b);
}

/** "+23.4%", "−5%", "0%" from tenths of a percent (a trailing ".0" is dropped). */
export function percentText(tenths: bigint, options: { sign?: boolean } = {}): string {
  const neg = tenths < 0n;
  const a = neg ? -tenths : tenths;
  const body = `${a / 10n}${a % 10n === 0n ? '' : `.${a % 10n}`}%`;
  return neg ? `−${body}` : options.sign !== false && tenths > 0n ? `+${body}` : body;
}

/** A threshold in percent (20, 12.5) as thousandths of a percent, an integer. */
export const milliPercent = (pct: number): bigint => BigInt(Math.round(pct * 1000));

/** (a - b) / b is at or below -t percent (t in thousandths of a percent). b > 0, same scale. Exact. */
export const gapAtMost = (a: bigint, b: bigint, negMilli: bigint): boolean => (a - b) * 100000n <= negMilli * b;
/** (a - b) / b is at or above t percent (t in thousandths of a percent). b > 0, same scale. Exact. */
export const gapAtLeast = (a: bigint, b: bigint, milli: bigint): boolean => (a - b) * 100000n >= milli * b;
