'use client';

/**
 * VirtualFinancialTable: FinancialTable's typed columns for 10k+ rows. Only the
 * rows in view (plus `overscan`) are in the DOM; spacer rows keep the scroll
 * height, and `aria-rowcount` / `aria-rowindex` keep the real size and position
 * for screen readers. Adds left/right column pinning, pointer and keyboard
 * column resizing and multi-column sort. Like FinancialTable it never sorts or
 * filters your rows: it renders them in the order given.
 *
 * Kept in its own module so FinancialTable stays small. On the server it
 * renders the first screenful (from `height` and `rowHeight`), so hydration
 * matches.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import type { FinancialColumn } from '../financial/financial.tsx';
import type { DataTableSearch, DataTableSelection } from '../table/Table.tsx';
import { EmptyState, Skeleton } from '../states/States.tsx';
import { clampWidth, fixedLayout, measuredLayout, nextSortRules, placeColumns, renderedIndices, visibleRange, type PlacedColumn, type SortRule } from './layout.ts';

export { nextSortRules, compareByRules } from './layout.ts';
export type { SortRule } from './layout.ts';

export interface VirtualColumn<T> extends Omit<FinancialColumn<T>, 'wide' | 'hideUnder'> {
  /** Starting width in px. Default 120 for `num` columns, 160 otherwise. */
  width?: number;
  /** The narrowest a resize can make it, in px. Default 64. */
  minWidth?: number;
  /** The widest a resize can make it, in px. Default 560. */
  maxWidth?: number;
  /** Keep the column in view while the table scrolls sideways. Left pins come first, right pins last. */
  pin?: 'left' | 'right';
  /** Show a resize handle on the head. Default true. */
  resizable?: boolean;
}

/** Words the table reads out or prints. Pass them in the reader's language. */
export interface VirtualTableLabels {
  /** Default "ascending". */
  ascending: string;
  /** Default "descending". */
  descending: string;
  /** Hidden text after a sorted head while more than one column sorts. Default "sort priority 2". */
  priority: (rank: number) => string;
  /** Announced when the sort changes, from parts like "Price descending". */
  sorted: (parts: readonly string[]) => string;
  /** Announced when the sort is cleared. Default "Sort cleared". */
  sortCleared: string;
  /** Describes the sort buttons. */
  sortHint: string;
  /** Names a column's resize handle. Default "Resize Price column". */
  resize: (column: string) => string;
  /** Describes the table: how to move between rows. */
  rowsHint: string;
}

const DEFAULT_LABELS: VirtualTableLabels = {
  ascending: 'ascending',
  descending: 'descending',
  priority: (rank) => `sort priority ${rank}`,
  sorted: (parts) => `Sorted by ${parts.join(', then ')}`,
  sortCleared: 'Sort cleared',
  sortHint: 'Shift-click, or press Shift with Enter, to sort by more than one column.',
  resize: (column) => `Resize ${column} column`,
  rowsHint: 'Arrow keys move between rows; Page Up, Page Down, Home and End jump. Space selects a row when rows can be selected.',
};

