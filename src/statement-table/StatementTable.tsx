'use client';

/**
 * StatementTable: an income statement, balance sheet or cash-flow style report
 * as a typed tree of sections, lines and subtotals, with one column per period
 * (for example two fiscal years side by side) and an optional variance between
 * two of them (absolute, and percent from `percentageChange`).
 *
 * It draws exactly the values it is given. It NEVER adds a subtotal for you:
 * call the pure `rollUp(rows)` yourself if you want the sums, and in
 * development the component warns when a subtotal you supplied disagrees with
 * the roll-up of its children (a warning, never a correction). Negative
 * amounts follow the accounting convention you choose: parentheses (default)
 * or a minus sign. No tax, rate or jurisdiction rule lives here, and nothing
 * here replaces the server-side books.
 */
import { Fragment, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';

import { percentageChange } from '../calculations/ratios.ts';
import { devWarn } from '../internal/devWarn.ts';
import { DataListRow, DataTable, type Column } from '../table/Table.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { nepalLedgerMoney } from '../debit-credit/DebitCredit.tsx';
import { RetryNote } from '../retry-note/RetryNote.tsx';
import { findRollUpMismatches, type StatementRow, type StatementValues } from '../ledger/statement.ts';
import type { MoneyFormatConfig } from '../money/money.ts';

export interface StatementPeriod {
  /** The key used in each row's `values`, for example '2081/82'. */
  key: string;
  /** The column heading. Label BS and AD periods however your readers expect. */
  label: ReactNode;
}

export interface StatementVariance {
  /** The earlier period key (the base). */
  from: string;
  /** The later period key. Variance is `to − from`. */
  to: string;
}

export interface StatementTableLabels {
  item: string;
  variance: string;
  variancePercent: string;
}

export const DEFAULT_STATEMENT_LABELS: StatementTableLabels = { item: 'Item', variance: 'Change', variancePercent: 'Change %' };

export interface StatementTableProps {
  caption: string;
  periods: readonly StatementPeriod[];
  rows: readonly StatementRow[];
  /** Add Change and Change % columns between two of the periods. */
  variance?: StatementVariance;
  /** parentheses: (1,200.00), the accounting convention (default). minus: -1,200.00. */
  negative?: 'parentheses' | 'minus';
  money?: MoneyFormatConfig;
  labels?: Partial<StatementTableLabels>;
  /** Fraction digits of the percent. Default 1. */
  percentDigits?: number;
  bare?: boolean;
  maxHeight?: number | string;
  state?: 'ready' | 'loading' | 'error';
  emptyLabel?: ReactNode;
  loadingLabel?: string;
  errorLabel?: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  testId?: string;
}

const MISSING = <span className="pu-money pu-money-missing"><span aria-hidden="true">—</span><span className="kit-sr">No value</span></span>;

export function StatementTable({
  caption, periods, rows, variance, negative = 'parentheses', money = nepalLedgerMoney, labels, percentDigits = 1, bare, maxHeight, state = 'ready',
  emptyLabel = 'No statement lines to show.', loadingLabel = 'Loading statement…', errorLabel = 'The statement could not be loaded.', retryLabel = 'Try again', onRetry, testId,
}: StatementTableProps) {
  const words = { ...DEFAULT_STATEMENT_LABELS, ...labels };
  const keys = useMemo(() => periods.map(period => period.key), [periods]);
  const mismatches = useMemo(() => {
    try { return findRollUpMismatches(rows, keys); } catch { return null; }
  }, [rows, keys]);
  useEffect(() => {
    if (mismatches === null) devWarn('StatementTable: a row has a value that is not a bigint.');
    else if (mismatches.length) devWarn(`StatementTable: ${mismatches.length} subtotal value(s) disagree with rollUp() of their rows (sections: ${[...new Set(mismatches.map(m => m.id))].join(', ')}). The values you passed are shown unchanged.`);
  }, [mismatches]);

  if (state === 'error') return <RetryNote retryLabel={retryLabel} onRetry={onRetry} testId={testId}>{errorLabel}</RetryNote>;

  const config: MoneyFormatConfig = { ...money, accounting: negative === 'parentheses' };
  const locale = money.locale ?? 'en';
  const percentFormat = new Intl.NumberFormat(locale, { style: 'unit', unit: 'percent', minimumFractionDigits: percentDigits, maximumFractionDigits: percentDigits, signDisplay: 'exceptZero', ...(money.numberingSystem ? { numberingSystem: money.numberingSystem } : {}) });
  const columns: Column<string>[] = [
    { key: '__item', label: words.item },
    ...periods.map(period => ({ key: period.key, label: period.label, num: true })),
    ...(variance ? [{ key: '__variance', label: words.variance, num: true }, { key: '__percent', label: words.variancePercent, num: true }] : []),
  ];
  const width = columns.length;
  const style = maxHeight === undefined ? undefined : ({ '--ledger-max-h': typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } as CSSProperties);

  const amount = (values: StatementValues | undefined, key: string): ReactNode => {
    const value = values?.[key];
    return value === null || value === undefined ? MISSING : <MoneyDisplay value={value} preset={config} />;
  };
  const varianceCells = (values: StatementValues | undefined, tone?: string): ReactNode => {
    if (!variance) return null;
    const from = values?.[variance.from];
    const to = values?.[variance.to];
    const known = typeof from === 'bigint' && typeof to === 'bigint';
    const percent = known ? percentageChange(to, from) : null;
    return <>
      <td className={`num${tone ? ` ${tone}` : ''}`}>{known ? <MoneyDisplay value={to - from} preset={{ ...config, signDisplay: 'exceptZero' }} /> : MISSING}</td>
      <td className={`num${tone ? ` ${tone}` : ''}`}>{percent === null || !Number.isFinite(percent)
        ? MISSING
        : <span className="pu-money">{percentFormat.format(percent)}</span>}</td>
    </>;
  };

  const render = (list: readonly StatementRow[], depth: number): ReactNode => list.map(row => {
    const indent = { '--depth': depth } as CSSProperties;
    if (row.kind === 'line') {
      return (
        <DataListRow key={row.id} testId={testId ? `${testId}-row-${row.id}` : undefined}>
          <th scope="row" className="pu-stmt-label" style={indent}>{row.label}</th>
          {periods.map(period => <td key={period.key} className="num">{amount(row.values, period.key)}</td>)}
          {varianceCells(row.values)}
        </DataListRow>
      );
    }
    return (
      <Fragment key={row.id}>
        <DataListRow testId={testId ? `${testId}-section-${row.id}` : undefined}>
          <th scope="row" colSpan={width} className="pu-stmt-label pu-stmt-section" style={indent}>{row.label}</th>
        </DataListRow>
        {render(row.rows, depth + 1)}
        {row.subtotal && (
          <DataListRow testId={testId ? `${testId}-subtotal-${row.id}` : undefined}>
            <th scope="row" className={`pu-stmt-label pu-stmt-subtotal${row.subtotal.grand ? ' grand' : ''}`} style={indent}>{row.subtotal.label}</th>
            {periods.map(period => <td key={period.key} className={`num pu-stmt-subtotal${row.subtotal!.grand ? ' grand' : ''}`}>{amount(row.subtotal!.values, period.key)}</td>)}
            {varianceCells(row.subtotal.values, `pu-stmt-subtotal${row.subtotal.grand ? ' grand' : ''}`)}
          </DataListRow>
        )}
      </Fragment>
    );
  });

  return (
    <div className="pu-stmt" style={style} data-negative={negative} data-testid={testId}>
      <DataTable caption={caption} columns={columns} bare={bare} loading={state === 'loading'} loadingLabel={loadingLabel} empty={emptyLabel} testId={testId ? `${testId}-table` : undefined}>
        {rows.length ? render(rows, 0) : null}
      </DataTable>
    </div>
  );
}
