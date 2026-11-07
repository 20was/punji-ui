/**
 * TanStack Table adapter (optional): turns a table-core `ColumnDef[]` into TanStack
 * Table column defs, with cell renderers and a sorting function that keep money exact.
 *
 * It imports nothing from `@tanstack/react-table`: the defs it returns are plain
 * objects that match the v9 column def (`id`, `accessorFn`, `header`, `cell`, `sortFn`,
 * `sortUndefined`, `meta`). `@tanstack/react-table` (v9) stays an optional peer; the
 * core bundle never loads it.
 *
 * Sorting needs `rowSortingFeature` declared on your table; a `sortFn` on a column
 * def replaces the built-in `auto`, which would compare Money objects as text.
 *
 * @stability experimental
 */
import { columnAlign, sortValueOf } from '../table-core/tableCore.ts';
import type { CellValue, ColumnDef } from '../table-core/tableCore.ts';
import { compareCellValues, formatCellValue } from '../table-adapters/adapterMoney.ts';
import type { AdapterMoneyConfig } from '../table-adapters/adapterMoney.ts';

export type { AdapterMoneyConfig } from '../table-adapters/adapterMoney.ts';

/** The slice of a TanStack `Row` the helpers read. Structural, so any TanStack major fits. */
export interface TanStackRowLike<Row = unknown> {
  original: Row;
  getValue: (columnId: string) => unknown;
}

/** The slice of a TanStack cell context the renderers read. */
export interface TanStackCellContextLike<Row = unknown> {
  row: TanStackRowLike<Row>;
  getValue: () => unknown;
}

/** A TanStack sort function: the (rowA, rowB, columnId) signature. */
export type MoneySortFn = (rowA: TanStackRowLike, rowB: TanStackRowLike, columnId: string) => number;

/** Column `meta` the adapter sets: the alignment a cell should take. */
export interface PunjiColumnMeta {
  align: 'start' | 'end';
  kind: ColumnDef<never>['kind'];
}

/** A TanStack column def, as a plain object. Pass the array to the table, or spread each into your own defs. */
export interface TanStackColumnDef<Row, Node = unknown> {
  id: string;
  header: Node;
  accessorFn: (row: Row) => unknown;
  cell: (context: TanStackCellContextLike<Row>) => Node | string;
  sortFn: MoneySortFn;
  /** Missing values (null, undefined) go last in either direction. */
  sortUndefined: 'last';
  enableSorting: boolean;
  meta: PunjiColumnMeta;
}

/**
 * Sort function that compares bigint minor units exactly. Money sorts by
 * currency code then amount; bigint and number by value; missing values first
 * ascending (pair it with `sortUndefined: 'last'` to keep them last). Never goes through `Number`.
 * @stability experimental
 */
export const moneySortFn: MoneySortFn = (rowA, rowB, columnId) => compareCellValues(rowA.getValue(columnId), rowB.getValue(columnId));

/**
 * Cell renderer factory: prints the cell's Money (or bigint minor units, with `config.currency`) exactly, with the locale's separators. Returns a string.
 * @stability experimental
 */
export function moneyCell(config: AdapterMoneyConfig = {}): (context: Pick<TanStackCellContextLike, 'getValue'>) => string {
  return (context) => formatCellValue(context.getValue(), config);
}

/** Options for `toTanStackColumns`. */
export interface ToTanStackColumnsOptions {
  /** Formatting for money (and bigint minor units, with `currency`) cells that have no `cell` of their own. */
  money?: AdapterMoneyConfig;
}

/**
 * Converts table-core columns to TanStack column defs. A column with a `cell`
 * keeps it; otherwise money, bigint and other values print through the exact
 * formatters. `sortKey` is honoured, `enableSorting` follows `sortable`, and
 * `meta.align` carries the alignment.
 * @stability experimental
 */
export function toTanStackColumns<Row, Node = unknown>(columns: readonly ColumnDef<Row, Node>[], options: ToTanStackColumnsOptions = {}): TanStackColumnDef<Row, Node>[] {
  const config = options.money ?? {};
  return columns.map((column) => {
    const accessor = column.accessor;
    const accessorFn = (row: Row): unknown => {
      const value = accessor ? accessor(row) : undefined;
      return value === null || (typeof value === 'number' && Number.isNaN(value)) ? undefined : value;
    };
    const sortFn: MoneySortFn = column.sortKey
      ? (rowA, rowB) => compareCellValues(sortValueOf(column, rowA.original as Row), sortValueOf(column, rowB.original as Row))
      : moneySortFn;
    return {
      id: column.id,
      header: column.header,
      accessorFn,
      cell: (context) => (column.cell ? (column.cell(context.row.original as Row) as Node) : formatCellValue(context.getValue() as CellValue, config)),
      sortFn,
      sortUndefined: 'last',
      enableSorting: column.sortable ?? false,
      meta: { align: columnAlign(column), kind: column.kind },
    };
  });
}
