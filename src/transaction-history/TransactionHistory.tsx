'use client';

/**
 * TransactionHistory: buys, sells, bonus issues, rights and dividends as a
 * filterable, paged list. Filters: type chips (several at once), one symbol,
 * and a date range (DateRangePicker). It is a composition over
 * `transactionLedger` (which replays each symbol's trades through
 * computePosition, so every sale shows its realised P&L), DataTable (paging,
 * stacked phone layout, states) and the existing chips, select and picker.
 *
 * The ledger is computed over the whole history and filtered afterwards, so
 * filtering never changes a sale's result. Rows are keyed by transaction id.
 * Filters are uncontrolled by default; pass `filters` and `onFiltersChange`
 * to control them (for example to keep them in the URL). The totals row sums
 * the cash flow and realised P&L of everything the filters match, not just
 * the visible page.
 */
import { useMemo, useState, type ReactNode } from 'react';

import { Chip } from '../controls/Controls.tsx';
import { DateRangePicker } from '../date-picker/DatePicker.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { Button } from '../button/Button.tsx';
import type { MoneyFormatConfig } from '../money/money.ts';
import { formatCalendarDate } from '../nepal/date-only.ts';
import { formatQuantity } from '../nepal/market-format.ts';
import { filterTransactions, TRANSACTION_TYPES, transactionLedger, type PortfolioTransaction, type TransactionFilters, type TransactionLedgerOptions, type PortfolioLedgerRow, type TransactionType } from '../portfolio/portfolio.ts';
import type { PriceChangeLabels } from '../price-change/PriceChange.tsx';
import { ChangeFigure, Missing } from '../portfolio/shared.tsx';
import { RetryNote } from '../retry-note/RetryNote.tsx';
import { Select } from '../select/Select.tsx';
import { nepalQuoteMoney } from '../stock-table/format.ts';
import { Cell, DataListRow, DataTable, type Column } from '../table/Table.tsx';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';

export interface TransactionHistoryLabels {
  /** Names of the types, in the reader's language. */
  types?: Partial<Record<TransactionType, string>>;
  date?: string;
  type?: string;
  symbol?: string;
  quantity?: string;
  price?: string;
  fees?: string;
  /** Head of the signed cash flow column. Default 'Amount'. */
  amount?: string;
  /** Head of the realised P&L column. Default 'Realised P&L'. */
  realised?: string;
  /** Accessible name of the type chip group. Default 'Transaction types'. */
  typeFilter?: string;
  /** Accessible name of the symbol select. Default 'Symbol'. */
  symbolFilter?: string;
  /** The symbol select's first option. Default 'All symbols'. */
  allSymbols?: string;
  /** Accessible name of the date range picker. Default 'Date range'. */
  dateFilter?: string;
  /** The clear-filters button. Default 'Clear filters'. */
  clear?: string;
  /** The totals row's head. Default 'Total'. */
  total?: string;
}

export interface TransactionHistoryProps extends TransactionLedgerOptions {
  /** The whole history, in any order. Money is bigint minor units, dates strict ISO. The ledger sorts by date and rejects invalid records. */
  transactions: readonly PortfolioTransaction[];
  /** Names the table region and its pager. */
  caption: string;
  /** The filters being applied (controlled). */
  filters?: TransactionFilters;
  /** The filters to start with when uncontrolled. */
  defaultFilters?: TransactionFilters;
  /** Called with the new filters whenever a control changes. */
  onFiltersChange?: (filters: TransactionFilters) => void;
  /** Rows per page. Default 10. */
  pageSize?: number;
  /** `newest` (default) or `oldest` first. */
  order?: 'newest' | 'oldest';
  /** Prints a date. Default `formatCalendarDate` (Gregorian, '14 Nov 2025'); pass a function that goes through `gregorianToBS` for Bikram Sambat. */
  formatDate?: (iso: string) => string;
  /** Currency and locale. Default NPR, en-IN, no currency mark. */
  money?: MoneyFormatConfig;
  /** Which colour means a gain. Default green-up. */
  convention?: 'green-up' | 'red-up';
  /** Spoken direction words for the signed figures. */
  changeLabels?: PriceChangeLabels;
  /** Overrides for the printed words. */
  labels?: TransactionHistoryLabels;
  /** The earliest and latest dates the range picker offers (ISO). */
  minDate?: string;
  /** See `minDate`. */
  maxDate?: string;
  /** ready (default), loading or error. */
  state?: 'ready' | 'loading' | 'error';
  /** Shown when the history is empty. Default 'No transactions yet.' */
  emptyLabel?: ReactNode;
  /** Shown when the filters match nothing. Default 'No transactions match these filters.' */
  noMatchLabel?: ReactNode;
  /** The loading status line. Default 'Loading transactions…'. */
  loadingLabel?: string;
  /** What failed. Default 'Transactions could not be loaded.' */
  errorLabel?: ReactNode;
  /** The retry button's words. Default 'Try again'. */
  retryLabel?: string;
  /** Called when the retry button is pressed. */
  onRetry?: () => void;
  /** Sets `data-testid` on the root; rows are `<id>-row-<transaction id>`. */
  testId?: string;
}

