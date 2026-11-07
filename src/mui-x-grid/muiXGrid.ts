/**
 * MUI X DataGrid adapter (optional): exact-money value formatter, sort comparator
 * and cell renderer, and a converter from table-core `ColumnDef[]` to `GridColDef`s.
 *
 * It imports nothing from `@mui/x-data-grid`: everything returned is a plain
 * function or object that fits the `GridColDef` field of the same name.
 * `@mui/x-data-grid` (v9) stays an optional peer; the core bundle never loads it.
 * Cells are plain text; alignment uses the grid's own `align`, with no styling layer.
 *
 * @stability experimental
 */
import { columnAlign, sortValueOf } from '../table-core/tableCore.ts';
import type { CellValue, ColumnDef } from '../table-core/tableCore.ts';
import { compareCellValues, formatCellValue } from '../table-adapters/adapterMoney.ts';
import type { AdapterMoneyConfig } from '../table-adapters/adapterMoney.ts';

export type { AdapterMoneyConfig } from '../table-adapters/adapterMoney.ts';

/** The slice of MUI's formatter / renderer params the helpers read. */
export interface GridValueParamsLike {
  value?: unknown;
}

/**
 * `GridColDef.sortComparator`: compares Money by currency then exact bigint minor
 * units (never `Number`), bigint and number by value. Missing values are the
 * smallest, so they lead an ascending sort and trail a descending one.
 * @stability experimental
 */
export function moneySortComparator(valueA: unknown, valueB: unknown): number {
  return compareCellValues(valueA, valueB);
}

/**
 * `GridColDef.valueFormatter`: prints Money (or bigint minor units, with `config.currency`) exactly.
 * MUI X v9 passes `(value, row, column, apiRef)`; the legacy `{ value }` params object is accepted too.
 * @stability experimental
 */
export function moneyGridValueFormatter(config: AdapterMoneyConfig = {}): (valueOrParams: unknown) => string {
  return (valueOrParams) => formatCellValue(isParams(valueOrParams) ? valueOrParams.value : valueOrParams, config);
}

const isParams = (v: unknown): v is GridValueParamsLike => typeof v === 'object' && v !== null && 'value' in v && !('minor' in v);

/**
 * `GridColDef.renderCell`: the same exact text as the formatter, as a string.
 * @stability experimental
 */
export function renderMoneyCell(config: AdapterMoneyConfig = {}): (params: GridValueParamsLike) => string {
  return (params) => formatCellValue(params.value, config);
}

/** The money bits of a `GridColDef`. */
export interface GridMoneyColDef {
  type: 'number';
  align: 'right';
  headerAlign: 'right';
  valueFormatter: (valueOrParams: unknown) => string;
  sortComparator: (valueA: unknown, valueB: unknown) => number;
}

/**
 * The money bits of a `GridColDef` in one object: `{ field: 'balance', headerName: 'Balance', ...moneyGridColDef({ locale: 'en-IN' }) }`.
 * @stability experimental
 */
export function moneyGridColDef(config: AdapterMoneyConfig = {}): GridMoneyColDef {
  return { type: 'number', align: 'right', headerAlign: 'right', valueFormatter: moneyGridValueFormatter(config), sortComparator: moneySortComparator };
}

/** A MUI X `GridColDef`, as a plain object. */
export interface MuiGridColDef<Row> {
  field: string;
  headerName: string;
  valueGetter: (value: unknown, row: Row) => unknown;
  valueFormatter: (valueOrParams: unknown) => string;
  sortComparator: (valueA: unknown, valueB: unknown, cellParamsA: { id: unknown; api?: unknown }, cellParamsB: { id: unknown; api?: unknown }) => number;
  sortable: boolean;
  align: 'left' | 'right';
  headerAlign: 'left' | 'right';
}

/** Options for `toGridColDefs`. */
export interface ToGridColDefsOptions<Row> {
  /** Formatting for money (and bigint minor units, with `currency`) cells. */
  money?: AdapterMoneyConfig;
  /** Looks a row up by the grid's row id; needed only for columns with a `sortKey` (the comparator receives ids, not rows). */
  getRow?: (id: unknown) => Row | undefined;
}

/**
 * Converts table-core columns to MUI X `GridColDef`s. The header is the column's
 * `header` when it is a string, else its `id`. `valueGetter` reads the accessor;
 * `valueFormatter` prints money exactly; numeric kinds align right. A `sortKey`
 * column needs `options.getRow` (for example `(id) => rowsById.get(id)`), else it sorts by the accessor's value.
 * Custom `cell` renderers are React nodes and are not carried over: pass your own `renderCell`.
 * @stability experimental
 */
export function toGridColDefs<Row, Node = unknown>(columns: readonly ColumnDef<Row, Node>[], options: ToGridColDefsOptions<Row> = {}): MuiGridColDef<Row>[] {
  const formatter = moneyGridValueFormatter(options.money);
  const { getRow } = options;
  return columns.map((column) => {
    const align = columnAlign(column) === 'end' ? 'right' : 'left';
    const bySortKey = column.sortKey && getRow;
    return {
      field: column.id,
      headerName: typeof column.header === 'string' ? column.header : column.id,
      valueGetter: (_value, row) => (row === undefined || !column.accessor ? undefined : (column.accessor(row) as CellValue)),
      valueFormatter: formatter,
      sortComparator: bySortKey
        ? (valueA, valueB, a, b) => {
            const rowA = getRow(a.id);
            const rowB = getRow(b.id);
            return compareCellValues(rowA === undefined ? valueA : sortValueOf(column, rowA), rowB === undefined ? valueB : sortValueOf(column, rowB));
          }
        : moneySortComparator,
      sortable: column.sortable ?? false,
      align,
      headerAlign: align,
    };
  });
}
