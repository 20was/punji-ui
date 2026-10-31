// Pure CSV writer: no React, no DOM, no locale. See docs/EXPORT.md for the security boundary.

export const CSV_MIME = 'text/csv;charset=utf-8';

/** Accepted without a formatter. Everything else (Date, bigint, objects) needs `format`. */
export type CsvPrimitive = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
  header: string;
  /** Property name or function returning the cell value. */
  accessor: keyof T | ((row: T) => unknown);
  /** Required for Date, bigint and objects. Return the exact text to export. No locale is implied. */
  format?: (value: unknown, row: T) => string;
  /** Leave strict plain-number text such as "-1234.50" or "1e-7" unprefixed. Only for a
   * `format` that you know emits machine numbers (no grouping, currency or letters). */
  keepNumericText?: boolean;
}

export interface CsvOptions {
  /** Default ",". Use ";" for locales where Excel expects it. */
  delimiter?: ',' | ';' | '\t';
  /** Line breaks are CRLF (RFC 4180) by default; false uses LF. */
  crlf?: boolean;
  /** Prefix a UTF-8 byte order mark so Excel detects UTF-8. Default false. */
  bom?: boolean;
  /** Write the header row. Default true. */
  header?: boolean;
  /** Neutralise spreadsheet formula injection. Default true; false is for trusted data only. */
  neutralizeFormulas?: boolean;
}

const TRIGGER = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/** Prefix text a spreadsheet could read as a formula (leading = + - @ tab or CR) with an
 * apostrophe, per OWASP CSV-injection guidance. Idempotent only for non-triggering text.
 */
export function neutralizeFormula(text: string): string {
  return TRIGGER.test(text) ? `'${text}` : text;
}

function cellText<T>(column: CsvColumn<T>, row: T): { text: string; typedNumber: boolean } {
  const value: unknown = typeof column.accessor === 'function' ? column.accessor(row) : row[column.accessor];
  if (column.format) return { text: column.format(value, row), typedNumber: false };
  if (value === null || value === undefined) return { text: '', typedNumber: false };
  if (typeof value === 'string') return { text: value, typedNumber: false };
  if (typeof value === 'number') return Number.isFinite(value) ? { text: String(value), typedNumber: true } : { text: '', typedNumber: false };
  if (typeof value === 'boolean') return { text: value ? 'true' : 'false', typedNumber: false };
  throw new TypeError(`Column "${column.header}" needs a format function for ${value instanceof Date ? 'Date' : typeof value} values.`);
}

function quote(text: string, delimiter: string): string {
  return text.includes('"') || text.includes(delimiter) || text.includes('\n') || text.includes('\r') ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Serialise rows to RFC 4180 CSV.
 *
 * Formula safety: text cells starting with = + - @ tab or CR get a leading apostrophe.
 * Values that are typed `number` are exempt (a finite number prints only digits, "-", ".",
 * "e", "+", so negatives stay numeric); numeric-looking strings are not, unless the
 * column sets keepNumericText. Date, bigint and object values throw unless the column has
 * a `format`. Errors name the column header only, never the data.
 */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[], options: CsvOptions = {}): string {
  const { delimiter = ',', crlf = true, bom = false, header = true, neutralizeFormulas = true } = options;
  const safe = (text: string) => (neutralizeFormulas ? neutralizeFormula(text) : text);
  const lines: string[] = [];
  if (header) lines.push(columns.map((c) => quote(safe(c.header), delimiter)).join(delimiter));
  for (const row of rows) {
    lines.push(columns.map((column) => {
      const { text, typedNumber } = cellText(column, row);
      const keep = typedNumber || (column.keepNumericText === true && PLAIN_NUMBER.test(text));
      return quote(keep ? text : safe(text), delimiter);
    }).join(delimiter));
  }
  return (bom ? '﻿' : '') + lines.join(crlf ? '\r\n' : '\n');
}