export interface VirtualFinancialTableProps<T> {
  /** Names the table region; also the subject of sort announcements. */
  caption: string;
  /** The columns: a key, a label, how to render a row's cell, and layout (`num`, `rowHeader`, `width`, `pin`, `sortable`). */
  columns: readonly VirtualColumn<T>[];
  /** Every record, in the order to show them. Sort and filter them yourself; only the rows in view render. */
  rows: readonly T[];
  /** A stable, unique key per row, also the id used by `selection`. Define it outside the component (or memoise it): keys are recomputed when it changes. */
  rowKey: (row: T) => string;
  /** ready (default), loading (a placeholder) or error (`errorTitle`). */
  state?: 'ready' | 'loading' | 'error';
  /** The title shown when `rows` is empty. */
  emptyTitle: string;
  /** A line under the empty title. */
  emptyBody?: ReactNode;
  /** Names the loading placeholder. Default "Loading records". */
  loadingLabel?: string;
  /** What failed, shown in place of the table. Default "Records unavailable". */
  errorTitle?: string;
  /** One button for the error state, for example a retry. */
  errorAction?: ReactNode;
  /** The most the scroll box grows to, in px (head included). Default 480. */
  height?: number;
  /** Row height in px. Fixed unless `measureRows`, when it is the estimate for rows not yet drawn. Default 40. */
  rowHeight?: number;
  /** Measure each drawn row (for cells that wrap). Fixed heights are faster; use this only when rows differ. */
  measureRows?: boolean;
  /** Rows drawn beyond each edge of the view, so fast scrolling shows no gap. Default 8. */
  overscan?: number;
  /** The sort being shown, primary first. Drives the arrows, priority numbers and `aria-sort` on the primary head. */
  sort?: readonly SortRule[];
  /** Called with the next sort when a sortable head is pressed (Shift adds a column). The table does not reorder rows. */
  onSortChange?: (sort: SortRule[]) => void;
  /** Controlled column widths in px by column key, for example restored from storage. */
  columnWidths?: Readonly<Record<string, number>>;
  /** Called when a resize ends (pointer released, or each arrow key), with the clamped width. Persist it here. */
  onColumnResize?: (key: string, width: number) => void;
  /** Optional controlled search field. Filter the full row set yourself and pass the result as `rows`. */
  search?: DataTableSearch;
  /** Optional controlled selection. The head checkbox selects every row in `rows`, not only those drawn. */
  selection?: DataTableSelection;
  /** Controls beside the search field, for example TableExport. */
  toolbar?: ReactNode;
  /** Called when scrolling changes the rows in view (first inclusive, last exclusive). Use it to load more data. */
  onVisibleRangeChange?: (range: { start: number; end: number }) => void;
  /** Words read out or printed, in the reader's language. */
  labels?: Partial<VirtualTableLabels>;
  /** Test id on the table element. */
  testId?: string;
}

const SELECT_WIDTH = 44;
const widthDefault = (column: { num?: boolean | undefined }) => (column.num ? 120 : 160);
const nameOf = (column: { key: string; label: ReactNode }) => (typeof column.label === 'string' ? column.label : column.key);
const pinClass = (column: PlacedColumn) => (column.pin ? `pin-${column.pin === 'left' ? 'l' : 'r'}${column.edge ? ' pin-edge' : ''}` : '');
const pinStyle = (column: PlacedColumn) => (column.pin === 'left' ? { left: column.inset } : column.pin === 'right' ? { right: column.inset } : undefined);

