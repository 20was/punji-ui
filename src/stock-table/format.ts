import { createMoneyFormatter, nepalMoneyPreset, type MoneyFormatConfig } from '../money/money.ts';

/** Prices as numbers only, no currency mark (the caption or a header names NPR once). */
export const nepalQuoteMoney: MoneyFormatConfig = Object.freeze({ ...nepalMoneyPreset, display: 'none' });

/** A share count shortened for a narrow column: exact below a lakh (or a thousand outside South Asia), then 1.2 L, 3.4 Cr. Display only. */
export function compactCount(count: number | null | undefined, config: MoneyFormatConfig = nepalQuoteMoney): string | null {
  if (count === null || count === undefined || !Number.isFinite(count)) return null;
  const formatter = createMoneyFormatter({ ...config, display: 'none' });
  const whole = Math.round(count);
  if (Math.abs(whole) < (formatter.southAsian ? 1e5 : 1e3)) return new Intl.NumberFormat(formatter.locale, { maximumFractionDigits: 0 }).format(whole);
  return formatter.formatCompact(BigInt(whole) * 10n ** BigInt(formatter.exponent), { fractionDigits: 2 });
}
