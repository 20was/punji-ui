/**
 * table-core: one column model (`ColumnDef<Row>`) for every Punji table, and the
 * pure arithmetic tables need: bigint-safe sorting, per-group subtotals, footer
 * totals and the reconciliation of a computed total against an expected one.
 *
 * Money stays exact: it is compared and summed as bigint minor units, never as a
 * formatted string or a float, and a sum or comparison across two currencies
 * throws `MixedCurrencyError` (there is no implicit conversion).
 *
 * No React, no DOM: usable on a server, in a worker or in a test. `header` and
 * `cell` are typed by the `Node` parameter so the React components can use
 * ReactNode without this module importing React.
 */
import type { Money } from '../money/money.ts';
// Aggregates, grouping and reconciliation live in ./tableAggregate.ts, so a table that does not total pays nothing for them.

/** What a column holds. Numeric kinds (money, quantity, price, percent) align to the end with tabular figures. @stability beta */
export type ColumnKind = 'text' | 'money' | 'quantity' | 'price' | 'percent' | 'date' | 'custom';

/** A cell's raw value, as the accessor returns it. Money is `{ minor: bigint, currency }`. @stability beta */
export type CellValue = Money | bigint | number | string | Date | boolean | null | undefined;

/** What a column sorts by. bigint and number compare by value (never as text). @stability beta */
export type SortKey = bigint | number | string | null | undefined;

/** A named aggregate. `sum` is exact for Money and bigint; `count` counts values that are present. @stability beta */
export type AggregateName = 'sum' | 'count' | 'min' | 'max';
/** A custom aggregate over a column's present values (and the rows they came from). @stability beta */
export type AggregateFn<Row> = (values: readonly CellValue[], rows: readonly Row[]) => CellValue;
/** @stability beta */
export type ColumnAggregate<Row> = AggregateName | AggregateFn<Row>;

/** The responsive widths a column folds away under. 760 is the old `wide`. @stability beta */
export type HideUnder = 760 | 1024 | 1256;

/**
 * One column, for every table. Only `id` and `header` are required; give an
 * `accessor` to sort, total and export by value, and a `cell` to draw it.
 * @stability beta
 */
export interface ColumnDef<Row, Node = unknown> {
  /** Stable id: the sort key, the totals key and the React key. */
  id: string;
  /** The column head. */
  header: Node;
  /** The raw value: Money, bigint, number, string or Date. Used to sort and aggregate; never a formatted string for figures. */
  accessor?: (row: Row) => CellValue;
  /** Draws a row's cell. Without it a UI prints the accessor's value plainly. */
  cell?: (row: Row) => Node;
  /** What the column holds. Default 'text' ('custom' when adapted from a legacy numeric column). */
  kind?: ColumnKind;
  /** Overrides the alignment the kind gives. */
  align?: 'start' | 'end';
  /** Shows a sort control. */
  sortable?: boolean;
  /** What to sort by instead of the accessor's value. Money sorts by currency, then exact minor units. */
  sortKey?: (row: Row) => SortKey;
  /** How group subtotals and the footer total this column. */
  aggregate?: ColumnAggregate<Row>;
  /** Draws an aggregate value (a subtotal or the footer total). */
  formatAggregate?: (value: CellValue, rows: readonly Row[]) => Node;
  /** Folds the column away under this viewport width. */
  hideUnder?: HideUnder;
  /** Keeps the column in view while the table scrolls sideways (virtual table). */
  pin?: 'left' | 'right';
  /** The cell is the row's header (th scope="row"). */
  rowHeader?: boolean;
  /** Starting width in px (virtual table). */
  width?: number;
}

const NUMERIC: ReadonlySet<ColumnKind> = new Set(['money', 'quantity', 'price', 'percent']);

/** True for money, quantity, price and percent. @stability beta */
export function isNumericKind(kind: ColumnKind | undefined): boolean {
  return kind !== undefined && NUMERIC.has(kind);
}

/** The column's alignment: its `align`, else 'end' for numeric kinds and 'start' otherwise. @stability beta */
export function columnAlign(column: Pick<ColumnDef<never>, 'align' | 'kind'>): 'start' | 'end' {
  return column.align ?? (isNumericKind(column.kind) ? 'end' : 'start');
}

