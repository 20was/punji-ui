'use client';

/**
 * StockTable: quotes as a typed table. A thin composition over DataTable, so
 * sorting heads, selection, captions and the stacked phone layout are the
 * table's own. Columns: symbol over name, LTP, change (PriceChange: sign,
 * arrow and a spoken word, never colour alone), volume and turnover (compact),
 * an optional trend line. Figures are right aligned in tabular digits.
 *
 * The caller owns the data and the sort: sort with `sortQuotes`, pass the
 * result as `quotes`, and update `sort` from `onSortChange`. Nothing here
 * fetches, re-sorts or filters.
 */
import type { CSSProperties, ReactNode } from 'react';

import { Cell, DataListRow, DataTable, type Column } from '../table/Table.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { PriceChange, type PriceChangeLabels } from '../price-change/PriceChange.tsx';
import { RetryNote } from '../retry-note/RetryNote.tsx';
import { Sparkline } from '../sparkline/Sparkline.tsx';
import type { MoneyFormatConfig } from '../money/money.ts';
import { compactCount, nepalQuoteMoney } from './format.ts';
import { QuoteLtp } from './QuoteLtp.tsx';
import { quoteChangePercent, type Quote, type QuoteSort } from './quotes.ts';

export { compactCount, nepalQuoteMoney } from './format.ts';
export { nextQuoteSort, quoteChange, quoteChangePercent, sortQuotes } from './quotes.ts';
export type { Quote, QuoteSort, QuoteSortKey } from './quotes.ts';

export type StockColumn = 'symbol' | 'ltp' | 'change' | 'volume' | 'turnover' | 'trend';

export const DEFAULT_STOCK_COLUMNS: readonly StockColumn[] = ['symbol', 'ltp', 'change', 'volume', 'turnover'];
const SORTABLE: ReadonlySet<StockColumn> = new Set(['symbol', 'ltp', 'change', 'volume', 'turnover']);
const LABELS: Record<StockColumn, string> = { symbol: 'Symbol', ltp: 'LTP', change: 'Change', volume: 'Volume', turnover: 'Turnover', trend: 'Trend' };

export interface StockTableProps<T extends Quote = Quote> {
  /** Names the table region; also the sort and selection announcements' subject. */
  caption: string;
  /** Rows in the order to show. Sort them yourself (`sortQuotes`). Keys are `symbol`, so values can update in place. */
  quotes: readonly T[];
  /** Columns to show, in order. Default symbol, LTP, change, volume, turnover. `symbol` is always shown. Feed it from `useColumnVisibility().visible`. */
  columns?: readonly StockColumn[];
  /** Overrides for the column heads, in the reader's language. */
  labels?: Partial<Record<StockColumn, string>>;
  /** The sort being shown. Heads are sort buttons only when `onSortChange` is given. */
  sort?: QuoteSort;
  onSortChange?: (sort: QuoteSort) => void;
  /** Currency and locale of prices and turnover. Default NPR, en-IN, no currency mark. */
  money?: MoneyFormatConfig;
  /** Which colour means up. Default green-up. */
  convention?: 'green-up' | 'red-up';
  /** Spoken direction words for the change. */
  changeLabels?: PriceChangeLabels;
  /** Selected symbols (controlled). Give `onSelectedSymbolsChange` to show checkboxes. */
  selectedSymbols?: readonly string[];
  onSelectedSymbolsChange?: (symbols: readonly string[]) => void;
  /** Accessible name of a row checkbox. Default `Select NABIL`. */
  selectLabel?: (symbol: string) => string;
  /** comfortable (default) or compact rows. */
  density?: 'comfortable' | 'compact';
  /** No box of its own: the table sits in a card or a panel. */
  bare?: boolean;
  /** The head sticks inside a box this tall that scrolls ('420px', 420). Without it the table is as tall as its rows. */
  maxHeight?: number | string;
  /** The head sticks to the page as it scrolls (wide screens). */
  stickToPage?: boolean;
  /** Rows become blocks under 640 px (default true). */
  stack?: boolean;
  /** The LTP counts to each new value and flashes its direction (needs live data; honours reduced motion). */
  live?: boolean;
  /** What the symbol cell holds, for example a link to the stock page. Default the symbol over the name. */
  renderSymbol?: (quote: T) => ReactNode;
  /** ready (default), loading (headers stay, rows replaced by a status line) or error. */
  state?: 'ready' | 'loading' | 'error';
  emptyLabel?: ReactNode;
  loadingLabel?: string;
  errorLabel?: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  testId?: string;
}

