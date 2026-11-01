/**
 * TdsSummary: tax deducted at source for a period, by category (rent, contract payments, service fees...) with the
 * rate, number of payments, gross paid and tax withheld, and a totals row; or entry by entry with the payee's PAN.
 * Exact bigint arithmetic from `summariseTds`; pair it with `tdsToCsv` for the export behind a return.
 *
 * Categories and rates are your data. The package ships no withholding table, and the figures you file must come
 * from your books and be checked again on the server.
 */
import type { ReactNode } from 'react';

import type { RoundingMode } from '../calculations/rounding.ts';
import { nepalLedgerMoney } from '../debit-credit/DebitCredit.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import type { MoneyFormatConfig } from '../money/money.ts';
import { RetryNote } from '../retry-note/RetryNote.tsx';
import { Note } from '../states/States.tsx';
import { Cell, DataListRow, DataTable, type Column } from '../table/Table.tsx';
import { ratePercent } from '../tax/invoice.ts';
import { formatPan } from '../tax/pan.ts';
import { summariseTds, type TdsEntryInput } from '../tax/tds.ts';

export interface TdsSummaryLabels {
  category: string; rate: string; count: string; gross: string; tds: string; net: string; party: string; pan: string; total: string; mixed: string; invalid: string;
}

export const DEFAULT_TDS_SUMMARY_LABELS: TdsSummaryLabels = {
  category: 'Category', rate: 'Rate', count: 'Payments', gross: 'Gross paid', tds: 'TDS', net: 'Net paid', party: 'Payee', pan: 'PAN', total: 'Total',
  mixed: 'Mixed', invalid: 'An entry has a negative or malformed amount or rate, so no summary is shown.',
};

export interface TdsSummaryProps {
  /** Names the table: "TDS, Kartik 2082 (NPR)". */
  caption: string;
  entries: readonly TdsEntryInput[];
  /** 'category' (default): one row per category. 'entries': one row per payment. */
  view?: 'category' | 'entries';
  /** Rounding of gross × rate. Default 'half-up'. */
  rounding?: RoundingMode;
  /** Currency and locale. Default NPR, en-IN, no currency mark (name it in the caption). */
  money?: MoneyFormatConfig;
  labels?: Partial<TdsSummaryLabels>;
  bare?: boolean;
  state?: 'ready' | 'loading' | 'error';
  emptyLabel?: ReactNode;
  loadingLabel?: string;
  errorLabel?: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  testId?: string;
}

const pct = (rate: string) => `${ratePercent(rate)}%`;