type Key = 'date' | 'type' | 'symbol' | 'quantity' | 'price' | 'fees' | 'amount' | 'realised';
const TYPE_WORDS: Record<TransactionType, string> = { buy: 'Buy', sell: 'Sell', bonus: 'Bonus', rights: 'Rights', dividend: 'Dividend' };
const NO_FILTERS: TransactionFilters = {};
const blank = (value: unknown, render: () => ReactNode): ReactNode => (value === undefined ? null : render());

export function TransactionHistory({
  transactions, caption, filters: controlled, defaultFilters = NO_FILTERS, onFiltersChange, pageSize = 10, order = 'newest', formatDate = (iso) => formatCalendarDate(iso),
  money = nepalQuoteMoney, convention = 'green-up', changeLabels, labels, minDate, maxDate, state = 'ready', emptyLabel = 'No transactions yet.',
  noMatchLabel = 'No transactions match these filters.', loadingLabel = 'Loading transactions…', errorLabel = 'Transactions could not be loaded.', retryLabel = 'Try again',
  onRetry, testId, method, rounding,
}: TransactionHistoryProps) {
  const [filters, setFilters] = useControllableState<TransactionFilters>({ value: controlled, defaultValue: defaultFilters, onChange: onFiltersChange, name: 'TransactionHistory filters' });
  const [pageIndex, setPageIndex] = useState(0);
  const ledger = useMemo<PortfolioLedgerRow[]>(
    () => (state === 'ready' ? transactionLedger(transactions, { ...(method ? { method } : {}), ...(rounding ? { rounding } : {}) }) : []),
    [transactions, state, method, rounding],
  );
  if (state === 'error') return <RetryNote retryLabel={retryLabel} onRetry={onRetry} testId={testId}>{errorLabel}</RetryNote>;

  const word = (type: TransactionType) => labels?.types?.[type] ?? TYPE_WORDS[type];
  const text = {
    date: labels?.date ?? 'Date', type: labels?.type ?? 'Type', symbol: labels?.symbol ?? 'Symbol', quantity: labels?.quantity ?? 'Quantity', price: labels?.price ?? 'Price',
    fees: labels?.fees ?? 'Fees', amount: labels?.amount ?? 'Amount', realised: labels?.realised ?? 'Realised P&L',
  };
  const change = (filtersNext: TransactionFilters) => { setFilters(filtersNext); setPageIndex(0); };
  const matched = filterTransactions(ledger, filters);
  const ordered = order === 'newest' ? matched.toReversed() : matched;
  const rowCount = ordered.length;
  const lastPage = Math.max(0, Math.ceil(rowCount / pageSize) - 1);
  const index = Math.min(pageIndex, lastPage);
  const page = ordered.slice(index * pageSize, index * pageSize + pageSize);

  const types = filters.types ?? [];
  const toggle = (type: TransactionType) => change({ ...filters, types: types.includes(type) ? types.filter((t) => t !== type) : [...types, type] });
  const symbols = [...new Set(ledger.map((row) => row.symbol))].toSorted();
  const active = types.length > 0 || Boolean(filters.symbol) || Boolean(filters.range);

  const columns: Column<Key>[] = [
    { key: 'date', label: text.date },
    { key: 'type', label: text.type },
    { key: 'symbol', label: text.symbol },
    { key: 'quantity', label: text.quantity, num: true },
    { key: 'price', label: text.price, num: true },
    { key: 'fees', label: text.fees, num: true, wide: true },
    { key: 'amount', label: text.amount, num: true },
    { key: 'realised', label: text.realised, num: true },
  ];
  const sells = matched.filter((row) => row.realisedPnL !== null);
  const footer = rowCount > 0 ? (
    <DataListRow testId={testId ? `${testId}-total` : undefined}>
      <Cell header sym>{labels?.total ?? 'Total'}</Cell>
      <Cell label={text.type}>{null}</Cell>
      <Cell label={text.symbol}>{null}</Cell>
      <Cell num label={text.quantity}>{null}</Cell>
      <Cell num label={text.price}>{null}</Cell>
      <Cell num wide label={text.fees}>{null}</Cell>
      <Cell num label={text.amount}><span className="pu-wide"><ChangeFigure absolute={matched.reduce((n, row) => n + row.cashFlow, 0n)} percent={null} money={money} convention={convention} labels={changeLabels} showPercent={false} /></span></Cell>
      <Cell num label={text.realised}>{sells.length > 0 ? <span className="pu-wide"><ChangeFigure absolute={sells.reduce((n, row) => n + row.realisedPnL!, 0n)} percent={null} money={money} convention={convention} labels={changeLabels} showPercent={false} /></span> : null}</Cell>
    </DataListRow>
  ) : undefined;

  return (
    <div className="pu-tx" data-testid={testId}>
      <div className="pu-tx-filters">
        <div className="kit-chips wrap" role="group" aria-label={labels?.typeFilter ?? 'Transaction types'}>
          {TRANSACTION_TYPES.map((type) => (
            <Chip key={type} size="sm" selected={types.includes(type)} onClick={() => toggle(type)} testId={testId ? `${testId}-type-${type}` : undefined}>{word(type)}</Chip>
          ))}
        </div>
        <div className="pu-tx-controls">
          <Select
            size="md"
            label={labels?.symbolFilter ?? 'Symbol'}
            labelPlacement="above"
            value={filters.symbol ?? ''}
            onChange={(symbol) => change({ ...filters, symbol })}
            options={[{ value: '', label: labels?.allSymbols ?? 'All symbols' }, ...symbols.map((symbol) => ({ value: symbol, label: symbol }))]}
            testId={testId ? `${testId}-symbol` : undefined}
          />
          <DateRangePicker
            label={labels?.dateFilter ?? 'Date range'}
            value={filters.range ?? null}
            onChange={(range) => change({ ...filters, range })}
            {...(minDate ? { min: minDate } : {})}
            {...(maxDate ? { max: maxDate } : {})}
          />
          {active && <Button variant="ghost" size="sm" onClick={() => change({})} testId={testId ? `${testId}-clear` : undefined}>{labels?.clear ?? 'Clear filters'}</Button>}
        </div>
      </div>
      <DataTable
        caption={caption}
        columns={columns}
        bare
        stack
        loading={state === 'loading'}
        loadingLabel={loadingLabel}
        empty={ledger.length === 0 ? emptyLabel : noMatchLabel}
        pagination={rowCount > pageSize ? { pageIndex: index, pageSize, rowCount, onPageChange: setPageIndex, testIdPrefix: testId ? `${testId}-page` : undefined } : undefined}
        footer={footer}
      >
        {page.map((row) => (
          <DataListRow key={row.id} testId={testId ? `${testId}-row-${row.id}` : undefined}>
            <Cell header sym>
              <b>{formatDate(row.date)}</b>
              {row.note && <span className="sub">{row.note}</span>}
            </Cell>
            <Cell label={text.type}><span className="pu-tx-type" data-type={row.type}>{word(row.type)}</span></Cell>
            <Cell label={text.symbol}><b>{row.symbol}</b></Cell>
            <Cell num label={text.quantity}>{blank(row.quantity, () => formatQuantity(Number(row.quantity)))}</Cell>
            <Cell num label={text.price}>{row.type === 'dividend' ? null : row.type === 'bonus' ? <Missing label="Free" /> : <MoneyDisplay value={row.price ?? null} preset={money} />}</Cell>
            <Cell num wide label={text.fees}>{row.fees === undefined ? null : <MoneyDisplay value={row.fees} preset={money} />}</Cell>
            <Cell num label={text.amount}>{row.type === 'bonus' ? null : <span className="pu-wide"><ChangeFigure absolute={row.cashFlow} percent={null} money={money} convention={convention} labels={changeLabels} showPercent={false} /></span>}</Cell>
            <Cell num label={text.realised}>{row.realisedPnL === null ? null : <span className="pu-wide"><ChangeFigure absolute={row.realisedPnL} percent={null} money={money} convention={convention} labels={changeLabels} showPercent={false} /></span>}</Cell>
          </DataListRow>
        ))}
      </DataTable>
    </div>
  );
}
