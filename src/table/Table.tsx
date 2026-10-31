'use client';

/**
 * DataTable + DataListRow: the dense table for a page's records (the app's
 * DataListRow). Sticky head, sortable columns (aria-sort), figures right
 * aligned and tabular, the symbol column never shrinks, `wide` columns hide
 * under 760 px. Rows are plain <tr>; the page decides what a cell holds.
 *
 * Locked columns (design.punji.app/components/data-table, "Locked cells"):
 * a column whose figures are not included on this account keeps its head,
 * a LockedHead (a lock, not sortable), and each of its cells is a LockedCell
 * (the LockedCell component, pending in this package).
 *
 * `bare` drops the box (a table inside a Card); `stickToPage` keeps the head
 * in view as the page scrolls on a wide screen (the page sets
 * `--kit-table-top` under its own sticky bars) and lets the table scroll in
 * its own box under 1256px; `stack` turns each row into a block under 640px:
 * the row's head and the first figure on one line, then up to four figures in
 * fixed columns, each its column's label over its value (Cell `label`).
 */
import { Children, createContext, isValidElement, useContext, useId, type ReactNode } from 'react';

import { paginate } from '../use-pagination/usePagination.ts';


export interface Column<K extends string> {
  key: K;
  label: ReactNode;
  num?: boolean;
  wide?: boolean;
  sortable?: boolean;
  /** Folds away between 760px and this width too (a table with more columns than a tablet column holds). */
  hideUnder?: 1024 | 1256;
  /** On the head cell. */
  testId?: string;
}

export type SortDir = 'asc' | 'desc';

/** Controlled search input. Filter the full data set in the caller, then pass its rows and count. */
export interface DataTableSearch {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  clearLabel?: string;
  testId?: string;
}

/** Controlled, zero-based pagination. `rowCount` is the total after filtering, not the rows on this page. */
export interface DataTablePagination {
  pageIndex: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (pageIndex: number) => void;
  previousLabel?: string;
  nextLabel?: string;
  /** Localize the visible range without changing the row model. */
  rangeLabel?: (start: number, end: number, rowCount: number) => ReactNode;
  /** Localize the current page label. Page is one-based for display. */
  pageLabel?: (page: number, pageCount: number) => ReactNode;
  testIdPrefix?: string;
}

/** Controlled row selection. Select-page affects the visible page and preserves IDs selected on other pages. */
export interface DataTableSelection {
  selectedRowIds: readonly string[];
  onChange: (selectedRowIds: readonly string[]) => void;
  rowLabel: (rowId: string) => string;
  selectPageLabel?: string;
  clearLabel?: string;
  selectedCountLabel?: (count: number) => ReactNode;
  testIdPrefix?: string;
}

