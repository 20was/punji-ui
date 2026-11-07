/**
 * AG Grid adapter (optional): exact-money value formatter, comparator and cell
 * renderer, and a converter from table-core `ColumnDef[]` to AG Grid column defs.
 *
 * It imports nothing from `ag-grid-community`: everything returned is a plain
 * function or object that fits the `ColDef` fields of the same name.
 * `ag-grid-community` (v36) stays an optional peer; the core bundle never loads it.
 * Cells are plain text, so there is no styling layer beyond AG Grid's own
 * `rightAligned` column type.
 *
 * @stability experimental
 */
import { columnAlign, sortValueOf } from '../table-core/tableCore.ts';
import type { CellValue, ColumnDef } from '../table-core/tableCore.ts';
import { compareCellValues, formatCellValue } from '../table-adapters/adapterMoney.ts';
import type { AdapterMoneyConfig } from '../table-adapters/adapterMoney.ts';

export type { AdapterMoneyConfig } from '../table-adapters/adapterMoney.ts';

/** The slice of AG Grid's value-formatter / cell-renderer params the helpers read. */
export interface AgGridValueParamsLike {
  value?: unknown;
}

/** The slice of an AG Grid row node the comparator reads. */
export interface AgGridRowNodeLike<Row = unknown> {
  data?: Row;
}

/**
 * `ColDef.comparator`: compares Money by currency then exact bigint minor units
 * (never `Number`), bigint and number by value. Missing values are the smallest,
 * so they lead an ascending sort and trail a descending one.
 * @stability experimental
 */
export function moneyComparator(valueA: unknown, valueB: unknown): number {
  return compareCellValues(valueA, valueB);
}

/**
 * `ColDef.valueFormatter`: prints Money (or bigint minor units, with `config.currency`) exactly.
 * @stability experimental
 */
export function moneyValueFormatter(config: AdapterMoneyConfig = {}): (params: AgGridValueParamsLike) => string {
  return (params) => formatCellValue(params.value, config);
}

/**
 * `ColDef.cellRenderer`: the same exact text as the formatter, as a string a grid
 * renders directly. Use it when a column needs a renderer rather than a formatter.
 * @stability experimental
 */
export function moneyCellRenderer(config: AdapterMoneyConfig = {}): (params: AgGridValueParamsLike) => string {
  return (params) => formatCellValue(params.value, config);
}

/** A column def for a money column: right-aligned, exact formatter, exact comparator. Spread it into your own `ColDef`. */
export interface AgGridMoneyColDef {
  type: 'rightAligned';
  valueFormatter: (params: AgGridValueParamsLike) => string;
  comparator: (valueA: unknown, valueB: unknown) => number;
}

/**
 * The money bits of a `ColDef` in one object: `{ field: 'balance', headerName: 'Balance', ...moneyColDef({ locale: 'en-IN' }) }`.
 * @stability experimental
 */
export function moneyColDef(config: AdapterMoneyConfig = {}): AgGridMoneyColDef {
  return { type: 'rightAligned', valueFormatter: moneyValueFormatter(config), comparator: moneyComparator };
}

/** An AG Grid column def, as a plain object. */
export interface AgGridColumnDef<Row> {
  colId: string;
  headerName: string;
  valueGetter: (params: { data?: Row }) => unknown;
  valueFormatter: (params: AgGridValueParamsLike) => string;
  comparator: (valueA: unknown, valueB: unknown, nodeA: AgGridRowNodeLike<Row>, nodeB: AgGridRowNodeLike<Row>) => number;
  sortable: boolean;
  type?: 'rightAligned';
}

/** Options for `toAgGridColumns`. */
export interface ToAgGridColumnsOptions {
  /** Formatting for money (and bigint minor units, with `currency`) cells. */
  money?: AdapterMoneyConfig;
}

/**
 * Converts table-core columns to AG Grid column defs. The header is the column's
 * `header` when it is a string, else its `id`. `valueGetter` reads the accessor;
 * `valueFormatter` prints money exactly; `comparator` honours `sortKey`.
 * Custom `cell` renderers are React nodes and are not carried over: pass your own `cellRenderer`.
 * @stability experimental
 */
export function toAgGridColumns<Row, Node = unknown>(columns: readonly ColumnDef<Row, Node>[], options: ToAgGridColumnsOptions = {}): AgGridColumnDef<Row>[] {
  const formatter = moneyValueFormatter(options.money);
  return columns.map((column) => {
    const def: AgGridColumnDef<Row> = {
      colId: column.id,
      headerName: typeof column.header === 'string' ? column.header : column.id,
      valueGetter: ({ data }) => (data === undefined || !column.accessor ? undefined : (column.accessor(data) as CellValue)),
      valueFormatter: formatter,
      comparator: column.sortKey
        ? (_a, _b, nodeA, nodeB) => compareCellValues(nodeA.data === undefined ? undefined : sortValueOf(column, nodeA.data), nodeB.data === undefined ? undefined : sortValueOf(column, nodeB.data))
        : moneyComparator,
      sortable: column.sortable ?? false,
    };
    if (columnAlign(column) === 'end') def.type = 'rightAligned';
    return def;
  });
}
