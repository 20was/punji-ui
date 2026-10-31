import type { NepalLanguage } from './locale.ts';
export interface MoneyFormatOptions {
  language?: NepalLanguage;
  digits?: 'latn' | 'deva';
  scale?: number;
  currency?: string;
  accounting?: boolean;
}
/** Reusable exact formatter. Input is always minor units, never whole currency. */
export function createFinancialFormatters(options: MoneyFormatOptions = {}) {
  const { language = 'en', digits = 'latn', scale = 2, accounting = false } = options;
  if (!Number.isInteger(scale) || scale < 0 || scale > 9) throw new RangeError('scale must be 0–9');
  const currency = options.currency ?? (language === 'ne' ? 'रु' : 'NPR');
  const integer = new Intl.NumberFormat('en-IN', { numberingSystem: digits, maximumFractionDigits: 0 });
  const fractional = new Intl.NumberFormat('en', { numberingSystem: digits, useGrouping: false, minimumIntegerDigits: Math.max(1, scale), maximumFractionDigits: 0 });
  const divisor = 10n ** BigInt(scale);
  const format = (value: bigint): string => {
    const negative = value < 0n;
    const magnitude = negative ? -value : value;
    const amount = `${integer.format(magnitude / divisor)}${scale ? `.${fractional.format(magnitude % divisor)}` : ''}`;
    const body = currency ? `${currency} ${amount}` : amount;
    return negative ? accounting ? `(${body})` : `−${body}` : body;
  };
  return Object.freeze({ formatMinorUnits: format });
}
/** For repeated rows, createFinancialFormatters reuses the same Intl instances. */
export function formatMinorUnits(value: bigint, options: MoneyFormatOptions = {}): string {
  return createFinancialFormatters(options).formatMinorUnits(value);
}
