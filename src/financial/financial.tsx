'use client';

import { useId, type PointerEvent, type ReactNode } from 'react';
import { clamp, isNum, useChartCursor } from '../internal/chartFrame.tsx';
import { DataTable, DataListRow, Cell, type Column, type DataTablePagination, type DataTableSearch, type DataTableSelection, type SortDir } from '../table/Table.tsx';
import { EmptyState, Skeleton } from '../states/States.tsx';
import { StatGrid, StatTile } from '../stats/Stats.tsx';

export interface AppShellProps {
  /** The product name or logo, linking home. Drawn in the header. */
  brand: ReactNode;
  /** Your navigation (links, a list). It wraps on phones; the shell does not hide it. */
  navigation: ReactNode;
  /** The navigation landmark's accessible name ("Main", "Documentation"). */
  navigationLabel: string;
  /** The page. Rendered inside <main>, which the skip link targets. */
  children: ReactNode;
  /** Header controls on the right (a theme switch, an account button). */
  actions?: ReactNode;
  /** A footer line, rendered as the contentinfo landmark. Omitted when empty. */
  footer?: ReactNode;
  /** The skip link's words, in the reader's language. Default "Skip to content". */
  skipLabel?: string;
}
/** Router-independent landmarks. Navigation wraps on phones; no inaccessible hidden menu. */
export function AppShell({ brand, navigation, navigationLabel, children, actions, footer, skipLabel = 'Skip to content' }: AppShellProps) {
  const id = useId();
  return <div className="pu-shell">
    <a className="pu-skip" href={`#${id}`}>{skipLabel}</a>
    <header className="pu-shell-header"><div>{brand}</div><div className="pu-shell-actions">{actions}</div></header>
    <div className="pu-shell-body"><nav className="pu-shell-nav" aria-label={navigationLabel}>{navigation}</nav><main id={id} tabIndex={-1} className="pu-shell-main">{children}</main></div>
    {footer && <footer className="pu-shell-footer">{footer}</footer>}
  </div>;
}

export interface FinancialMetric {
  /** Unique, stable key of the metric. */
  id: string;
  /** What the figure is ("Invested"). */
  label: ReactNode;
  /** The finished, formatted figure (a MoneyDisplay, or text with its currency). */
  value: ReactNode;
  /** A quiet line under the value: the as-of date, the basis, a count. */
  note?: ReactNode;
}
/** Caller supplies calculated and formatted amounts, including currency and as-of labels. */
export interface FinancialSummaryProps {
  /** The figures, in order. The grid has one column per metric, at most four. */
  metrics: readonly FinancialMetric[];
  /** The grid's accessible name ("Portfolio totals"). */
  label: string;
}

export function FinancialSummary({ metrics, label }: FinancialSummaryProps) {
  return <StatGrid label={label} cols={Math.min(4, Math.max(1, metrics.length))}>{metrics.map(metric => <StatTile key={metric.id} {...metric} />)}</StatGrid>;
}