export function StockTable<T extends Quote = Quote>({
  caption, quotes, columns = DEFAULT_STOCK_COLUMNS, labels, sort, onSortChange, money = nepalQuoteMoney, convention = 'green-up', changeLabels,
  selectedSymbols, onSelectedSymbolsChange, selectLabel = (symbol) => `Select ${symbol}`, density = 'comfortable', bare, maxHeight, stickToPage,
  stack = true, live, renderSymbol, state = 'ready', emptyLabel = 'No quotes to show.', loadingLabel = 'Loading quotes…', errorLabel = 'Quotes could not be loaded.',
  retryLabel = 'Try again', onRetry, testId,
}: StockTableProps<T>) {
  if (state === 'error') {
    return <RetryNote retryLabel={retryLabel} onRetry={onRetry ?? (() => undefined)} testId={testId}>{errorLabel}</RetryNote>;
  }
  const shown: StockColumn[] = ['symbol', ...columns.filter((c) => c !== 'symbol')];
  const sortable = Boolean(onSortChange);
  const tableColumns: Column<StockColumn>[] = shown.map((key) => ({
    key,
    label: labels?.[key] ?? LABELS[key],
    num: key !== 'symbol' && key !== 'trend',
    sortable: sortable && SORTABLE.has(key),
    testId: testId ? `${testId}-head-${key}` : undefined,
  }));
  const activeKey: StockColumn | undefined = sort ? (sort.key === 'changePercent' || sort.key === 'change' ? 'change' : sort.key) : undefined;
  const selection = onSelectedSymbolsChange ? {
    selectedRowIds: selectedSymbols ?? [],
    onChange: onSelectedSymbolsChange,
    rowLabel: selectLabel,
    testIdPrefix: testId ? `${testId}-select` : undefined,
  } : undefined;
  const style = maxHeight === undefined ? undefined : ({ '--stock-max-h': typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } as CSSProperties);

  const cell = (key: StockColumn, quote: T): ReactNode => {
    switch (key) {
      case 'symbol':
        return null;
      case 'ltp':
        return <QuoteLtp quote={quote} money={money} live={live} />;
      case 'change':
        return <PriceChange current={quote.ltp} previous={quote.previousClose} preset={money} size="sm" convention={convention} labels={changeLabels} />;
      case 'volume': {
        const text = compactCount(quote.volume, money);
        return text === null ? <span className="pu-money pu-money-missing"><span aria-hidden="true">—</span><span className="kit-sr">No value</span></span> : <span className="pu-money">{text}</span>;
      }
      case 'turnover':
        return <MoneyDisplay value={quote.turnover} preset={money} compact />;
      case 'trend': {
        const pct = quoteChangePercent(quote);
        return <Sparkline values={quote.history} width={72} height={24} tone={pct === null ? 'flat' : undefined} />;
      }
    }
  };

  return (
    <div className="pu-stock" data-density={density} data-testid={testId} style={style}>
      <DataTable
        caption={caption}
        columns={tableColumns}
        sort={activeKey && sort ? { key: activeKey, dir: sort.dir } : undefined}
        onSort={sortable ? (key) => {
          const keyAsSort = key === 'change' ? 'changePercent' : key;
          if (keyAsSort === 'trend') return;
          onSortChange!(activeKey === key && sort ? { key: sort.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key: keyAsSort, dir: key === 'symbol' ? 'asc' : 'desc' });
        } : undefined}
        sortTestIdPrefix={testId ? `${testId}-sort` : 'sort'}
        bare={bare}
        stack={stack}
        stickToPage={stickToPage}
        selection={selection}
        loading={state === 'loading'}
        loadingLabel={loadingLabel}
        empty={emptyLabel}
      >
        {quotes.map((quote) => (
          <DataListRow key={quote.symbol} rowId={quote.symbol} testId={testId ? `${testId}-row-${quote.symbol}` : undefined}>
            {shown.map((key) => key === 'symbol'
              ? <Cell key={key} header sym>
                  {renderSymbol ? renderSymbol(quote) : <><b>{quote.symbol}</b>{quote.name && <span className="sub">{quote.name}</span>}</>}
                </Cell>
              : <Cell key={key} num={key !== 'trend'} label={labels?.[key] ?? LABELS[key]}>{cell(key, quote)}</Cell>)}
          </DataListRow>
        ))}
      </DataTable>
    </div>
  );
}
