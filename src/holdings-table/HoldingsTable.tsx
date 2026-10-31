'use client';

/**
 * HoldingsTable: a portfolio's holdings as a typed table, a thin composition
 * over DataTable (so sorting heads, captions and the stacked phone layout are
 * the table's own). Per holding: symbol over name, market value, quantity,
 * average cost, LTP, unrealised P&L (amount and percent), the day's change,
 * weight and an optional sector; a totals row sits in the table's `<tfoot>`.
 *
 * The figures come from `holdingsSummary(positions, quotes)`, which does the
 * exact bigint arithmetic through the calculations module. Nothing here
 * computes, fetches, sorts or filters: sort with `sortHoldings`, pass the
 * result as `holdings` and update `sort` from `onSortChange`. A holding
 * without a price shows a dash, never zero, and the totals say which symbols
 * they leave out.
 */
import { useState, type CSSProperties, type ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import { downloadText } from '../download/downloadText.ts';
import { CSV_MIME } from '../export/csv.ts';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { getMoneyFormatter, type MoneyFormatConfig } from '../money/money.ts';
import { formatQuantity } from '../nepal/market-format.ts';
import type { PriceChangeLabels } from '../price-change/PriceChange.tsx';
import { holdingsToCsv, nextHoldingSort, type Holding, type HoldingSort, type HoldingSortKey, type HoldingsTotals } from '../portfolio/portfolio.ts';
import { ChangeFigure, Missing, percentText } from '../portfolio/shared.tsx';
import { nepalQuoteMoney } from '../stock-table/format.ts';
import { RetryNote } from '../retry-note/RetryNote.tsx';
import { Cell, DataListRow, DataTable, type Column } from '../table/Table.tsx';

export type HoldingColumn = HoldingSortKey;

export const DEFAULT_HOLDING_COLUMNS: readonly HoldingColumn[] = ['symbol', 'value', 'quantity', 'cost', 'ltp', 'pnl', 'day', 'weight'];
const LABELS: Record<HoldingColumn, string> = {
  symbol: 'Symbol', value: 'Market value', quantity: 'Quantity', cost: 'Avg cost', ltp: 'LTP', pnl: 'Unrealised P&L', day: 'Day change', weight: 'Weight', sector: 'Sector',
};

export interface HoldingsTableLabels {
  /** The totals row's head. Default 'Total'. */
  total?: string;
  /** The CSV button's words. Default 'Export CSV'. */
  export?: string;
  /** The note under an incomplete total. Gets the symbols left out for want of a price and for want of a previous close. */
  incomplete?: (unpriced: readonly string[], noPreviousClose: readonly string[]) => ReactNode;
}

export interface HoldingsTableProps<T extends Holding = Holding> {
  /** Names the table region; also the sort announcements' subject. */
  caption: string;
  /** Rows in the order to show, from `holdingsSummary(...).holdings`. Sort them yourself (`sortHoldings`). Keys are `symbol`, so values can update in place. */
  holdings: readonly T[];
  /** From `holdingsSummary(...).totals`. When given, a totals row closes the table and a note names any symbol the totals leave out. */
  totals?: HoldingsTotals;
  /** Columns to show, in order. Default symbol, market value, quantity, average cost, LTP, unrealised P&L, day change, weight; `sector` is opt-in. `symbol` is always first. Feed it from `useColumnVisibility().visible`. */
  columns?: readonly HoldingColumn[];
  /** Overrides for the column heads, in the reader's language. */
  columnLabels?: Partial<Record<HoldingColumn, string>>;
  /** Other words: the totals head, the export button and the incomplete-totals note. */
  labels?: HoldingsTableLabels;
  /** The sort being shown. Heads are sort buttons only when `onSortChange` is given. */
  sort?: HoldingSort;
  /** Called with the sort a click on a head asks for (the rule `nextHoldingSort` implements). The table does not reorder rows: sort `holdings` yourself and pass `sort` back. */
  onSortChange?: (sort: HoldingSort) => void;
  /** Currency and locale of the money. Default NPR, en-IN, no currency mark. */
  money?: MoneyFormatConfig;
  /** Which colour means up. Default green-up. */
  convention?: 'green-up' | 'red-up';
  /** Spoken direction words for the P&L and day change. */
  changeLabels?: PriceChangeLabels;
  /** Fraction digits of the weight. Default 2. */
  weightDigits?: number;
  /** comfortable (default) or compact rows. */
  density?: 'comfortable' | 'compact';
  /** No box of its own: the table sits in a card or a panel. */
  bare?: boolean;
  /** The head sticks inside a box this tall that scrolls ('420px', 420). Without it the table is as tall as its rows. */
  maxHeight?: number | string;
  /** Rows become blocks under 640 px (default true). */
  stack?: boolean;
  /** What the symbol cell holds, for example a link to the stock page. Default the symbol over the name. */
  renderSymbol?: (holding: T) => ReactNode;
  /** With a file name ('holdings.csv'), a button above the table downloads the shown holdings and totals as CSV (exact decimals, formula-safe). */
  exportFilename?: string;
  /** ready (default), loading (headers stay, rows replaced by a status line) or error. */
  state?: 'ready' | 'loading' | 'error';
  /** Shown in place of rows when `holdings` is empty and `state` is `ready`. Default 'No holdings to show.' */
  emptyLabel?: ReactNode;
  /** The status line shown while `state` is `loading`. Default 'Loading holdings…'. */
  loadingLabel?: string;
  /** What failed, shown with the retry button when `state` is `error`. Default 'Holdings could not be loaded.' */
  errorLabel?: ReactNode;
  /** The retry button's words when `state` is `error`. Default 'Try again'. */
  retryLabel?: string;
  /** Called when the retry button is pressed. The error line shows the button only when this is given. */
  onRetry?: () => void;
  /** Sets `data-testid` on the root; inner parts get derived ids (`<id>-head-<column>`, `<id>-row-<symbol>`, `<id>-total`). */
  testId?: string;
}

const defaultIncomplete = (unpriced: readonly string[], noPreviousClose: readonly string[]): ReactNode => (
  <>
    {unpriced.length > 0 && <span>Totals leave out {unpriced.join(', ')} (no price). </span>}
    {noPreviousClose.length > 0 && <span>The day change leaves out {noPreviousClose.join(', ')} (no previous close).</span>}
  </>
);

export function HoldingsTable<T extends Holding = Holding>({
  caption, holdings, totals, columns = DEFAULT_HOLDING_COLUMNS, columnLabels, labels, sort, onSortChange, money = nepalQuoteMoney, convention = 'green-up',
  changeLabels, weightDigits = 2, density = 'comfortable', bare, maxHeight, stack = true, renderSymbol, exportFilename, state = 'ready',
  emptyLabel = 'No holdings to show.', loadingLabel = 'Loading holdings…', errorLabel = 'Holdings could not be loaded.', retryLabel = 'Try again', onRetry, testId,
}: HoldingsTableProps<T>) {
  const [exportError, setExportError] = useState(false);
  if (state === 'error') {
    return <RetryNote retryLabel={retryLabel} onRetry={onRetry} testId={testId}>{errorLabel}</RetryNote>;
  }
  const shown: HoldingColumn[] = ['symbol', ...columns.filter((c) => c !== 'symbol')];
  const label = (key: HoldingColumn) => columnLabels?.[key] ?? LABELS[key];
  const sortable = Boolean(onSortChange);
  const tableColumns: Column<HoldingColumn>[] = shown.map((key) => ({
    key,
    label: label(key),
    num: key !== 'symbol' && key !== 'sector',
    sortable: sortable,
    testId: testId ? `${testId}-head-${key}` : undefined,
  }));
  const style = maxHeight === undefined ? undefined : ({ '--holdings-max-h': typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } as CSSProperties);

  const cell = (key: HoldingColumn, h: T): ReactNode => {
    switch (key) {
      case 'symbol': return null;
      case 'value': return <MoneyDisplay value={h.marketValue} preset={money} />;
      case 'quantity': return <span className="pu-money">{formatQuantity(Number(h.quantity))}</span>;
      case 'cost': return <MoneyDisplay value={h.averageCost} preset={money} />;
      case 'ltp': return <MoneyDisplay value={h.ltp} preset={money} />;
      case 'pnl': return <span className="pu-wide"><ChangeFigure absolute={h.unrealisedPnL} percent={h.unrealisedPercent} money={money} convention={convention} labels={changeLabels} /></span>;
      case 'day': return <span className="pu-wide"><ChangeFigure absolute={h.dayChange} percent={h.dayChangePercent} money={money} convention={convention} labels={changeLabels} /></span>;
      case 'weight': {
        const text = percentText(h.displayWeight, money, weightDigits);
        return text === null ? <Missing /> : <span className="pu-money">{text}</span>;
      }
      case 'sector': return h.sector ? <span className="pu-wide">{h.sector}</span> : <Missing label="No sector" />;
    }
  };
  const totalCell = (key: HoldingColumn): ReactNode => {
    if (!totals) return null;
    switch (key) {
      case 'value': return <MoneyDisplay value={totals.marketValue} preset={money} />;
      case 'pnl': return <span className="pu-wide"><ChangeFigure absolute={totals.unrealisedPnL} percent={totals.unrealisedPercent} money={money} convention={convention} labels={changeLabels} /></span>;
      case 'day': return <span className="pu-wide"><ChangeFigure absolute={totals.dayChange} percent={totals.dayChangePercent} money={money} convention={convention} labels={changeLabels} /></span>;
      case 'weight': return totals.marketValue !== null && totals.marketValue > 0n ? <span className="pu-money">{percentText(100, money, weightDigits)}</span> : null;
      default: return null;
    }
  };
  const footer = totals ? (
    <DataListRow testId={testId ? `${testId}-total` : undefined}>
      {shown.map((key) => key === 'symbol'
        ? <Cell key={key} header sym>{labels?.total ?? 'Total'}</Cell>
        : <Cell key={key} num={key !== 'sector'} label={label(key)}>{totalCell(key)}</Cell>)}
    </DataListRow>
  ) : undefined;

  const exponent = getMoneyFormatter(money).exponent;
  const onExport = () => {
    try {
      downloadText(exportFilename!, holdingsToCsv(holdings, { scale: exponent, ...(totals ? { totals } : {}) }), CSV_MIME);
      setExportError(false);
    } catch {
      setExportError(true);
    }
  };
  const incomplete = totals && !totals.complete ? (labels?.incomplete ?? defaultIncomplete)(totals.unpriced, totals.noPreviousClose) : null;

  return (
    <div className="pu-holdings" data-density={density} data-testid={testId} style={style}>
      {exportFilename && (
        <div className="pu-holdings-tools">
          <Button variant="secondary" size="sm" onClick={onExport} disabled={state !== 'ready' || holdings.length === 0} testId={testId ? `${testId}-export` : undefined}>{labels?.export ?? 'Export CSV'}</Button>
          {exportError && <span role="alert" className="pu-holdings-note">The file could not be saved.</span>}
        </div>
      )}
      <DataTable
        caption={caption}
        columns={tableColumns}
        sort={sort}
        onSort={sortable ? (key) => onSortChange!(nextHoldingSort(sort, key)) : undefined}
        sortTestIdPrefix={testId ? `${testId}-sort` : 'sort'}
        bare={bare}
        stack={stack}
        loading={state === 'loading'}
        loadingLabel={loadingLabel}
        empty={emptyLabel}
        footer={footer}
      >
        {holdings.map((h) => (
          <DataListRow key={h.symbol} rowId={h.symbol} testId={testId ? `${testId}-row-${h.symbol}` : undefined}>
            {shown.map((key) => key === 'symbol'
              ? <Cell key={key} header sym>
                  {renderSymbol ? renderSymbol(h) : <><b>{h.symbol}</b>{h.name && <span className="sub">{h.name}</span>}</>}
                </Cell>
              : <Cell key={key} num={key !== 'sector'} label={label(key)}>{cell(key, h)}</Cell>)}
          </DataListRow>
        ))}
      </DataTable>
      {incomplete && state === 'ready' && holdings.length > 0 && <p className="pu-holdings-note" data-testid={testId ? `${testId}-incomplete` : undefined}>{incomplete}</p>}
    </div>
  );
}
