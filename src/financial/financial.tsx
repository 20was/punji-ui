'use client';

import { useId, type ReactNode } from 'react';
import { DataTable, DataListRow, Cell, type Column, type DataTablePagination, type DataTableSearch, type DataTableSelection, type SortDir } from '../table/Table.tsx';
import { EmptyState, Skeleton } from '../states/States.tsx';
import { StatGrid, StatTile } from '../stats/Stats.tsx';

export interface AppShellProps {
  brand: ReactNode;
  navigation: ReactNode;
  navigationLabel: string;
  children: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
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

export interface FinancialMetric { id: string; label: ReactNode; value: ReactNode; note?: ReactNode }
/** Caller supplies calculated and formatted amounts, including currency and as-of labels. */
export function FinancialSummary({ metrics, label }: { metrics: readonly FinancialMetric[]; label: string }) {
  return <StatGrid label={label} cols={Math.min(4, Math.max(1, metrics.length))}>{metrics.map(metric => <StatTile key={metric.id} {...metric} />)}</StatGrid>;
}

export interface FinancialColumn<T> extends Column<string> { render: (row: T) => ReactNode; rowHeader?: boolean }
export interface FinancialTableProps<T> {
  caption: string;
  columns: readonly FinancialColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  state?: 'ready' | 'loading' | 'error';
  emptyTitle: string;
  emptyBody?: ReactNode;
  emptyAction?: ReactNode;
  loadingLabel?: string;
  errorTitle?: string;
  errorAction?: ReactNode;
  sort?: { key: string; dir: SortDir };
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
  return <DataTable caption={caption} columns={[...columns]} sort={sort} onSort={onSort} search={search} pagination={pagination} selection={selection} empty={emptyTitle}>
    {rows.map(row => <DataListRow key={rowKey(row)} rowId={rowKey(row)}>{columns.map(column => <Cell key={column.key} num={column.num} wide={column.wide} hideUnder={column.hideUnder} header={column.rowHeader} label={typeof column.label === 'string' ? column.label : undefined}>{column.render(row)}</Cell>)}</DataListRow>)}
  </DataTable>;
}

export interface PricePoint { label: string; value: number | null }
/** Straight segments, gaps stay gaps, fixed aspect ratio, and an accessible data table. */
export function PriceChart({ points, label, formatValue, dataLabel = 'View chart data', missingLabel = 'Unavailable' }: {
  points: readonly PricePoint[]; label: string; formatValue: (value: number) => string; dataLabel?: string; missingLabel?: string;
}) {
  const valid = points.flatMap(p => p.value !== null && Number.isFinite(p.value) ? [p.value] : []);
  if (!valid.length) return <EmptyState title={missingLabel} body={label} />;
  const min = valid.reduce((a, b) => Math.min(a, b));
  const max = valid.reduce((a, b) => Math.max(a, b));
  // Normalize first so opposite finite extremes cannot overflow max - min.
  const magnitude = Math.max(Math.abs(min), Math.abs(max), 1);
  const span = max / magnitude - min / magnitude;
  const y = (v: number) => span === 0 ? 65 : 110 - ((v / magnitude - min / magnitude) / span) * 90;
  const x = (i: number) => points.length === 1 ? 240 : 10 + i / (points.length - 1) * 460;
  const path = points.map((p, i) => {
    if (p.value === null || !Number.isFinite(p.value)) return ''; 
    const previous = points[i - 1]?.value;
    const command = previous != null && Number.isFinite(previous) ? 'L' : 'M';
    return `${command}${x(i)},${y(p.value)}`;
  }).join(' ');
  return <figure className="pu-chart"><figcaption>{label}</figcaption>
    <div className="pu-chart-range"><span>{formatValue(max)}</span><span>{formatValue(min)}</span></div>
    <svg viewBox="0 0 480 130" role="img" aria-label={label}><path d={path} fill="none" stroke="currentColor" strokeWidth="2" />{points.map((p, i) => p.value !== null && Number.isFinite(p.value) ? <circle key={i} cx={x(i)} cy={y(p.value)} r="2" /> : null)}</svg>
    <details><summary>{dataLabel}</summary><table><caption>{label}</caption><tbody>{points.map((point, i) => <tr key={i}><th scope="row">{point.label}</th><td>{point.value !== null && Number.isFinite(point.value) ? formatValue(point.value) : missingLabel}</td></tr>)}</tbody></table></details>
  </figure>;
}

export interface OrderBookLevel { price: number; quantity: number }
/** Display only: no order placement, totals, sorting or inferred market data. */
export function OrderBook({ bids, asks, caption, labels, formatPrice, formatQuantity, missingLabel = '—' }: {
  bids: readonly OrderBookLevel[]; asks: readonly OrderBookLevel[]; caption: string;
  labels: { bidQuantity: string; bid: string; ask: string; askQuantity: string };
  formatPrice: (value: number) => string; formatQuantity: (value: number) => string; missingLabel?: string;
}) {
  const rows = Array.from({ length: Math.max(bids.length, asks.length) }, (_, index) => ({ index, bid: bids[index], ask: asks[index] }));
  const value = (n: number | undefined, format: (n: number) => string) => n !== undefined && Number.isFinite(n) && n >= 0 ? format(n) : missingLabel;
  return <FinancialTable caption={caption} rows={rows} rowKey={row => String(row.index)} emptyTitle={missingLabel} columns={[
    { key: 'bidQuantity', label: labels.bidQuantity, num: true, render: row => value(row.bid?.quantity, formatQuantity) },
    { key: 'bid', label: labels.bid, num: true, render: row => value(row.bid?.price, formatPrice) },
    { key: 'ask', label: labels.ask, num: true, render: row => value(row.ask?.price, formatPrice) },
    { key: 'askQuantity', label: labels.askQuantity, num: true, render: row => value(row.ask?.quantity, formatQuantity) },
  ]} />;
}
