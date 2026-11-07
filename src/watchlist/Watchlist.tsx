'use client';

/**
 * Watchlist: the stocks a person follows, in their own order. Rows are
 * keyed by symbol and rendered in the order you pass, so live values change in
 * place and nothing jumps under the pointer; sorting is yours to offer, and
 * `useStableOrder` keeps a sorted list still while prices tick. Reorder and
 * remove are real buttons (Alt+Up and Alt+Down also move the focused row), and
 * each change is announced. The caller owns the list: `onReorder` and
 * `onRemove` say what was asked, they change nothing here.
 */
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { EmptyState, Skeleton } from '../states/States.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { PriceChange, type PriceChangeLabels } from '../price-change/PriceChange.tsx';
import { Sparkline } from '../sparkline/Sparkline.tsx';
import type { MoneyFormatConfig } from '../money/money.ts';
import { nepalQuoteMoney } from '../stock-table/format.ts';
import { QuoteLtp } from '../stock-table/QuoteLtp.tsx';
import type { Quote } from '../stock-table/quotes.ts';
import { moveItem } from './order.ts';

export { moveItem } from './order.ts';

export interface WatchlistLabels {
  moveUp: (symbol: string) => string;
  moveDown: (symbol: string) => string;
  remove: (symbol: string) => string;
  moved: (symbol: string, position: number, total: number) => string;
  removed: (symbol: string) => string;
}
/** Words for the optional month and since-added columns and the loading state. @stability beta */
export interface WatchlistColumnLabels {
  /** The month-change column ("1 month"). */
  month: string;
  /** The since-added column ("Since added"). */
  sinceAdded: string;
  /** Names the loading rows for assistive technology. */
  loading: string;
}
const EN_COLUMNS: WatchlistColumnLabels = { month: '1 month', sinceAdded: 'Since added', loading: 'Loading watchlist' };
const EN: WatchlistLabels = {
  moveUp: (s) => `Move ${s} up`,
  moveDown: (s) => `Move ${s} down`,
  remove: (s) => `Remove ${s} from watchlist`,
  moved: (s, p, t) => `${s} moved to position ${p} of ${t}`,
  removed: (s) => `${s} removed`,
};

/** A followed stock: a `Quote` plus the two reference prices the optional columns compare to. @stability beta */
export interface WatchlistQuote extends Quote {
  /** The price a month ago, minor units. The month column is `ltp` against it. Null prints a dash and a spoken "No value". */
  monthAgo?: bigint | null;
  /** The price when the person added it, minor units. The since-added column is `ltp` against it. */
  addedPrice?: bigint | null;
}

/** Which button of a row was used. Passed to `onMove` so focus can return to it. @stability beta */
export type WatchlistControl = 'up' | 'down' | 'remove';

/** @stability beta */
export interface WatchlistRowProps<T extends WatchlistQuote = WatchlistQuote> {
  /** The stock. */
  quote: T;
  /** Base for the buttons' ids (`<id>-up`, `<id>-down`, `<id>-remove`). Default generated. */
  id?: string;
  /** Currency and locale of the prices. Default NPR, en-IN, no currency mark. */
  money?: MoneyFormatConfig;
  /** Which hue means up: 'green-up' or 'red-up'. Default: follow the theme's gain and loss colours. */
  convention?: 'green-up' | 'red-up';
  /** Spoken direction words for the change. */
  changeLabels?: PriceChangeLabels;
  /** Trend line when the quote has history (default true). */
  showTrend?: boolean;
  /** LTP counts to each new value and flashes its direction. */
  live?: boolean;
  /** What the symbol cell holds. Default the symbol over the name. */
  renderSymbol?: (quote: T) => ReactNode;
  /** Adds the month-change column (`ltp` against `quote.monthAgo`). */
  showMonth?: boolean;
  /** Adds the since-added column (`ltp` against `quote.addedPrice`). */
  showSinceAdded?: boolean;
  /** Your own controls (an alert bell, a menu button), before the built-in ones. Give real `<button>`s as direct children: they take the row's icon-button style, each with its own accessible name. */
  actions?: ReactNode;
  /** Shows the move buttons, and Alt+Up / Alt+Down on the row's buttons. Called with the direction and the button used. */
  onMove?: (delta: -1 | 1, control: WatchlistControl) => void;
  /** The row is first: its move-up button is disabled. */
  first?: boolean;
  /** The row is last: its move-down button is disabled. */
  last?: boolean;
  /** Shows the remove button. */
  onRemove?: () => void;
  /** The names of the buttons and columns. */
  labels?: Partial<WatchlistLabels & WatchlistColumnLabels>;
  /** Sets `data-testid` on the row. */
  testId?: string;
}

/**
 * One row of a watchlist, standalone: put it in a `<ul className="pu-watchlist-list">` of your own (or let `Watchlist` do it).
 * @stability beta
 */