export function isMoneyValue(value: unknown): value is Money {
  return typeof value === 'object' && value !== null && typeof (value as Money).minor === 'bigint' && typeof (value as Money).currency === 'string';
}

/** True for null, undefined and NaN: the values sorts put last and aggregates skip. @stability beta */
export function isMissing(value: unknown): value is null | undefined {
  return value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value));
}

export const code = (m: Money) => m.currency.toUpperCase();

/**
 * Compares two present cell values. Money compares by currency code, then exact
 * minor units (so a mixed-currency column sorts into currency blocks, never by
 * mixing amounts). bigint and number compare by value; Dates by time; strings by
 * code unit. Values of unrelated types compare by type name, so the order is total.
 * @stability beta
 */
export function compareValues(x: Exclude<CellValue, null | undefined>, y: Exclude<CellValue, null | undefined>): number {
  if (isMoneyValue(x) && isMoneyValue(y)) {
    const a = code(x);
    const b = code(y);
    if (a !== b) return a < b ? -1 : 1;
    return x.minor < y.minor ? -1 : x.minor > y.minor ? 1 : 0;
  }
  const a = x instanceof Date ? x.getTime() : typeof x === 'boolean' ? Number(x) : x;
  const b = y instanceof Date ? y.getTime() : typeof y === 'boolean' ? Number(y) : y;
  const numA = typeof a === 'number' || typeof a === 'bigint';
  const numB = typeof b === 'number' || typeof b === 'bigint';
  // bigint and number compare exactly with < and > (no Number() conversion of the bigint).
  if (numA && numB) return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  const ta = isMoneyValue(a) ? 'money' : typeof a;
  const tb = isMoneyValue(b) ? 'money' : typeof b;
  return ta < tb ? -1 : ta > tb ? 1 : 0;
}

/** The value a row sorts by in this column: `sortKey`, else the accessor's value. @stability beta */
export function sortValueOf<Row>(column: Pick<ColumnDef<Row>, 'sortKey' | 'accessor'>, row: Row): CellValue {
  return column.sortKey ? column.sortKey(row) : column.accessor?.(row);
}

/** One level of a sort; the same shape as the virtual table's `SortRule`. @stability beta */
export interface ColumnSortRule {
  key: string;
  dir: 'asc' | 'desc';
}

/** A comparator over rows from sort rules and the columns' values. Missing values sort last in either direction. Stable with Array#sort. @stability beta */
export function compareRowsBy<Row>(columns: readonly ColumnDef<Row, unknown>[], rules: readonly ColumnSortRule[]): (a: Row, b: Row) => number {
  const byId = new Map(columns.map((c) => [c.id, c]));
  return (a, b) => {
    for (const rule of rules) {
      const column = byId.get(rule.key);
      if (!column) continue;
      const x = sortValueOf(column, a);
      const y = sortValueOf(column, b);
      const xm = isMissing(x);
      const ym = isMissing(y);
      if (xm || ym) {
        if (xm && ym) continue;
        return xm ? 1 : -1;
      }
      const order = compareValues(x, y);
      if (order !== 0) return rule.dir === 'asc' ? order : -order;
    }
    return 0;
  };
}

/** A sorted copy of `rows` (stable). @stability beta */
export function sortRows<Row>(rows: readonly Row[], columns: readonly ColumnDef<Row, unknown>[], rules: readonly ColumnSortRule[]): Row[] {
  return rows.toSorted(compareRowsBy(columns, rules));
}

const exponents = new Map<string, number>();
function exponentOf(currency: string): number {
  let e = exponents.get(currency);
  if (e === undefined) {
    try {
      e = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
    } catch {
      e = 2;
    }
    exponents.set(currency, e);
  }
  return e;
}

/**
 * A plain, exact, locale-free rendering of a value: Money as "NPR 1234.50"
 * (bigint digits, the currency's exponent), bigint and number as digits, a Date
 * as YYYY-MM-DD (UTC). The tables' fallback for aggregates without
 * `formatAggregate`; pass a formatter for the reader's locale.
 * @stability beta
 */
