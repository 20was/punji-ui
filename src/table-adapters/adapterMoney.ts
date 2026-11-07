/**
 * Shared by the optional table adapters (`@punji/ui/tanstack-table`, `/ag-grid`,
 * `/mui-x-grid`). Internal: not a public subpath. No React, no DOM, no third-party import.
 *
 * Money is formatted from its bigint minor units and compared as bigint, never via Number.
 */
import { getMoneyFormatter, isMoney } from '../money/money.ts';
import type { MoneyFormatConfig } from '../money/money.ts';
import { compareValues, isMissing, plainValue } from '../table-core/tableCore.ts';
import type { CellValue } from '../table-core/tableCore.ts';

/** How an adapter prints money: any `MoneyFormatConfig` field; `currency` is only needed to print bare bigint minor units (Money carries its own). */
export type AdapterMoneyConfig = Omit<MoneyFormatConfig, 'currency'> & { currency?: string };

/** Exact text for a cell value. Money and (with `config.currency`) bigint minor units print through the money formatter; everything else prints plainly. Missing is ''. */
export function formatCellValue(value: unknown, config: AdapterMoneyConfig = {}): string {
  if (isMissing(value)) return '';
  if (isMoney(value)) return getMoneyFormatter({ ...config, currency: value.currency }).format(value.minor);
  if (typeof value === 'bigint' && config.currency) return getMoneyFormatter({ ...config, currency: config.currency }).format(value);
  return plainValue(value as CellValue);
}

/** Ascending order of two cell values: Money by currency then exact minor units, bigint and number by value. Missing (null, undefined, NaN) is the smallest. */
export function compareCellValues(a: unknown, b: unknown): number {
  const am = isMissing(a);
  const bm = isMissing(b);
  if (am || bm) return am && bm ? 0 : am ? -1 : 1;
  return compareValues(a as Exclude<CellValue, null | undefined>, b as Exclude<CellValue, null | undefined>);
}
