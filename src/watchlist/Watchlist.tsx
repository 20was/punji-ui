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

import { EmptyState } from '../states/States.tsx';
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
const EN: WatchlistLabels = {
  moveUp: (s) => `Move ${s} up`,
  moveDown: (s) => `Move ${s} down`,
  remove: (s) => `Remove ${s} from watchlist`,
  moved: (s, p, t) => `${s} moved to position ${p} of ${t}`,
  removed: (s) => `${s} removed`,
};

export interface WatchlistProps<T extends Quote = Quote> {
  /** In display order. Symbols must be unique. */
  quotes: readonly T[];
  /** Names the list ("My watchlist"). */
  label: string;
  /** Called with the new symbol order. Give it to show the move buttons. */
  onReorder?: (symbols: string[]) => void;
  /** Called with the symbol to drop. Give it to show the remove buttons. */
  onRemove?: (symbol: string) => void;
  /** The names of the move and remove buttons and the announcements, in the reader's language. Partial overrides of the English defaults. */
  labels?: Partial<WatchlistLabels>;
  /** Currency and locale of the prices. Default NPR, en-IN, no currency mark. */
  money?: MoneyFormatConfig;
  /** Which colour means up. Default green-up. */
  convention?: 'green-up' | 'red-up';
  /** Spoken direction words for the change. */
  changeLabels?: PriceChangeLabels;
  /** Trend line per row when a quote has history (default true). */
  showTrend?: boolean;
  /** LTP counts to each new value and flashes its direction. */
  live?: boolean;
  /** What the symbol cell holds, for example a link to the stock page. Default the symbol over the name. */
  renderSymbol?: (quote: T) => ReactNode;
  /** The title shown when `quotes` is empty. Default 'Your watchlist is empty'. */
  emptyTitle?: ReactNode;
  /** A line under the empty title: why it is empty or what to do. */
  emptyBody?: ReactNode;
  /** One button or link under the empty state, for example to find a company. */
  emptyAction?: ReactNode;
  /** Sets `data-testid` on the section; each row gets `<id>-row-<symbol>`. */
  testId?: string;
}

export function Watchlist<T extends Quote = Quote>({
  quotes, label, onReorder, onRemove, labels, money = nepalQuoteMoney, convention = 'green-up', changeLabels, showTrend = true, live, renderSymbol,
  emptyTitle = 'Your watchlist is empty', emptyBody, emptyAction, testId,
}: WatchlistProps<T>) {
  const words = { ...EN, ...labels };
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

  const move = (symbol: string, delta: -1 | 1, control: string) => {
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
  const onKeyDown = (event: KeyboardEvent, symbol: string, control: string) => {
    if (!onReorder || !event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    move(symbol, event.key === 'ArrowUp' ? -1 : 1, control);
  };

  return (
    <section className="pu-watchlist" aria-label={label} ref={regionRef} tabIndex={-1} data-testid={testId}>
      <div className="kit-sr" role="status" aria-live="polite">{announcement}</div>
      {quotes.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} bare />
      ) : (
        <ul className="pu-watchlist-list">
          {quotes.map((quote, index) => {
            const trend = showTrend && (quote.history?.filter((v) => v !== null && v !== undefined).length ?? 0) >= 2;
            return (
              <li key={quote.symbol} className="pu-watch-row" data-testid={testId ? `${testId}-row-${quote.symbol}` : undefined}>
                <span className="pu-watch-id">
                  {renderSymbol ? renderSymbol(quote) : <><b>{quote.symbol}</b>{quote.name && <span className="sub">{quote.name}</span>}</>}
                </span>
                {trend && <span className="pu-watch-trend"><Sparkline values={quote.history} width={64} height={24} /></span>}
                <span className="pu-watch-price">
                  <span className="pu-watch-ltp">{live ? <QuoteLtp quote={quote} money={money} live /> : <MoneyDisplay value={quote.ltp} preset={money} />}</span>
                  <PriceChange current={quote.ltp} previous={quote.previousClose} preset={money} size="sm" convention={convention} labels={changeLabels} />
                </span>
                {(onReorder || onRemove) && (
                  <span className="pu-watch-actions">
                    {onReorder && (
                      <>
                        <button type="button" id={`${id}-${quote.symbol}-up`} aria-label={words.moveUp(quote.symbol)} disabled={index === 0} onClick={() => move(quote.symbol, -1, 'up')} onKeyDown={(e) => onKeyDown(e, quote.symbol, 'up')}>
                          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 13V3M4 7l4-4 4 4" /></svg>
                        </button>
                        <button type="button" id={`${id}-${quote.symbol}-down`} aria-label={words.moveDown(quote.symbol)} disabled={index === quotes.length - 1} onClick={() => move(quote.symbol, 1, 'down')} onKeyDown={(e) => onKeyDown(e, quote.symbol, 'down')}>
                          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 3v10M4 9l4 4 4-4" /></svg>
                        </button>
                      </>
                    )}
                    {onRemove && (
                      <button type="button" id={`${id}-${quote.symbol}-remove`} aria-label={words.remove(quote.symbol)} onClick={() => remove(quote.symbol)} onKeyDown={(e) => onKeyDown(e, quote.symbol, 'remove')}>
                        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="m4 4 8 8M12 4l-8 8" /></svg>
                      </button>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
