/**
 * PriceChange: the move between two prices as an absolute amount and a percent.
 * Direction is carried by the sign, an arrow shape and a spoken word, never by
 * colour alone. Colour follows a convention: green up (default) or red up, the
 * custom of some markets. The absolute change stays exact (bigint minor units);
 * the percent is display-only, from `percentageChange`.
 */
import type { Ref } from 'react';

import { priceChange, type Change } from '../calculations/ratios.ts';
import { resolveMoneyConfig, type MoneyDisplayOptions, type MoneySource } from '../money-display/MoneyDisplay.tsx';
import { getMoneyFormatter } from '../money/money.ts';

export interface PriceChangeLabels { up: string; down: string; flat: string }
const EN_LABELS: PriceChangeLabels = { up: 'up', down: 'down', flat: 'unchanged' };

export interface PriceChangeOptions extends Omit<MoneyDisplayOptions, 'value' | 'compact' | 'ref' | 'accounting' | 'signDisplay'> {
  /** Latest and previous price, in minor units. Use these, or `change`. */
  current?: bigint | null;
  previous?: bigint | null;
  /** A change you already computed (for example from `priceChange`). */
  change?: Change<bigint> | null;
  showAbsolute?: boolean;
  showPercent?: boolean;
  /** Fraction digits of the percent. Default 2. */
  percentDigits?: number;
  /** Which colour means up. 'green-up' (default) or 'red-up'. Down is always the other one. */
  convention?: 'green-up' | 'red-up';
  /** Spoken direction words, in the reader's language. */
  labels?: PriceChangeLabels;
  /** sm: the 12px line under a price in a table row. */
  size?: 'sm';
  ref?: Ref<HTMLSpanElement>;
}

export type PriceChangeProps = PriceChangeOptions & MoneySource;

const ICONS = {
  up: <path d="M5 1.5 9 8.5H1z" />,
  down: <path d="M5 8.5 1 1.5h8z" />,
  flat: <path d="M1.5 4h7v2h-7z" />,
} as const;

export function PriceChange({
  current, previous, change, showAbsolute = true, showPercent = true, percentDigits = 2, convention = 'green-up',
  labels = EN_LABELS, size, missing = '—', missingLabel = 'No value', preset, className, testId, ref,
  currency, locale, display, numberingSystem,
}: PriceChangeProps) {
  const config = resolveMoneyConfig({ currency, locale, display: display ?? preset?.display ?? 'none', numberingSystem }, preset);
  const resolved = change ?? (current != null && previous != null ? priceChange(current, previous) : null);
  const classes = `pu-change${size === 'sm' ? ' sm' : ''}${className ? ` ${className}` : ''}`;
  if (!resolved) {
    return <span ref={ref} className={`${classes} pu-change-missing`} data-testid={testId}><span aria-hidden="true">{missing}</span><span className="kit-sr">{missingLabel}</span></span>;
  }
  if (!Number.isInteger(percentDigits) || percentDigits < 0 || percentDigits > 6) throw new RangeError('percentDigits must be 0–6');
  const tone = resolved.absolute > 0n ? 'up' : resolved.absolute < 0n ? 'down' : 'flat';
  const signed = getMoneyFormatter({ ...config, signDisplay: 'exceptZero', accounting: false });
  const bare = getMoneyFormatter({ ...config, signDisplay: 'never', accounting: false });
  const locales = config.locale ?? 'en';
  const percentOptions = { style: 'unit', unit: 'percent', minimumFractionDigits: percentDigits, maximumFractionDigits: percentDigits, ...(config.numberingSystem ? { numberingSystem: config.numberingSystem } : {}) } as const;
  const percent = showPercent && resolved.percent !== null && Number.isFinite(resolved.percent) ? resolved.percent : null;
  const visible: string[] = [];
  const spoken: string[] = [labels[tone]];
  if (showAbsolute) { visible.push(signed.format(resolved.absolute)); spoken.push(bare.formatSpoken(resolved.absolute)); }
  if (percent !== null) {
    const signedPercent = new Intl.NumberFormat(locales, { ...percentOptions, signDisplay: 'exceptZero' }).format(percent);
    const barePercent = new Intl.NumberFormat(locales, { ...percentOptions, signDisplay: 'never' }).format(percent);
    visible.push(showAbsolute ? `(${signedPercent})` : signedPercent);
    spoken.push(showAbsolute ? `(${barePercent})` : barePercent);
  }
  return (
    <span ref={ref} className={classes} data-tone={tone} data-convention={convention} lang={config.locale} data-testid={testId}>
      <svg className="pu-change-icon" viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" focusable="false">{ICONS[tone]}</svg>
      <span aria-hidden="true">{visible.join(' ')}</span>
      <span className="kit-sr">{spoken.join(' ')}</span>
    </span>
  );
}
