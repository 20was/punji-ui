/**
 * Shared by the optional canvas chart adapters. Internal: not a public subpath. No React, no third-party import.
 *
 * Canvas libraries plot JavaScript numbers. The adapters plot a price as its integer count of minor units (paisa,
 * cents) and print it by turning that count back into a bigint and formatting it with the exact money formatter.
 * A bigint you pass in prints exactly at any size; a number a library hands back is exact up to 2^53 minor units.
 * The hidden data table and the spoken text always come from your original bigints, never from the plotted numbers.
 */
import { getMoneyFormatter } from '../money/money.ts';
import type { MoneyCompactOptions, MoneyFormatConfig } from '../money/money.ts';

/** How the adapters print a price: any `MoneyFormatConfig`, the currency being required. */
export type ChartMoneyConfig = MoneyFormatConfig;

/** A price formatter a chart library calls: takes a plotted number (minor units) or a bigint and returns exact text. */
export type ChartMoneyFormatter = (value: number | bigint) => string;

/** The number a canvas library plots for an amount: its integer minor units. Lossy only past 2^53. */
export function minorToChartNumber(minor: bigint): number {
  return Number(minor);
}

/** True when `minor` survives being plotted as a number (|minor| <= 2^53 - 1). */
export function isPlottableExactly(minor: bigint): boolean {
  return minor >= BigInt(Number.MIN_SAFE_INTEGER) && minor <= BigInt(Number.MAX_SAFE_INTEGER);
}

/** The minor units a plotted number stands for: rounded to the nearest whole unit. Throws on NaN or Infinity. */
export function chartNumberToMinor(value: number): bigint {
  if (!Number.isFinite(value)) throw new RangeError('A plotted price must be a finite number');
  return BigInt(Math.round(value));
}

/**
 * Exact text for a plotted price. `compact` shortens for an axis (lakh and crore for South Asian grouping, K/M/B
 * otherwise): display-rounded, so keep it off tooltips. A value that is not finite prints as an empty string.
 */
export function createMoneyChartFormatter(config: ChartMoneyConfig, options: { compact?: boolean; compactOptions?: MoneyCompactOptions } = {}): ChartMoneyFormatter {
  const formatter = getMoneyFormatter(config);
  return (value) => {
    if (typeof value === 'number' && !Number.isFinite(value)) return '';
    const minor = typeof value === 'bigint' ? value : chartNumberToMinor(value);
    return options.compact ? formatter.formatCompact(minor, options.compactOptions) : formatter.format(minor);
  };
}

/** The words for an amount that a screen reader reads (full currency name, no accounting parentheses). */
export function createMoneySpokenFormatter(config: ChartMoneyConfig): (minor: bigint) => string {
  const formatter = getMoneyFormatter(config);
  return (minor) => formatter.formatSpoken(minor);
}
