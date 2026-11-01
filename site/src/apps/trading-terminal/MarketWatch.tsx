import { useMemo, useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PriceChange } from '@punji/ui/price-change';
import { StockTable, sortQuotes, type QuoteSort } from '@punji/ui/stock-table';
import { compactCount } from '@punji/ui/stock-table';
import { ScreenTitle } from '../shared/kit.tsx';
import { npr, quoteOf, useTerminal } from './store.ts';

type Filter = 'all' | 'watchlist' | 'gainers' | 'losers';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'watchlist', label: 'Watchlist' },
  { value: 'gainers', label: 'Gainers' },
  { value: 'losers', label: 'Losers' },
];
const quoteMoney = { ...npr, display: 'none' as const };

/** The market watch: the index and breadth, then every scrip ticking live, filterable and sortable. */
export function MarketWatch() {
  const { state, derived, dispatch, go } = useTerminal();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<QuoteSort>({ key: 'turnover', dir: 'desc' });
  const { index } = derived;
  const rows = useMemo(() => {
    const shown = derived.quotes.filter((q) => {
      if (filter === 'watchlist') return state.watchlist.includes(q.symbol);
      if (filter === 'gainers') return q.ltp > q.previousClose;
      if (filter === 'losers') return q.ltp < q.previousClose;
      return true;
    });
    return sortQuotes(shown, sort);
  }, [derived.quotes, filter, sort, state.watchlist]);
  const selected = quoteOf(derived, state.symbol)!;
  const open = (symbol: string) => {
    dispatch({ type: 'select', symbol });
    go('symbol');
  };

  return (
    <div className="app-stack">
      <ScreenTitle>Market watch</ScreenTitle>
      <MetricRow label="Market summary" count={4} dense>
        <MetricTile label="Turnover" value={<MoneyDisplay value={index.turnover} preset={npr} compact />} note="Today, all scrips" compact />
        <MetricTile label="Volume" value={compactCount(index.volume)} note="Shares traded" compact />
        <MetricTile label="Advances" value={String(index.advances)} note={`${index.declines} declines, ${index.unchanged} unchanged`} compact />
        <MetricTile label="Buying power" value={<MoneyDisplay value={derived.available} preset={npr} />} note="Cash less open buy orders" compact />
      </MetricRow>

      <div className="app-grid is-split">
        <Card
          title="Scrips"
          description={`${rows.length} of ${derived.quotes.length} · prices tick every 1.5 s`}
          headingLevel={3}
          flush
          action={<SegmentedControl<Filter> label="Show" prefix="tt-filter" size="sm" value={filter} onChange={setFilter} options={FILTERS} testId="tt-filter" />}
        >
          <StockTable
            caption="NEPSE scrips"
            quotes={rows}
            columns={['symbol', 'ltp', 'change', 'volume', 'turnover', 'trend']}
            sort={sort}
            onSortChange={setSort}
            money={quoteMoney}
            density="compact"
            bare
            live
            state={state.feedDown ? 'error' : 'ready'}
            errorLabel="The price feed stopped. Prices on screen are the last ones received."
            onRetry={() => dispatch({ type: 'feed', down: false })}
            emptyLabel={filter === 'watchlist' ? 'Your watchlist is empty. Open a scrip and choose Watch to add it.' : 'No scrips match this filter right now.'}
            renderSymbol={(q) => (
              <button type="button" className="app-sym" onClick={() => open(q.symbol)}>
                <strong>{q.symbol}</strong>
                <span>{q.name}</span>
              </button>
            )}
            testId="tt-watch"
          />
        </Card>

        <Card title={selected.symbol} description={selected.name} headingLevel={3} testId="tt-selected">
          <div className="tt-mini">
            <span className="tt-mini-price">
              <MoneyDisplay value={selected.ltp} preset={npr} />
            </span>
            <PriceChange current={selected.ltp} previous={selected.previousClose} preset={npr} />
          </div>
          <dl className="tt-facts">
            <div>
              <dt>Open</dt>
              <dd>
                <MoneyDisplay value={selected.open} preset={quoteMoney} />
              </dd>
            </div>
            <div>
              <dt>High</dt>
              <dd>
                <MoneyDisplay value={selected.high} preset={quoteMoney} />
              </dd>
            </div>
            <div>
              <dt>Low</dt>
              <dd>
                <MoneyDisplay value={selected.low} preset={quoteMoney} />
              </dd>
            </div>
            <div>
              <dt>Band</dt>
              <dd>
                <MoneyDisplay value={selected.lowerLimit} preset={quoteMoney} /> – <MoneyDisplay value={selected.upperLimit} preset={quoteMoney} />
              </dd>
            </div>
          </dl>
          <div className="tt-mini-actions">
            <Button size="sm" onClick={() => { dispatch({ type: 'ticket', side: 'buy' }); go('symbol'); }} disabled={derived.halted} testId="tt-buy">
              Buy
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { dispatch({ type: 'ticket', side: 'sell' }); go('symbol'); }} disabled={derived.halted} testId="tt-sell">
              Sell
            </Button>
            <Button size="sm" variant="ghost" aria-pressed={state.watchlist.includes(selected.symbol)} onClick={() => dispatch({ type: 'watch', symbol: selected.symbol })}>
              {state.watchlist.includes(selected.symbol) ? 'Watching' : 'Watch'}
            </Button>
          </div>
          <p className="app-small app-muted">
            Keys: <kbd className="app-kbd">B</kbd> buy, <kbd className="app-kbd">S</kbd> sell, <kbd className="app-kbd">1</kbd>–<kbd className="app-kbd">5</kbd> screens,{' '}
            <kbd className="app-kbd">/</kbd> commands.
          </p>
        </Card>
      </div>
    </div>
  );
}