/** Virtualised FinancialTable for 10k+ rows, with pinning, resizing and multi-sort. */
export function VirtualFinancialTable<T>({
  caption, columns, rows, rowKey, state = 'ready', emptyTitle, emptyBody, loadingLabel = 'Loading records', errorTitle = 'Records unavailable', errorAction,
  height = 480, rowHeight = 40, measureRows = false, overscan = 8, sort, onSortChange, columnWidths, onColumnResize, search, selection, toolbar,
  onVisibleRangeChange, labels: labelOverrides, testId,
}: VirtualFinancialTableProps<T>) {
  const auto = useId();
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(height);
  const [headHeight, setHeadHeight] = useState(rowHeight);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [ownWidths, setOwnWidths] = useState<Readonly<Record<string, number>>>({});
  const [drag, setDrag] = useState<{ key: string; width: number } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [heights, setHeights] = useState<ReadonlyMap<string, number>>(() => new Map());
  const anchor = useRef<{ key: string; next: string | undefined; delta: number } | null>(null);
  const focusPending = useRef(false);
  const dragStart = useRef<{ key: string; x: number; width: number; min: number; max: number } | null>(null);
  const lastRange = useRef('');
  const keysNow = useRef<readonly string[]>([]);
  const rowObserver = useRef<ResizeObserver | null>(null);

  // Keys and their positions: one pass per new `rows` array.
  const keys = useMemo(() => rows.map(rowKey), [rows, rowKey]);
  const indexOf = useMemo(() => {
    const map = new Map<string, number>();
    keys.forEach((key, i) => map.set(key, i));
    return map;
  }, [keys]);
  const layout = useMemo(
    () => (measureRows ? measuredLayout(keys.length, rowHeight, (i) => heights.get(keys[i]!)) : fixedLayout(keys.length, rowHeight)),
    [measureRows, keys, rowHeight, heights],
  );
  const bodyViewport = Math.max(rowHeight, viewport - headHeight);
  const { start, end } = visibleRange(layout, scrollTop, bodyViewport, overscan);
  const firstVisible = layout.indexAt(scrollTop);
  const activeIndex = activeKey === null ? -1 : indexOf.get(activeKey) ?? -1;
  const tabIndexRow = activeIndex >= 0 ? activeIndex : firstVisible;
  const indices = renderedIndices(start, end, activeIndex >= 0 ? [activeIndex] : [], keys.length);

  // Column widths: a drag in progress, then controlled, then committed, then the column's own.
  const widthOf = (column: VirtualColumn<T>) => {
    const raw = drag?.key === column.key ? drag.width : (columnWidths ?? ownWidths)[column.key] ?? column.width ?? widthDefault(column);
    return clampWidth(raw, column.minWidth ?? 64, column.maxWidth ?? 560);
  };
  const byKey = new Map(columns.map((column) => [column.key, column]));
  const placed = placeColumns(columns.map((column) => ({ key: column.key, width: widthOf(column), pin: column.pin })), selection ? SELECT_WIDTH : 0);
  const totalWidth = placed.reduce((sum, column) => sum + column.width, selection ? SELECT_WIDTH : 0);
  const colCount = placed.length + (selection ? 1 : 0);

  // The scroll box's real height and the sticky head's height, from a ResizeObserver.
  // Without one (jsdom, the server) the `height` and `rowHeight` props stand.
  const scrollBox = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const head = node.querySelector('thead');
    const observer = new ResizeObserver(() => {
      if (node.clientHeight > 0) setViewport(node.clientHeight);
      const h = head?.getBoundingClientRect().height ?? 0;
      if (h > 0) setHeadHeight(h);
    });
    observer.observe(node);
    if (head) observer.observe(head);
    return () => observer.disconnect();
  }, []);

  // Measured rows: a ResizeObserver reports drawn rows; the layout changes only when a height does.
  useLayoutEffect(() => {
    keysNow.current = keys;
  }, [keys]);
  useEffect(() => () => rowObserver.current?.disconnect(), []);
  const observeRow = useCallback((node: HTMLTableRowElement | null) => {
    if (!node || typeof ResizeObserver === 'undefined') return;
    rowObserver.current ??= new ResizeObserver((entries) => setHeights((prev) => {
      let next: Map<string, number> | null = null;
      for (const entry of entries) {
        const key = keysNow.current[Number((entry.target as HTMLElement).dataset.index)];
        const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (key === undefined || h <= 0 || Math.abs((prev.get(key) ?? -1) - h) <= 0.5) continue;
        next ??= new Map(prev);
        next.set(key, h);
      }
      return next ?? prev;
    }));
    const observer = rowObserver.current;
    observer.observe(node);
    return () => observer.unobserve(node);
  }, []);

  // Live updates: rows inserted or removed above the view keep the reader's rows in place.
  // A reorder (a new sort) separates the anchor row from its neighbour, so the offset is kept instead.
  useLayoutEffect(() => {
    const box = scrollRef.current;
    const mark = anchor.current;
    if (!box || !mark || box.scrollTop <= 0) return;
    const i = indexOf.get(mark.key);
    if (i === undefined || keys[i + 1] !== mark.next) return;
    const target = layout.offset(i) + mark.delta;
    // The scroll event that follows redraws the window.
    if (Math.abs(target - box.scrollTop) >= 1) box.scrollTop = target;
  }, [indexOf, keys, layout]);

  // A keyboard move focuses the row once it is drawn.
  useLayoutEffect(() => {
    if (!focusPending.current || activeIndex < 0) return;
    focusPending.current = false;
    bodyRef.current?.querySelector<HTMLElement>(`tr[data-index="${activeIndex}"]`)?.focus({ preventScroll: true });
  });

  if (state === 'loading') return <div aria-busy="true"><Skeleton label={loadingLabel} height={160} /></div>;
  if (state === 'error') return <EmptyState title={errorTitle} action={errorAction} role="alert" />;
  if (!rows.length && !search) return <EmptyState title={emptyTitle} body={emptyBody} />;

  const sync = (top: number) => {
    const first = layout.indexAt(top);
    const key = keys[first];
    anchor.current = key === undefined ? null : { key, next: keys[first + 1], delta: top - layout.offset(first) };
    setScrollTop(top);
    const range = { start: first, end: Math.min(keys.length, layout.indexAt(top + bodyViewport - 1) + 1) };
    const signature = `${range.start}:${range.end}`;
    if (signature !== lastRange.current) {
      lastRange.current = signature;
      onVisibleRangeChange?.(range);
    }
  };
  const onScroll = () => {
    if (scrollRef.current) sync(scrollRef.current.scrollTop);
  };
  const reveal = (index: number) => {
    const box = scrollRef.current;
    if (!box) return;
    const view = box.clientHeight > 0 ? box.clientHeight - headHeight : bodyViewport;
    const top = layout.offset(index);
    const bottom = layout.offset(index + 1);
    if (top < box.scrollTop) box.scrollTop = top;
    else if (bottom > box.scrollTop + view) box.scrollTop = bottom - view;
    sync(box.scrollTop);
  };
  const moveTo = (index: number) => {
    if (!keys.length) return;
    const next = Math.max(0, Math.min(keys.length - 1, index));
    setActiveKey(keys[next]!);
    focusPending.current = true;
    reveal(next);
  };

  const selected = new Set(selection?.selectedRowIds ?? []);
  const toggleRow = (id: string) => {
    if (!selection) return;
    selection.onChange(selected.has(id) ? selection.selectedRowIds.filter((x) => x !== id) : [...selection.selectedRowIds, id]);
  };
  const selectedHere = selection ? keys.reduce((n, key) => n + (selected.has(key) ? 1 : 0), 0) : 0;
  const allSelected = keys.length > 0 && selectedHere === keys.length;
  const toggleAll = () => {
    if (!selection) return;
    const here = new Set(keys);
    const kept = selection.selectedRowIds.filter((id) => !here.has(id));
    selection.onChange(allSelected ? kept : [...kept, ...keys]);
  };

  const onRowKeyDown = (event: KeyboardEvent<HTMLTableSectionElement>) => {
    const row = event.target as HTMLElement;
    if (row.tagName !== 'TR' || row.dataset.index === undefined) return;
    const index = Number(row.dataset.index);
    const page = Math.max(1, Math.floor(bodyViewport / rowHeight) - 1);
    let next: number;
    switch (event.key) {
      case 'ArrowDown': next = index + 1; break;
      case 'ArrowUp': next = index - 1; break;
      case 'PageDown': next = index + page; break;
      case 'PageUp': next = index - page; break;
      case 'Home': next = 0; break;
      case 'End': next = keys.length - 1; break;
      case ' ':
        if (!selection) return;
        event.preventDefault();
        toggleRow(keys[index]!);
        return;
      default: return;
    }
    event.preventDefault();
    moveTo(next);
  };

  const commitWidth = (key: string, width: number) => {
    if (!columnWidths) setOwnWidths((prev) => ({ ...prev, [key]: width }));
    onColumnResize?.(key, width);
  };
  const resizeKey = (column: VirtualColumn<T>, event: KeyboardEvent<HTMLDivElement>) => {
    const min = column.minWidth ?? 64;
    const max = column.maxWidth ?? 560;
    const now = widthOf(column);
    const step = event.shiftKey ? 40 : 10;
    const next = event.key === 'ArrowLeft' ? now - step : event.key === 'ArrowRight' ? now + step : event.key === 'Home' ? min : event.key === 'End' ? max : null;
    if (next === null) return;
    event.preventDefault();
    commitWidth(column.key, clampWidth(next, min, max));
  };
  const resizeStart = (column: VirtualColumn<T>, event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const width = widthOf(column);
    dragStart.current = { key: column.key, x: event.clientX, width, min: column.minWidth ?? 64, max: column.maxWidth ?? 560 };
    setDrag({ key: column.key, width });
  };
  const resizeMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = dragStart.current;
    if (d) setDrag({ key: d.key, width: clampWidth(d.width + event.clientX - d.x, d.min, d.max) });
  };
  const resizeEnd = (event: PointerEvent<HTMLDivElement>) => {
    const d = dragStart.current;
    if (!d) return;
    dragStart.current = null;
    const width = clampWidth(d.width + event.clientX - d.x, d.min, d.max);
    setDrag(null);
    if (width !== d.width) commitWidth(d.key, width);
  };

  const sortRules = sort ?? [];
  const sortBy = (key: string, additive: boolean) => {
    if (!onSortChange) return;
    const next = nextSortRules(sortRules, key, additive);
    onSortChange(next);
    setAnnouncement(next.length
      ? labels.sorted(next.map((rule) => `${nameOf(byKey.get(rule.key) ?? { key: rule.key, label: rule.key })} ${rule.dir === 'asc' ? labels.ascending : labels.descending}`))
      : labels.sortCleared);
  };

  const head = (
    <tr aria-rowindex={1}>
      {selection && <th scope="col" className="kit-table-selection-cell pin-l" style={{ left: 0 }}>
        <input
          type="checkbox"
          aria-label={selection.selectPageLabel ?? 'Select all rows'}
          checked={allSelected}
          ref={(input) => { if (input) input.indeterminate = selectedHere > 0 && !allSelected; }}
          onChange={toggleAll}
          disabled={keys.length === 0}
          data-testid={selection.testIdPrefix ? `${selection.testIdPrefix}-select-all` : undefined}
        />
      </th>}
      {placed.map((place) => {
        const column = byKey.get(place.key)!;
        const rank = sortRules.findIndex((rule) => rule.key === column.key);
        const rule = rank >= 0 ? sortRules[rank] : undefined;
        const multi = Boolean(rule) && sortRules.length > 1;
        const cls = [column.num && 'num', pinClass(place), drag?.key === column.key && 'resizing'].filter(Boolean).join(' ') || undefined;
        return (
          <th key={column.key} scope="col" className={cls} style={pinStyle(place)} aria-sort={rank === 0 && rule ? (rule.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
            {column.sortable && onSortChange ? (
              <button
                type="button"
                aria-describedby={`${auto}-sorthint`}
                onClick={(event) => sortBy(column.key, event.shiftKey)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  sortBy(column.key, event.shiftKey);
                }}
              >
                {column.label}
                <span className="kit-sort-i" aria-hidden="true">{rule ? (rule.dir === 'asc' ? '↑' : '↓') : ''}</span>
                {multi && <span className="pu-vt-rank" aria-hidden="true">{rank + 1}</span>}
                {multi && <span className="kit-sr">{`, ${rank > 0 ? `${rule!.dir === 'asc' ? labels.ascending : labels.descending}, ` : ''}${labels.priority(rank + 1)}`}</span>}
              </button>
            ) : column.label}
            {column.resizable !== false && (
              // A focusable window-splitter separator (APG): arrows resize, Home and End jump to the bounds.
              // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions
              <div
                className="pu-vt-resize"
                role="separator"
                aria-orientation="vertical"
                aria-label={labels.resize(nameOf(column))}
                aria-valuenow={place.width}
                aria-valuemin={column.minWidth ?? 64}
                aria-valuemax={column.maxWidth ?? 560}
                tabIndex={0}
                onKeyDown={(event) => resizeKey(column, event)}
                onPointerDown={(event) => resizeStart(column, event)}
                onPointerMove={resizeMove}
                onPointerUp={resizeEnd}
                onPointerCancel={resizeEnd}
              />
            )}
          </th>
        );
      })}
    </tr>
  );

  const renderRow = (index: number) => {
    const row = rows[index]!;
    const key = keys[index]!;
    const isSelected = selected.has(key);
    return (
      <tr
        key={key}
        ref={measureRows ? observeRow : undefined}
        data-index={index}
        aria-rowindex={index + 2}
        aria-selected={selection ? isSelected : undefined}
        tabIndex={index === tabIndexRow ? 0 : -1}
        style={measureRows ? undefined : { height: rowHeight }}
        onFocus={() => setActiveKey(key)}
      >
        {selection && <td className="kit-table-selection-cell pin-l" style={{ left: 0 }}>
          <input type="checkbox" tabIndex={-1} checked={isSelected} aria-label={selection.rowLabel(key)} onChange={() => toggleRow(key)} data-testid={selection.testIdPrefix ? `${selection.testIdPrefix}-row` : undefined} />
        </td>}
        {placed.map((place) => {
          const column = byKey.get(place.key)!;
          const cls = [column.num && 'num', pinClass(place)].filter(Boolean).join(' ') || undefined;
          return column.rowHeader
            ? <th key={column.key} scope="row" className={cls} style={pinStyle(place)}>{column.render(row)}</th>
            : <td key={column.key} className={cls} style={pinStyle(place)}>{column.render(row)}</td>;
        })}
      </tr>
    );
  };

  // The drawn rows, with spacer rows holding the height of the rows that are not drawn.
  const body: ReactNode[] = [];
  let cursor = 0;
  const spacer = (from: number, to: number) => (
    <tr key={`gap-${from}`} className="pu-vt-spacer" aria-hidden="true">
      {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
      <td colSpan={colCount} style={{ height: layout.offset(to) - layout.offset(from) }} />
    </tr>
  );
  for (const index of indices) {
    if (index > cursor) body.push(spacer(cursor, index));
    body.push(renderRow(index));
    cursor = index + 1;
  }
  if (cursor < keys.length) body.push(spacer(cursor, keys.length));

  const box = ['kit-tablebox', 'pu-vt-box', selection && 'selection', measureRows && 'measured'].filter(Boolean).join(' ');
  return (
    <div className="pu-vt-wrap">
      {(search || toolbar) && (
        <div className="kit-table-tools">
          {search ? (
            <div className="kit-table-search">
              <label className="kit-sr" htmlFor={`${auto}-search`}>{search.label}</label>
              <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" /><path d="m11 11 3.5 3.5" /></svg>
              <input id={`${auto}-search`} type="search" value={search.value} onChange={(event) => search.onChange(event.target.value)} placeholder={search.placeholder}
                aria-controls={`${auto}-table`} data-testid={search.testId} autoComplete="off" spellCheck={false} />
              {search.value && (
                <button type="button" aria-label={search.clearLabel ?? 'Clear search'} onClick={() => search.onChange('')}><span aria-hidden="true">×</span></button>
              )}
            </div>
          ) : <span />}
          {toolbar}
        </div>
      )}
      {selection && selection.selectedRowIds.length > 0 && (
        <div className="kit-table-selection-summary pu-vt-summary" aria-live="polite" aria-atomic="true">
          <span>{selection.selectedCountLabel?.(selection.selectedRowIds.length) ?? `${selection.selectedRowIds.length} selected`}</span>
          <button type="button" onClick={() => selection.onChange([])}>{selection.clearLabel ?? 'Clear selection'}</button>
        </div>
      )}
      <div ref={scrollBox} className={box} role="region" aria-label={caption} style={{ maxHeight: height }} onScroll={onScroll}>
        <table id={`${auto}-table`} className="kit-table pu-vt" style={{ width: totalWidth }} aria-rowcount={keys.length + 1} aria-describedby={`${auto}-rowshint`} data-testid={testId}>
          <caption className="kit-sr">{caption}</caption>
          <colgroup>
            {selection && <col style={{ width: SELECT_WIDTH }} />}
            {placed.map((place) => <col key={place.key} style={{ width: place.width }} />)}
          </colgroup>
          <thead>{head}</thead>
          {/* Row keys move focus between rows (a roving tab stop); rows stay plain table rows for screen readers. */}
          {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <tbody ref={bodyRef} onKeyDown={onRowKeyDown}>
            {keys.length === 0
              ? <tr aria-rowindex={2}><td className="kit-table-empty" colSpan={colCount}><span role="status">{emptyTitle}</span></td></tr>
              : body}
          </tbody>
        </table>
      </div>
      <p className="kit-sr" id={`${auto}-rowshint`}>{labels.rowsHint}</p>
      <p className="kit-sr" id={`${auto}-sorthint`}>{labels.sortHint}</p>
      <div className="kit-sr" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
    </div>
  );
}