export function plainValue(value: CellValue): string {
  if (isMissing(value)) return '';
  if (isMoneyValue(value)) {
    const e = exponentOf(code(value));
    const negative = value.minor < 0n;
    const digits = (negative ? -value.minor : value.minor).toString().padStart(e + 1, '0');
    const whole = e ? `${digits.slice(0, -e)}.${digits.slice(-e)}` : digits;
    return `${code(value)} ${negative ? '-' : ''}${whole}`;
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  return String(value);
}

/** The shape of a DataTable `Column<K>`, structurally (this module does not import React). @stability beta */
export interface ColumnLike<Node = unknown> {
  key: string;
  label: Node;
  num?: boolean | undefined;
  wide?: boolean | undefined;
  sortable?: boolean | undefined;
  hideUnder?: 1024 | 1256 | undefined;
}

/** The shape of a `FinancialColumn<T>` (and `VirtualColumn<T>`), structurally. @stability beta */
export interface FinancialColumnLike<Row, Node = unknown> extends ColumnLike<Node> {
  render: (row: Row) => Node;
  rowHeader?: boolean | undefined;
  kind?: ColumnKind | undefined;
  value?: ((row: Row) => CellValue) | undefined;
  aggregate?: ColumnAggregate<Row> | undefined;
  formatAggregate?: ((value: CellValue, rows: readonly Row[]) => Node) | undefined;
  pin?: 'left' | 'right' | undefined;
  width?: number | undefined;
}

// A legacy `num` column without a kind keeps its end alignment (kind 'custom'); `num: false` forces start.
const legacyAlign = (num: boolean | undefined): 'start' | 'end' | undefined => (num === undefined ? undefined : num ? 'end' : 'start');

/** Maps a DataTable `Column<K>` onto a `ColumnDef`. `wide` becomes `hideUnder: 760`. @stability beta */
export function fromColumn<Row = unknown, Node = unknown>(column: ColumnLike<Node>): ColumnDef<Row, Node> {
  return {
    id: column.key,
    header: column.label,
    kind: column.num ? 'custom' : 'text',
    align: legacyAlign(column.num),
    sortable: column.sortable,
    hideUnder: column.wide ? 760 : column.hideUnder,
  };
}

/**
 * The inverse of `fromFinancialColumn`: a `ColumnDef` as a `FinancialColumn` /
 * `VirtualColumn` (`id` is the key, `header` the label, `cell` or the plain
 * accessor value the render). For feeding column presets to a table.
 * @stability beta
 */
export function toFinancialColumn<Row, Node = unknown>(def: ColumnDef<Row, Node>): FinancialColumnLike<Row, Node | string> {
  return {
    key: def.id,
    label: def.header,
    render: def.cell ?? ((row: Row) => plainValue(def.accessor?.(row))),
    num: def.align === undefined ? undefined : def.align === 'end',
    sortable: def.sortable,
    hideUnder: def.hideUnder === 760 ? undefined : def.hideUnder,
    wide: def.hideUnder === 760 ? true : undefined,
    rowHeader: def.rowHeader,
    kind: def.kind,
    value: def.accessor,
    aggregate: def.aggregate,
    formatAggregate: def.formatAggregate,
    pin: def.pin,
    width: def.width,
  };
}

/** `toFinancialColumn` over a list. @stability beta */
export function toFinancialColumns<Row, Node = unknown>(defs: readonly ColumnDef<Row, Node>[]): FinancialColumnLike<Row, Node | string>[] {
  return defs.map((def) => toFinancialColumn(def));
}

/** Maps a `FinancialColumn<T>` (or `VirtualColumn<T>`) onto a `ColumnDef`: `render` becomes `cell`, `value` the accessor. A `kind` sets the alignment unless `num` is given. @stability beta */
export function fromFinancialColumn<Row, Node = unknown>(column: FinancialColumnLike<Row, Node>): ColumnDef<Row, Node> {
  return {
    ...fromColumn<Row, Node>(column),
    kind: column.kind ?? (column.num ? 'custom' : 'text'),
    cell: column.render,
    accessor: column.value,
    aggregate: column.aggregate,
    formatAggregate: column.formatAggregate,
    rowHeader: column.rowHeader,
    pin: column.pin,
    width: column.width,
  };
}