export function WatchlistRow<T extends WatchlistQuote = WatchlistQuote>({
  quote, id: idProp, money = nepalQuoteMoney, convention, changeLabels, showTrend = true, live, renderSymbol, showMonth, showSinceAdded, actions, onMove, first, last, onRemove, labels, testId,
}: WatchlistRowProps<T>) {
  const words = { ...EN, ...EN_COLUMNS, ...labels };
  const auto = useId();
  const id = idProp ?? auto;
  const trend = showTrend && (quote.history?.filter((v) => v !== null && v !== undefined).length ?? 0) >= 2;
  const onKeyDown = (event: KeyboardEvent, control: WatchlistControl) => {
    if (!onMove || !event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    onMove(event.key === 'ArrowUp' ? -1 : 1, control);
  };
  const extras: [string, bigint | null | undefined][] = [];
  if (showMonth) extras.push([words.month, quote.monthAgo]);
  if (showSinceAdded) extras.push([words.sinceAdded, quote.addedPrice]);
  return (
    <li className={`pu-watch-row${extras.length ? ' has-extra' : ''}`} data-testid={testId}>
      <span className="pu-watch-id">
        {renderSymbol ? renderSymbol(quote) : <><b>{quote.symbol}</b>{quote.name && <span className="sub">{quote.name}</span>}</>}
      </span>
      {trend && <span className="pu-watch-trend"><Sparkline values={quote.history} width={64} height={24} /></span>}
      <span className="pu-watch-price">
        <span className="pu-watch-ltp">{live ? <QuoteLtp quote={quote} money={money} live /> : <MoneyDisplay value={quote.ltp} preset={money} />}</span>
        <PriceChange current={quote.ltp} previous={quote.previousClose} preset={money} size="sm" convention={convention} labels={changeLabels} />
      </span>
      {(onMove || onRemove || actions) && (
        <span className="pu-watch-actions">
          {actions}
          {onMove && (
            <>
              <button type="button" id={`${id}-up`} aria-label={words.moveUp(quote.symbol)} disabled={first} onClick={() => onMove(-1, 'up')} onKeyDown={(e) => onKeyDown(e, 'up')}>
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 13V3M4 7l4-4 4 4" /></svg>
              </button>
              <button type="button" id={`${id}-down`} aria-label={words.moveDown(quote.symbol)} disabled={last} onClick={() => onMove(1, 'down')} onKeyDown={(e) => onKeyDown(e, 'down')}>
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 3v10M4 9l4 4 4-4" /></svg>
              </button>
            </>
          )}
          {onRemove && (
            <button type="button" id={`${id}-remove`} aria-label={words.remove(quote.symbol)} onClick={onRemove} onKeyDown={(e) => onKeyDown(e, 'remove')}>
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="m4 4 8 8M12 4l-8 8" /></svg>
            </button>
          )}
        </span>
      )}
      {extras.length > 0 && (
        <span className="pu-watch-extra">
          {extras.map(([label, previous]) => (
            <span key={label} className="pu-watch-fig">
              <span className="pu-watch-fig-label">{label}</span>
              <PriceChange current={quote.ltp} previous={previous} preset={money} size="sm" convention={convention} labels={changeLabels} />
            </span>
          ))}
        </span>
      )}
    </li>
  );
}

/** A row while the list loads: the same boxes, bars where the figures go, so nothing moves when they land. Decorative; name the loading list once. @stability beta */
export function WatchlistRowSkeleton({ showMonth, showSinceAdded }: {
  /** Leaves room for the month column. */
  showMonth?: boolean;
  /** Leaves room for the since-added column. */
  showSinceAdded?: boolean;
} = {}) {
  const extra = showMonth || showSinceAdded;
  return (
    <li className={`pu-watch-row${extra ? ' has-extra' : ''}`} aria-hidden="true" data-skeleton="">
      <span className="pu-watch-id"><Skeleton width={56} height={14} /><Skeleton width={120} height={10} style={{ marginTop: 6 }} /></span>
      <span className="pu-watch-price"><Skeleton width={64} height={14} /><Skeleton width={88} height={10} /></span>
      {extra && <span className="pu-watch-extra">{showMonth && <Skeleton width={96} height={10} />}{showSinceAdded && <Skeleton width={96} height={10} />}</span>}
    </li>
  );
}

export interface WatchlistProps<T extends WatchlistQuote = WatchlistQuote> {
  /** In display order. Symbols must be unique. */
  quotes: readonly T[];
  /** Names the list ("My watchlist"). */
  label: string;
  /** Called with the new symbol order. Give it to show the move buttons. */
  onReorder?: (symbols: string[]) => void;
  /** Called with the symbol to drop. Give it to show the remove buttons. */
  onRemove?: (symbol: string) => void;
  /** The names of the move and remove buttons, the announcements, and the optional columns, in the reader's language. Partial overrides of the English defaults. */
  labels?: Partial<WatchlistLabels & WatchlistColumnLabels>;
  /** Currency and locale of the prices. Default NPR, en-IN, no currency mark. */
  money?: MoneyFormatConfig;
  /** Per-instance override of which hue means up: 'green-up' or 'red-up' (absolute, never a second swap on top of the theme). Default: follow the theme's gain and loss colours (`createTheme({ finance })`), which is the one place to set the convention. */
  convention?: 'green-up' | 'red-up';
  /** Spoken direction words for the change. */
  changeLabels?: PriceChangeLabels;
  /** Trend line per row when a quote has history (default true). */
  showTrend?: boolean;
  /** LTP counts to each new value and flashes its direction. */
  live?: boolean;
  /** What the symbol cell holds, for example a link to the stock page. Default the symbol over the name. */
  renderSymbol?: (quote: T) => ReactNode;
  /** Adds a month-change column: `ltp` against each quote's `monthAgo`. @stability beta */
  showMonth?: boolean;
  /** Adds a since-added column: `ltp` against each quote's `addedPrice`. @stability beta */
  showSinceAdded?: boolean;
  /** Your own controls for a row (an alert bell, a menu button), before the built-in ones. Real `<button>`s as direct children take the row's icon-button style. @stability beta */
  actions?: (quote: T) => ReactNode;
  /** Draws placeholder rows (`skeletonRows`) in place of the list and marks it busy. @stability beta */
  loading?: boolean;
  /** How many placeholder rows. Default 3. */
  skeletonRows?: number;
  /** The title shown when `quotes` is empty. Default 'Your watchlist is empty'. */
  emptyTitle?: ReactNode;
  /** A line under the empty title: why it is empty or what to do. */
  emptyBody?: ReactNode;
  /** One button or link under the empty state, for example to find a company. */
  emptyAction?: ReactNode;
  /** Sets `data-testid` on the section; each row gets `<id>-row-<symbol>`. */
  testId?: string;
}

/**
 * @stability stable
 */
export function Watchlist<T extends WatchlistQuote = WatchlistQuote>({
  quotes, label, onReorder, onRemove, labels, money = nepalQuoteMoney, convention, changeLabels, showTrend = true, live, renderSymbol, showMonth, showSinceAdded, actions, loading, skeletonRows = 3,
  emptyTitle = 'Your watchlist is empty', emptyBody, emptyAction, testId,
}: WatchlistProps<T>) {
  const words = { ...EN, ...EN_COLUMNS, ...labels };
  const id = useId();
  const [announcement, setAnnouncement] = useState('');
  const focusRef = useRef<string | null>(null);
  const regionRef = useRef<HTMLElement>(null);
  const symbols = quotes.map((q) => q.symbol);

  // After the caller applies a move or a removal, put focus back where the person was.
  useLayoutEffect(() => {
    const target = focusRef.current;
    if (target === null) return;
    focusRef.current = null;
    let node = target === '' ? regionRef.current : document.getElementById(`${id}-${target}`);
    // The control that was used may now be disabled (a row moved to an end): use its partner.
    if (node instanceof HTMLButtonElement && node.disabled) node = document.getElementById(`${id}-${target.endsWith('-up') ? target.replace(/-up$/, '-down') : target.replace(/-down$/, '-up')}`);
    node?.focus();
  });

  const move = (symbol: string, delta: -1 | 1, control: WatchlistControl) => {
    const next = moveItem(symbols, symbol, delta);
    if (next.every((s, i) => s === symbols[i])) return;
    focusRef.current = `${symbol}-${control}`;
    setAnnouncement(words.moved(symbol, next.indexOf(symbol) + 1, next.length));
    onReorder?.(next);
  };
  const remove = (symbol: string) => {
    const i = symbols.indexOf(symbol);
    const neighbour = symbols[i + 1] ?? symbols[i - 1];
    focusRef.current = neighbour === undefined ? '' : `${neighbour}-remove`;
    setAnnouncement(words.removed(symbol));
    onRemove?.(symbol);
  };

  return (
    <section className="pu-watchlist" aria-label={label} ref={regionRef} tabIndex={-1} data-testid={testId} aria-busy={loading || undefined}>
      <div className="kit-sr" role="status" aria-live="polite">{loading ? words.loading : announcement}</div>
      {loading ? (
        <ul className="pu-watchlist-list">
          {Array.from({ length: Math.max(1, skeletonRows) }, (_, i) => <WatchlistRowSkeleton key={i} showMonth={showMonth} showSinceAdded={showSinceAdded} />)}
        </ul>
      ) : quotes.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} bare />
      ) : (
        <ul className="pu-watchlist-list">
          {quotes.map((quote, index) => (
            <WatchlistRow
              key={quote.symbol}
              quote={quote}
              id={`${id}-${quote.symbol}`}
              money={money}
              convention={convention}
              changeLabels={changeLabels}
              showTrend={showTrend}
              live={live}
              renderSymbol={renderSymbol}
              showMonth={showMonth}
              showSinceAdded={showSinceAdded}
              actions={actions?.(quote)}
              onMove={onReorder ? (delta, control) => move(quote.symbol, delta, control) : undefined}
              first={index === 0}
              last={index === quotes.length - 1}
              onRemove={onRemove ? () => remove(quote.symbol) : undefined}
              labels={labels}
              testId={testId ? `${testId}-row-${quote.symbol}` : undefined}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