interface SelectionContextValue {
  selectedRowIds: ReadonlySet<string>;
  toggleRow: (rowId: string) => void;
  rowLabel: (rowId: string) => string;
  testIdPrefix?: string;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function DataTable<K extends string>({
  caption,
  columns,
  sort,
  onSort,
  children,
  dense,
  bare,
  stickToPage,
  stack,
  sortTestIdPrefix = 'sort',
  testId,
  search,
  pagination,
  selection,
  empty = 'No records to display.',
  loading = false,
  loadingLabel = 'Loading records…',
}: {
  caption: string;
  columns: Column<K>[];
  sort?: { key: K; dir: SortDir };
  onSort?: (key: K) => void;
  children: ReactNode;
  /** A narrow panel's table: no box, tighter cells, row labels that wrap; figures still never wrap. */
  dense?: boolean;
  /** No box of its own: the table sits in a Card. */
  bare?: boolean;
  /** The head stays in view as the page scrolls (1256px and wider); under that the table scrolls in its own box. */
  stickToPage?: boolean;
  /** Under 640px each row is a block: its head and first figure on a line, then four fixed columns, label over value. */
  stack?: boolean;
  /** Sort buttons are `${prefix}-${key}`. */
  sortTestIdPrefix?: string;
  testId?: string;
  /** Optional controlled search UI. Search the complete data set in the caller, before sorting and pagination. */
  search?: DataTableSearch;
  /** Optional controlled page controls. `rowCount` is the count after search/filtering. */
  pagination?: DataTablePagination;
  /** Optional controlled selection. Each selectable DataListRow needs a stable `rowId`. */
  selection?: DataTableSelection;
  /** Content for an empty table. Defaults to a plain, accessible message. */
  empty?: ReactNode;
  /** Keep headers visible and announce the loading state while the caller fetches rows. */
  loading?: boolean;
  loadingLabel?: string;
}) {
  const auto = useId();
  const tableId = `${auto}-table`;
  const rows = Children.toArray(children);
  const selectableIds = [...new Set(rows.flatMap((row) => {
    if (!isValidElement<{ rowId?: string; selectionDisabled?: boolean }>(row) || row.type !== DataListRow) return [];
    const { rowId, selectionDisabled } = row.props;
    return typeof rowId === 'string' && rowId.length > 0 && !selectionDisabled ? [rowId] : [];
  }))];
  const selectedIds = new Set(selection?.selectedRowIds ?? []);
  const selectedOnPage = selectableIds.filter((id) => selectedIds.has(id)).length;
  const allOnPageSelected = selectableIds.length > 0 && selectedOnPage === selectableIds.length;
  const someOnPageSelected = selectedOnPage > 0 && !allOnPageSelected;
  const togglePage = () => {
    if (!selection) return;
    const visible = new Set(selectableIds);
    const retained = selection.selectedRowIds.filter((id) => !visible.has(id));
    selection.onChange(allOnPageSelected ? retained : [...new Set([...retained, ...selectableIds])]);
  };
  const selectionContext: SelectionContextValue | null = selection ? {
    selectedRowIds: selectedIds,
    rowLabel: selection.rowLabel,
    testIdPrefix: selection.testIdPrefix,
    toggleRow: (rowId) => selection.onChange(selectedIds.has(rowId)
      ? selection.selectedRowIds.filter((id) => id !== rowId)
      : [...new Set([...selection.selectedRowIds, rowId])]),
  } : null;
  // The same arithmetic as usePagination / Pagination: one clamped, one-based model; DataTable's props stay zero-based.
  const range = paginate(pagination?.rowCount ?? 0, (pagination?.pageIndex ?? 0) + 1, pagination?.pageSize ?? 1);
  const pageIndex = range.page - 1;
  const rowCount = range.total;
  const pageCount = rowCount === 0 ? 0 : range.pageCount;
  const rangeStart = rowCount === 0 ? 0 : range.startIndex + 1;
  const rangeEnd = range.endIndex;
  const searchChange = (next: string) => {
    search?.onChange(next);
    if (pagination && pageIndex > 0) pagination.onPageChange(0);
  };
  const box = ['kit-tablebox', dense && 'dense', bare && 'bare', stickToPage && 'page-sticky', stack && 'stack', selection && 'selection'].filter(Boolean).join(' ');
  return (
    <>
      {search && (
        <div className="kit-table-tools">
          <div className="kit-table-search">
            <label className="kit-sr" htmlFor={`${auto}-search`}>{search.label}</label>
            <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" /><path d="m11 11 3.5 3.5" /></svg>
            <input
              id={`${auto}-search`}
              type="search"
              value={search.value}
              onChange={(event) => searchChange(event.target.value)}
              placeholder={search.placeholder}
              aria-controls={tableId}
              data-testid={search.testId}
              autoComplete="off"
              spellCheck={false}
            />
            {search.value && (
              <button type="button" aria-label={search.clearLabel ?? 'Clear search'} onClick={() => searchChange('')}>
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
        </div>
      )}
      <div className={box} role="region" aria-label={caption} tabIndex={0} aria-busy={loading || undefined}>
      {selection && selection.selectedRowIds.length > 0 && (
        <div className="kit-table-selection-summary" aria-live="polite" aria-atomic="true">
          <span>{selection.selectedCountLabel?.(selection.selectedRowIds.length) ?? `${selection.selectedRowIds.length} selected`}</span>
          <button type="button" onClick={() => selection.onChange([])}>{selection.clearLabel ?? 'Clear selection'}</button>
        </div>
      )}
      {selection && stack && <div className="kit-table-mobile-select">
        <label>
          <input
            type="checkbox"
            aria-label={selection.selectPageLabel ?? 'Select all rows on this page'}
            checked={allOnPageSelected}
            ref={(input) => { if (input) input.indeterminate = someOnPageSelected; }}
            onChange={togglePage}
            disabled={selectableIds.length === 0}
            data-testid={selection.testIdPrefix ? `${selection.testIdPrefix}-select-page-mobile` : undefined}
          />
          <span>{selection.selectPageLabel ?? 'Select all rows on this page'}</span>
        </label>
      </div>}
      <SelectionContext.Provider value={selectionContext}>
      <table id={tableId} className="kit-table" data-testid={testId}>
        <caption className="kit-sr">{caption}</caption>
        <thead>
          <tr>
            {selection && <th scope="col" className="kit-table-selection-cell">
              <input
                type="checkbox"
                aria-label={selection.selectPageLabel ?? 'Select all rows on this page'}
                checked={allOnPageSelected}
                ref={(input) => { if (input) input.indeterminate = someOnPageSelected; }}
                onChange={togglePage}
                disabled={selectableIds.length === 0}
                data-testid={selection.testIdPrefix ? `${selection.testIdPrefix}-select-page` : undefined}
              />
            </th>}
            {columns.map((c) => {
              const active = sort?.key === c.key;
              const cls = [c.num && 'num', c.wide && 'wide', c.hideUnder && `hide-${c.hideUnder}`].filter(Boolean).join(' ') || undefined;
              return (
                <th key={c.key} scope="col" className={cls} aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined} data-testid={c.testId}>
                  {c.sortable && onSort ? (
                    <button type="button" onClick={() => onSort(c.key)} data-testid={`${sortTestIdPrefix}-${c.key}`}>
                      {c.label}
                      <span className="kit-sort-i" aria-hidden="true">
                        {active ? (sort!.dir === 'asc' ? '↑' : '↓') : ''}
                      </span>
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td className="kit-table-empty" colSpan={columns.length + Number(Boolean(selection))}><span role="status">{loadingLabel}</span></td></tr>
          ) : rows.length === 0 ? (
            <tr><td className="kit-table-empty" colSpan={columns.length + Number(Boolean(selection))}><span role="status">{empty}</span></td></tr>
          ) : children}
        </tbody>
      </table>
      </SelectionContext.Provider>
      </div>
      {pagination && (
        <div className="kit-table-footer" data-testid={pagination.testIdPrefix ? `${pagination.testIdPrefix}-footer` : undefined}>
          <span className="kit-table-range" aria-live="polite" aria-atomic="true">
            {pagination.rangeLabel ? pagination.rangeLabel(rangeStart, rangeEnd, rowCount) : rowCount === 0 ? '0 results' : `${rangeStart}–${rangeEnd} of ${rowCount}`}
          </span>
          <nav className="kit-table-pages" aria-label={`${caption} pages`}>
            <button type="button" onClick={() => pagination.onPageChange(pageIndex - 1)} disabled={pageIndex <= 0} aria-label={pagination.previousLabel ?? 'Previous page'} data-testid={pagination.testIdPrefix ? `${pagination.testIdPrefix}-previous` : undefined}>
              {pagination.previousLabel ?? 'Previous'}
            </button>
            <span aria-current="page">
              {pagination.pageLabel ? pagination.pageLabel(pageCount === 0 ? 0 : pageIndex + 1, pageCount) : pageCount === 0 ? 'No pages' : `Page ${pageIndex + 1} of ${pageCount}`}
            </span>
            <button type="button" onClick={() => pagination.onPageChange(pageIndex + 1)} disabled={pageCount === 0 || pageIndex >= pageCount - 1} aria-label={pagination.nextLabel ?? 'Next page'} data-testid={pagination.testIdPrefix ? `${pagination.testIdPrefix}-next` : undefined}>
              {pagination.nextLabel ?? 'Next'}
            </button>
          </nav>
        </div>
      )}
    </>
  );
}

export function DataListRow({ children, testId, rowId, selectionDisabled = false }: { children: ReactNode; testId?: string; /** Stable domain ID; required to select this row. */ rowId?: string; selectionDisabled?: boolean }) {
  const selection = useContext(SelectionContext);
  const selected = Boolean(selection && rowId && selection.selectedRowIds.has(rowId));
  return <tr data-testid={testId} aria-selected={selection ? selected : undefined}>
    {selection && rowId && <td className="kit-table-selection-cell">
      <input type="checkbox" checked={selected} disabled={selectionDisabled} aria-label={selection.rowLabel(rowId)} onChange={() => selection.toggleRow(rowId)} data-testid={selection.testIdPrefix ? `${selection.testIdPrefix}-row` : undefined} />
    </td>}
    {children}
  </tr>;
}

export function Cell({ children, num, wide, hideUnder, sym, header, label, testId }: {
  children: ReactNode;
  num?: boolean;
  wide?: boolean;
  /** As its Column's. */
  hideUnder?: 1024 | 1256;
  sym?: boolean;
  header?: boolean;
  /** The column's name, printed before the figure in a stacked row (DataTable `stack`). */
  label?: string;
  testId?: string;
}) {
  const cls = [num && 'num', wide && 'wide', hideUnder && `hide-${hideUnder}`, sym && 'sym'].filter(Boolean).join(' ') || undefined;
  return header ? (
    <th scope="row" className={cls} data-testid={testId}>
      {children}
    </th>
  ) : (
    <td className={cls} data-label={label} data-testid={testId}>
      {children}
    </td>
  );
}
