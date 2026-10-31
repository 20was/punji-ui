/**
 * MoneyDisplay: one exact amount in any currency. Digits are tabular, the sign,
 * symbol and spacing follow the locale, and a screen reader hears the full
 * currency name when the symbol is shared ("$", "¥", "kr"). A missing value is
 * "—" with a spoken "No value", never zero.
 */
import type { Ref } from 'react';

import { getMoneyFormatter, type MoneyCompactOptions, type MoneyFormatConfig } from '../money/money.ts';
import { parseMinorUnits } from '../nepal/money.ts';

export interface MoneyDisplayProps extends Partial<MoneyFormatConfig> {
  /** Base configuration, for example `nepalMoneyConfig()`. The props above override it. */
  preset?: MoneyFormatConfig;
  /** Integer minor units (paisa, cents), or an exact decimal string in major units ('1234.50'). null/undefined show the missing mark. */
  value: bigint | string | null | undefined;
  /** Shorten for tight spaces (lakh/crore or K/M/B). Display-rounded: the exact amount stays in the spoken text and the data value. */
  compact?: boolean | MoneyCompactOptions;
  /** Printed for a missing value. Default '—'. */
  missing?: string;
  /** Spoken for a missing value. Default 'No value'. */
  missingLabel?: string;
  className?: string;
  testId?: string;
  ref?: Ref<HTMLElement>;
}

export function resolveMoneyConfig(props: Partial<MoneyFormatConfig>, preset?: MoneyFormatConfig): MoneyFormatConfig {
  const config = { ...preset } as Partial<MoneyFormatConfig>;
  for (const key of ['currency', 'locale', 'display', 'accounting', 'signDisplay', 'numberingSystem'] as const) {
    if (props[key] !== undefined) Object.assign(config, { [key]: props[key] });
  }
  if (!config.currency) throw new RangeError('Money components need a currency or a preset that has one');
  return config as MoneyFormatConfig;
}

export function MoneyDisplay({ value, compact, missing = '—', missingLabel = 'No value', preset, className, testId, ref, currency, locale, display, accounting, signDisplay, numberingSystem }: MoneyDisplayProps) {
  const config = resolveMoneyConfig({ currency, locale, display, accounting, signDisplay, numberingSystem }, preset);
  const formatter = getMoneyFormatter(config);
  let minor: bigint | null = null;
  if (typeof value === 'bigint') minor = value;
  else if (typeof value === 'string') {
    try { minor = parseMinorUnits(value.trim(), formatter.exponent); } catch { minor = null; }
  }
  const classes = className ? `pu-money ${className}` : 'pu-money';
  if (minor === null) {
    return <span ref={ref as Ref<HTMLSpanElement>} className={`${classes} pu-money-missing`} data-testid={testId}><span aria-hidden="true">{missing}</span><span className="kit-sr">{missingLabel}</span></span>;
  }
  const text = compact ? formatter.formatCompact(minor, compact === true ? undefined : compact) : formatter.format(minor);
  const spoken = formatter.formatSpoken(minor);
  const showSpoken = spoken !== text;
  return (
    <data ref={ref as Ref<HTMLDataElement>} className={classes} value={formatter.toDecimal(minor)} lang={config.locale} data-sign={minor < 0n ? 'negative' : minor > 0n ? 'positive' : 'zero'} data-testid={testId}>
      <span aria-hidden={showSpoken ? 'true' : undefined}>{text}</span>
      {showSpoken && <span className="kit-sr">{spoken}</span>}
    </data>
  );
}
