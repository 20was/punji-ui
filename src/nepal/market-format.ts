import type { NepalNumberOptions } from './locale.ts';
type DisplayValue = number | bigint | null | undefined;
export interface ChangeFormatOptions extends NepalNumberOptions {
  /** Percent inputs are percentage points: 1.25 means +1.25%. */
  unit?: 'number' | 'percent';
}
export interface BasisPointFormatOptions extends NepalNumberOptions {
  /** Include + for positive changes. Default false. Input is already basis points. */
  signed?: boolean;
}
export interface PriceFormatOptions extends NepalNumberOptions {
  /** Optional display label; no currency conversion or inferred precision. */
  currency?: string;
}
function print(value: DisplayValue, options: NepalNumberOptions, defaultDigits: number, signed = false): string | null {
  const dp = options.fractionDigits ?? defaultDigits;
  if (!Number.isInteger(dp) || dp < 0 || dp > 20) throw new RangeError('fractionDigits must be an integer from 0 to 20');
  if (value == null || (typeof value === 'number' && !Number.isFinite(value))) return null;
  // Intl applies signDisplay after rounding, keeping tiny changes neutral.
  // Explicit South Asian grouping avoids Chrome/Node ne-NP locale differences.
  return new Intl.NumberFormat('en-IN', {
    numberingSystem: options.digits ?? 'latn', minimumFractionDigits: dp, maximumFractionDigits: dp,
    signDisplay: 'exceptZero',
  }).formatToParts(value).map(part => part.type === 'minusSign' ? '−' : part.type === 'plusSign' && !signed ? '' : part.value).join('');
}
/** Signed display change, half-expand rounding; never recomputes a published change. */
export function formatChange(value: number | null | undefined, options: ChangeFormatOptions = {}): string {
  const text = print(value, options, 2, true);
  return text === null ? options.missing ?? '—' : `${text}${options.unit === 'percent' ? '%' : ''}`;
}
/** 25 means 25 bps (= 0.25 percentage points); this function performs no conversion. */
export function formatBasisPoints(value: number | null | undefined, options: BasisPointFormatOptions = {}): string {
  const text = print(value, options, 0, options.signed ?? false);
  return text === null ? options.missing ?? '—' : `${text} bps`;
}
/** Whole shares by default; callers opt into fractional units explicitly. */
export function formatQuantity(value: DisplayValue, options: NepalNumberOptions = {}): string {
  return print(value, options, 0) ?? options.missing ?? '—';
}
/** Price display only. Precision is not a tick-size or order-validation rule. */
export function formatPrice(value: DisplayValue, options: PriceFormatOptions = {}): string {
  const text = print(value, options, 2);
  return text === null ? options.missing ?? '—' : options.currency ? `${options.currency} ${text}` : text;
}
