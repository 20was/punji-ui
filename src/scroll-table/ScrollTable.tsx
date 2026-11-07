'use client';

/**
 * ScrollTable (design.punji.app/components/scroll-table): a read-only data
 * table that scrolls inside its own focusable, named region. Built on the
 * table-core `ColumnDef`, so the columns, the exact-money sort and the
 * footer totals are the ones every Punji table uses. Sortable heads are real
 * buttons with `aria-sort`; the first column is a row header and stays in view
 * while the rest scrolls sideways; figures are end-aligned and tabular.
 *
 * Reach for DataTable or FinancialTable when you need pagination, search,
 * selection, grouping or stacked phone rows; this is the lighter table for a
 * page's reference data (a sector's companies, a dividend year, a rate sheet).
 */
import { useId, type ReactNode } from 'react';

import { useControllableState } from '../use-controllable-state/useControllableState.ts';
import { columnAlign, compareRowsBy, isNumericKind, plainValue, type ColumnDef } from '../table-core/tableModel.ts';
import { footerTotals } from '../table-core/tableAggregate.ts';

/** The sort being shown. `null` is the order of `rows`. @stability beta */
export type ScrollTableSort = {
  /** The sorted column's `id`. */
  key: string;
  /** Ascending or descending. */
  dir: 'asc' | 'desc';
} | null;

/** Every word the table prints or announces. @stability beta */
export interface ScrollTableLabels {
  /** The totals row's header. Default "Total". */
  total: string;
  /** Shown when `rows` is empty. Default "No records to display." */
  empty: string;
  /** Announced after a sort: "Sorted by Company, ascending". */
  sorted: (column: string, dir: 'asc' | 'desc') => string;
}
const EN: ScrollTableLabels = {
  total: 'Total',
  empty: 'No records to display.',
  sorted: (column, dir) => `Sorted by ${column}, ${dir === 'asc' ? 'ascending' : 'descending'}`,
};

/** @stability beta */
export interface ScrollTableProps<Row> {
  /** Names the scroll region (and the table for assistive technology). */
  caption: string;
  /** Columns as table-core `ColumnDef`s. Give `sortable` with an `accessor` (or `sortKey`) to sort; `kind` or `align` sets alignment; `hideUnder: 760` folds a column away on a phone. */
  columns: readonly ColumnDef<Row, ReactNode>[];
  /** The records, in their starting order. Sorting returns a sorted copy; `rows` is never changed. */
  rows: readonly Row[];
  /** A stable, unique key per row. */
  rowKey: (row: Row) => string;
  /** Controlled sort. Without it the table keeps the sort itself. */
  sort?: ScrollTableSort;
  /** The starting sort when uncontrolled. */
  defaultSort?: ScrollTableSort;
  /** Called with the next sort when a head is pressed. */
  onSortChange?: (sort: ScrollTableSort) => void;
  /** The first column stays in view while the table scrolls sideways. Default true. */
  stickyFirstColumn?: boolean;
  /** Prints the caption above the table instead of keeping it for assistive technology only. */
  showCaption?: boolean;
  /** Adds a totals row (`<tfoot>`) with each `aggregate` column's total over `rows`. Exact for Money; mixed currencies throw. */
  totals?: boolean;
  /** Replaces the table's words ("Total", the empty line, the sort announcement). */
  labels?: Partial<ScrollTableLabels>;
  /** Sets `data-testid` on the region. */
  testId?: string;
  /** Extra class names on the region. */
  className?: string;
}

const text = (node: ReactNode, fallback: string) => (typeof node === 'string' ? node : fallback);

/**
 * @stability beta
 */
export function ScrollTable<Row>({
  caption, columns, rows, rowKey, sort, defaultSort = null, onSortChange, stickyFirstColumn = true, showCaption, totals, labels, testId, className,
}: ScrollTableProps<Row>) {
  const words = { ...EN, ...labels };
  const [current, setSort] = useControllableState<ScrollTableSort>({ value: sort, defaultValue: defaultSort, onChange: onSortChange, name: 'ScrollTable sort' });
  const id = useId();
  const shown = current ? rows.toSorted(compareRowsBy(columns, [current])) : rows;
  const press = (column: ColumnDef<Row, ReactNode>) => {
    // First press: A to Z for words, largest first for figures. After that the press flips the direction.
    const first = isNumericKind(column.kind) || columnAlign(column) === 'end' ? 'desc' : 'asc';
    setSort(current?.key === column.id ? { key: column.id, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key: column.id, dir: first });
  };
  const sums = totals && rows.length ? footerTotals(rows, columns) : undefined;
  const cls = (column: ColumnDef<Row, ReactNode>) => [columnAlign(column) === 'end' && 'num', column.hideUnder && `hide-${column.hideUnder}`].filter(Boolean).join(' ') || undefined;
  const isHeader = (column: ColumnDef<Row, ReactNode>, index: number) => column.rowHeader ?? index === 0;
  const announced = current ? words.sorted(text(columns.find((c) => c.id === current.key)?.header, current.key), current.dir) : '';

  return (
    <div
      className={`pu-scroll-table pu-print-table${stickyFirstColumn ? ' sticky-first' : ''}${className ? ` ${className}` : ''}`}
      role="region"
      aria-label={caption}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll region must be focusable so the keyboard can scroll it (WCAG 2.1.1).
      tabIndex={0}
      data-testid={testId}
    >
      <table id={id}>
        <caption className={showCaption ? undefined : 'kit-sr'}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const active = current?.key === column.id;
              const sortable = column.sortable && (column.accessor || column.sortKey);
              return (
                <th key={column.id} scope="col" className={cls(column)} aria-sort={sortable ? (active ? (current.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}>
                  {sortable ? (
                    <button type="button" onClick={() => press(column)}>
                      {column.header}
                      <span className="pu-scroll-table-arrow" aria-hidden="true">{active ? (current.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
                    </button>
                  ) : column.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {shown.length === 0 ? (
            <tr><td className="pu-scroll-table-empty" colSpan={Math.max(1, columns.length)}>{words.empty}</td></tr>
          ) : shown.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column, index) => {
                const content = column.cell ? column.cell(row) : plainValue(column.accessor?.(row));
                return isHeader(column, index)
                  ? <th key={column.id} scope="row" className={cls(column)}>{content}</th>
                  : <td key={column.id} className={cls(column)}>{content}</td>;
              })}
            </tr>
          ))}
        </tbody>
        {sums && (
          <tfoot>
            <tr>
              {columns.map((column, index) => {
                const value = sums[column.id];
                const content = column.aggregate && value !== undefined ? (column.formatAggregate ? column.formatAggregate(value, rows) : plainValue(value)) : null;
                return index === 0
                  ? <th key={column.id} scope="row" className={cls(column)}>{words.total}</th>
                  : <td key={column.id} className={cls(column)}>{content}</td>;
              })}
            </tr>
          </tfoot>
        )}
      </table>
      <div className="kit-sr" role="status" aria-live="polite" aria-atomic="true">{announced}</div>
    </div>
  );
}