export interface FinancialColumn<T> extends Column<string> {
  /** Draws one row's cell for this column. */
  render: (row: T) => ReactNode;
  /** The cell is the row's header (a th scope="row"), usually the first column. */
  rowHeader?: boolean;
}
export interface FinancialTableProps<T> {
  /** Names the table region; also the sort and selection announcements' subject. */
  caption: string;
  /** The columns in order: a key, a label, how to render a row's cell, and layout hints (`num`, `wide`, `hideUnder`, `rowHeader`). */
  columns: readonly FinancialColumn<T>[];
  /** The records to show, in the order to show them. Sort, filter and page them yourself. */
  rows: readonly T[];
  /** A stable, unique key per row, also the id used by `selection`. */
  rowKey: (row: T) => string;
  /** ready (default), loading (a placeholder) or error (`errorTitle`). */
  state?: 'ready' | 'loading' | 'error';
  /** The title shown when `rows` is empty (and no search or pagination is on). */
  emptyTitle: string;
  /** A line under the empty title: why it is empty or what to do. */
  emptyBody?: ReactNode;
  /** One button or link under the empty state. */
  emptyAction?: ReactNode;
  /** Names the loading placeholder. Default "Loading records". */
  loadingLabel?: string;
  /** What failed, shown in place of the table. Default "Records unavailable". */
  errorTitle?: string;
  /** One button for the error state, for example a retry. */
  errorAction?: ReactNode;
  /** The sort being shown: the column key and its direction. */
  sort?: { key: string; dir: SortDir };
  /** Called with the column key a click on a sortable head asks for. The table does not reorder rows. */
  onSort?: (key: string) => void;
  /** Optional controlled search field. The caller filters the complete row set and supplies the filtered page. */
  search?: DataTableSearch;
  /** Optional controlled page controls. `rowCount` should be the filtered total, including rows on other pages. */
  pagination?: DataTablePagination;
  /** Optional controlled row selection; selected IDs use `rowKey` and persist across pages in caller state. */
  selection?: DataTableSelection;
}
/** Holdings, invoices, transactions and ledgers share semantic table behavior, not a business schema. */
export function FinancialTable<T>({ caption, columns, rows, rowKey, state = 'ready', emptyTitle, emptyBody, emptyAction, loadingLabel = 'Loading records', errorTitle = 'Records unavailable', errorAction, sort, onSort, search, pagination, selection }: FinancialTableProps<T>) {
  if (state === 'loading') return <div aria-busy="true"><Skeleton label={loadingLabel} height={160} /></div>;
  if (state === 'error') return <EmptyState title={errorTitle} action={errorAction} role="alert" />;
  if (!rows.length && !search && !pagination) return <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} />;
  return <DataTable caption={caption} columns={[...columns]} sort={sort} onSort={onSort} search={search} pagination={pagination} selection={selection} empty={emptyBody || emptyAction ? <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} headingLevel={3} bare /> : emptyTitle}>
    {rows.map(row => <DataListRow key={rowKey(row)} rowId={rowKey(row)}>{columns.map(column => <Cell key={column.key} num={column.num} wide={column.wide} hideUnder={column.hideUnder} header={column.rowHeader} label={typeof column.label === 'string' ? column.label : undefined}>{column.render(row)}</Cell>)}</DataListRow>)}
  </DataTable>;
}