export function TdsSummary({
  caption, entries, view = 'category', rounding = 'half-up', money = nepalLedgerMoney, labels, bare, state = 'ready', emptyLabel = 'No tax deducted in this period.',
  loadingLabel = 'Loading TDS…', errorLabel = 'The TDS summary could not be loaded.', retryLabel = 'Try again', onRetry, testId,
}: TdsSummaryProps) {
  const words = { ...DEFAULT_TDS_SUMMARY_LABELS, ...labels };
  if (state === 'error') return <RetryNote retryLabel={retryLabel} onRetry={onRetry} testId={testId}>{errorLabel}</RetryNote>;
  let result: ReturnType<typeof summariseTds>;
  try {
    result = summariseTds(state === 'ready' ? entries : [], { rounding });
    for (const entry of result.entries) ratePercent(entry.rate);
  } catch {
    return <div role="alert" data-testid={testId}><Note tone="error">{words.invalid}</Note></div>;
  }
  const amount = (value: bigint, id?: string) => <MoneyDisplay value={value} preset={money} testId={id && testId ? `${testId}-${id}` : undefined} />;
  const empty = result.entries.length === 0;
  if (view === 'entries') {
    const columns: Column<'party' | 'pan' | 'category' | 'gross' | 'rate' | 'tds' | 'net'>[] = [
      { key: 'party', label: words.party }, { key: 'pan', label: words.pan, wide: true }, { key: 'category', label: words.category, wide: true },
      { key: 'gross', label: words.gross, num: true }, { key: 'rate', label: words.rate, num: true }, { key: 'tds', label: words.tds, num: true }, { key: 'net', label: words.net, num: true, wide: true },
    ];
    return (
      <div className="pu-tds" data-testid={testId}>
        <DataTable caption={caption} columns={columns} bare={bare} stack loading={state === 'loading'} loadingLabel={loadingLabel} empty={emptyLabel} testId={testId ? `${testId}-table` : undefined}>
          {empty ? null : [
            ...result.entries.map((entry) => (
              <DataListRow key={entry.id} testId={testId ? `${testId}-entry-${entry.id}` : undefined}>
                <Cell header>{entry.party}</Cell>
                <Cell wide label={words.pan}><span className="pu-tds-pan">{entry.pan ? formatPan(entry.pan) : '—'}</span></Cell>
                <Cell wide label={words.category}>{entry.category}</Cell>
                <Cell num label={words.gross}>{amount(entry.gross)}</Cell>
                <Cell num label={words.rate}>{pct(entry.rate)}</Cell>
                <Cell num label={words.tds}>{amount(entry.tds)}</Cell>
                <Cell num wide label={words.net}>{amount(entry.net)}</Cell>
              </DataListRow>
            )),
            <DataListRow key="__total" testId={testId ? `${testId}-total` : undefined}>
              <th scope="row" className="pu-tds-total">{words.total}</th>
              <td className="wide">{null}</td><td className="wide">{null}</td>
              <td className="num pu-tds-total" data-label={words.gross}>{amount(result.totals.gross, 'total-gross')}</td>
              <td className="num">{null}</td>
              <td className="num pu-tds-total" data-label={words.tds}>{amount(result.totals.tds, 'total-tds')}</td>
              <td className="num wide pu-tds-total" data-label={words.net}>{amount(result.totals.net)}</td>
            </DataListRow>,
          ]}
        </DataTable>
      </div>
    );
  }
  const columns: Column<'category' | 'rate' | 'count' | 'gross' | 'tds'>[] = [
    { key: 'category', label: words.category }, { key: 'rate', label: words.rate, num: true }, { key: 'count', label: words.count, num: true, wide: true },
    { key: 'gross', label: words.gross, num: true }, { key: 'tds', label: words.tds, num: true },
  ];
  return (
    <div className="pu-tds" data-testid={testId}>
      <DataTable caption={caption} columns={columns} bare={bare} stack loading={state === 'loading'} loadingLabel={loadingLabel} empty={emptyLabel} testId={testId ? `${testId}-table` : undefined}>
        {empty ? null : [
          ...result.categories.map((category) => (
            <DataListRow key={category.category} testId={testId ? `${testId}-category-${category.category}` : undefined}>
              <Cell header>{category.category}</Cell>
              <Cell num label={words.rate}>{category.rate === null ? words.mixed : pct(category.rate)}</Cell>
              <Cell num wide label={words.count}>{category.count}</Cell>
              <Cell num label={words.gross}>{amount(category.gross)}</Cell>
              <Cell num label={words.tds}>{amount(category.tds)}</Cell>
            </DataListRow>
          )),
          <DataListRow key="__total" testId={testId ? `${testId}-total` : undefined}>
            <th scope="row" className="pu-tds-total">{words.total}</th>
            <td className="num">{null}</td>
            <td className="num wide pu-tds-total" data-label={words.count}>{result.entries.length}</td>
            <td className="num pu-tds-total" data-label={words.gross}>{amount(result.totals.gross, 'total-gross')}</td>
            <td className="num pu-tds-total" data-label={words.tds}>{amount(result.totals.tds, 'total-tds')}</td>
          </DataListRow>,
        ]}
      </DataTable>
    </div>
  );
}