export interface PricePoint {
  /** The observation's name (a date), in order, oldest first; printed in the data table. */
  label: string;
  /** The value at that label. Null or not finite is a gap: the line breaks and the table shows `missingLabel`. */
  value: number | null;
}
/** Straight segments, gaps stay gaps, fixed aspect ratio, and an accessible data table. */
export function PriceChart({ points, label, formatValue, dataLabel = 'View chart data', missingLabel = 'Unavailable' }: {
  /** The observations in order. With no finite value at all the chart is replaced by an empty state titled `missingLabel`. */
  points: readonly PricePoint[];
  /** Names the chart (its caption and the image's accessible name). */
  label: string;
  /** Formats a value for the high and low labels and the data table. */
  formatValue: (value: number) => string;
  /** The words on the disclosure that opens the data table. Default 'View chart data'. */
  dataLabel?: string;
  /** Shown for a missing value in the data table, and as the title of the empty state when nothing is published. Default 'Unavailable'. */
  missingLabel?: string;
}) {
  const cursor = useChartCursor(points.length);
  const hintId = `${useId()}-h`;
  const valid = points.flatMap(p => isNum(p.value) ? [p.value] : []);
  if (!valid.length) return <EmptyState title={missingLabel} body={label} />;
  const min = valid.reduce((a, b) => Math.min(a, b));
  const max = valid.reduce((a, b) => Math.max(a, b));
  // Normalize first so opposite finite extremes cannot overflow max - min.
  const magnitude = Math.max(Math.abs(min), Math.abs(max), 1);
  const span = max / magnitude - min / magnitude;
  const y = (v: number) => span === 0 ? 65 : 110 - ((v / magnitude - min / magnitude) / span) * 90;
  const x = (i: number) => points.length === 1 ? 240 : 10 + i / (points.length - 1) * 460;
  const path = points.map((p, i) => {
    if (!isNum(p.value)) return '';
    const previous = points[i - 1]?.value;
    const command = isNum(previous) ? 'L' : 'M';
    return `${command}${x(i)},${y(p.value)}`;
  }).join(' ');
  const at = cursor.index;
  const active = at === null ? undefined : points[at];
  const reading = active ? `${active.label}: ${isNum(active.value) ? formatValue(active.value) : missingLabel}` : '';
  // The pointer's place across the plot, as the nearest observation (the drawing is 480 wide, stretched to fit).
  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width <= 0) return;
    const viewX = ((e.clientX - r.left) / r.width) * 480;
    cursor.pointerTo(points.length === 1 ? 0 : clamp(Math.round(((viewX - 10) / 460) * (points.length - 1)), 0, points.length - 1));
  };
  return <figure className="pu-chart"><figcaption>{label}</figcaption>
    <div className="pu-chart-range"><span>{formatValue(max)}</span><span>{formatValue(min)}</span></div>
    {/* The plot is one focus stop: the arrow keys and the pointer read the observations one at a time. */}
    {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
    <div className="pu-chart-plot" tabIndex={0} role="group" aria-label={label} aria-roledescription="line chart" aria-describedby={hintId}
      onKeyDown={cursor.onKeyDown} onFocus={cursor.onFocus} onBlur={cursor.clear} onPointerMove={onPointer} onPointerDown={onPointer} onPointerLeave={() => cursor.pointerTo(null)}>
      <svg viewBox="0 0 480 130" preserveAspectRatio="none" role="img" aria-label={label}><path d={path} fill="none" stroke="currentColor" strokeWidth="2" />{points.map((p, i) => isNum(p.value) ? <circle key={i} cx={x(i)} cy={y(p.value)} r="2" /> : null)}{at !== null && <line className="pu-chart-cursor" x1={x(at)} x2={x(at)} y1="10" y2="120" />}</svg>
      {reading && <span className="pu-chart-read" aria-hidden="true">{reading}</span>}
    </div>
    <p className="kit-sr" id={hintId}>Use the left and right arrow keys to move between observations, Home and End to jump to the first and last.</p>
    <div className="kit-sr" role="status" aria-live="polite" aria-atomic="true">{reading}</div>
    <details><summary>{dataLabel}</summary><table><caption>{label}</caption><tbody>{points.map((point, i) => <tr key={i}><th scope="row">{point.label}</th><td>{isNum(point.value) ? formatValue(point.value) : missingLabel}</td></tr>)}</tbody></table></details>
  </figure>;
}

export interface OrderBookLevel { price: number; quantity: number }
/** Display only: no order placement, totals, sorting or inferred market data. */
export function OrderBook({ bids, asks, caption, labels, formatPrice, formatQuantity, missingLabel = '—' }: {
  /** Buy levels, best first, as published. */
  bids: readonly OrderBookLevel[];
  /** Sell levels, best first, as published. */
  asks: readonly OrderBookLevel[];
  /** Names the table. */
  caption: string;
  /** The four column heads, in the reader's language. */
  labels: { bidQuantity: string; bid: string; ask: string; askQuantity: string };
  /** Prints a price. */
  formatPrice: (value: number) => string;
  /** Prints a quantity. */
  formatQuantity: (value: number) => string;
  /** Shown for a level that is missing or not a finite non-negative number. Default a dash. */
  missingLabel?: string;
}) {
  const rows = Array.from({ length: Math.max(bids.length, asks.length) }, (_, index) => ({ index, bid: bids[index], ask: asks[index] }));
  const value = (n: number | undefined, format: (n: number) => string) => n !== undefined && Number.isFinite(n) && n >= 0 ? format(n) : missingLabel;
  return <div className="pu-orderbook"><FinancialTable caption={caption} rows={rows} rowKey={row => String(row.index)} emptyTitle={missingLabel} columns={[
    { key: 'bidQuantity', label: labels.bidQuantity, num: true, render: row => value(row.bid?.quantity, formatQuantity) },
    { key: 'bid', label: labels.bid, num: true, render: row => value(row.bid?.price, formatPrice) },
    { key: 'ask', label: labels.ask, num: true, render: row => value(row.ask?.price, formatPrice) },
    { key: 'askQuantity', label: labels.askQuantity, num: true, render: row => value(row.ask?.quantity, formatQuantity) },
  ]} /></div>;
}
