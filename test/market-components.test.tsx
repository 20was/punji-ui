import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  MarketHeatmap, MarketIndices, MarketMovers, MarketStatus, PriceLimitIndicator, StockTable, Watchlist, getMarketSession, heatmapItemsFromQuotes, nepseSchedule,
  sortQuotes, type MarketState, type Quote, type QuoteSort, type StockColumn,
} from '../src/index.ts';
import { seriousViolations } from './axe.ts';
import { INDICES, npr, QUOTES } from './market-fixtures.ts';

const rowSymbols = () => screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('rowheader')[0]?.querySelector('b')?.textContent ?? '');

function Harness({ initial = { key: 'changePercent', dir: 'desc' } as QuoteSort, extra = {} as Partial<Parameters<typeof StockTable>[0]> }) {
  const [sort, setSort] = useState<QuoteSort>(initial);
  const [selected, setSelected] = useState<readonly string[]>([]);
  return (
    <StockTable caption="NEPSE quotes · NPR" quotes={sortQuotes(QUOTES, sort)} sort={sort} onSortChange={setSort} selectedSymbols={selected} onSelectedSymbolsChange={setSelected} testId="st" {...extra} />
  );
}

describe('StockTable', () => {
  it('renders quotes with symbol over name, exact prices, a change with a spoken direction, and compact turnover', () => {
    render(<StockTable caption="NEPSE quotes" quotes={QUOTES.slice(0, 2)} />);
    const nabil = screen.getByRole('row', { name: /NABIL/ });
    expect(within(nabil).getByText('Nabil Bank Limited')).toBeTruthy();
    expect(within(nabil).getByText('512.30')).toBeTruthy();
    expect(nabil.textContent).toContain('up');
    expect(nabil.textContent).toContain('+4.30');
    expect(nabil.textContent).toContain('+0.85%');
    expect(nabil.textContent?.replace(/\s/g, ' ')).toContain('1.84 L');
    expect(nabil.textContent?.replace(/\s/g, ' ')).toContain('9.44 Cr');
    const ntc = screen.getByRole('row', { name: /NTC/ });
    expect(ntc.textContent).toContain('down');
    expect(ntc.textContent).toMatch(/[-−]12\.40/);
  });

  it('shows missing values as a dash with a spoken label, never zero', () => {
    render(<StockTable caption="q" quotes={[QUOTES.find((q) => q.symbol === 'SHIVM')!]} />);
    const row = screen.getByRole('row', { name: /SHIVM/ });
    expect(within(row).getAllByText('No value').length).toBeGreaterThanOrEqual(3);
    expect(row.textContent).not.toMatch(/\b0\.00\b/);
  });

  it('right-aligns numeric columns (num class) and the symbol column header is a row header', () => {
    render(<StockTable caption="q" quotes={QUOTES.slice(0, 1)} columns={['symbol', 'ltp', 'change', 'volume', 'turnover', 'trend']} />);
    const heads = screen.getAllByRole('columnheader');
    expect(heads.map((h) => h.className)).toEqual(['', 'num', 'num', 'num', 'num', '']);
    expect(screen.getByRole('rowheader').textContent).toContain('NABIL');
  });

  it('sorts through the caller: clicking heads asks for sorts and marks aria-sort', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ key: 'symbol', dir: 'asc' }} />);
    expect(rowSymbols().slice(0, 3)).toEqual(['ADBL', 'CIT', 'HDL']);
    expect(screen.getByRole('columnheader', { name: /Symbol/ }).getAttribute('aria-sort')).toBe('ascending');
    await user.click(screen.getByTestId('st-sort-turnover'));
    expect(rowSymbols().slice(0, 2)).toEqual(['UPPER', 'NICA']);
    expect(screen.getByRole('columnheader', { name: /Turnover/ }).getAttribute('aria-sort')).toBe('descending');
    await user.click(screen.getByTestId('st-sort-turnover'));
    expect(rowSymbols()[0]).toBe('CIT');
    expect(rowSymbols().at(-1)).toBe('SHIVM');
    await user.click(screen.getByTestId('st-sort-change'));
    expect(rowSymbols()[0]).toBe('UPPER');
  });

  it('has no sort buttons unless the caller handles sorting', () => {
    render(<StockTable caption="q" quotes={QUOTES} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('shows only the chosen columns, symbol always first', () => {
    const columns: StockColumn[] = ['turnover', 'ltp'];
    render(<StockTable caption="q" quotes={QUOTES.slice(0, 1)} columns={columns} labels={{ ltp: 'Last' }} />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Symbol', 'Turnover', 'Last']);
  });

  it('draws a trend line column from the history', () => {
    const { container } = render(<StockTable caption="q" quotes={QUOTES.slice(0, 2)} columns={['symbol', 'trend']} />);
    expect(container.querySelectorAll('svg.kit-spark')).toHaveLength(2);
  });

  it('selects rows by symbol and keeps selections when the table re-sorts', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('checkbox', { name: 'Select NICA' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select CIT' }));
    expect(screen.getByText('2 selected')).toBeTruthy();
    await user.click(screen.getByTestId('st-sort-symbol'));
    expect((screen.getByRole('checkbox', { name: 'Select NICA' }) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByTestId('st-select-select-page'));
    expect(screen.getByText('8 selected')).toBeTruthy();
  });

  it('supports loading, empty and error states', async () => {
    const onRetry = vi.fn<() => void>();
    const { rerender } = render(<StockTable caption="q" quotes={[]} state="loading" loadingLabel="Loading NEPSE quotes…" />);
    expect(screen.getByRole('status').textContent).toBe('Loading NEPSE quotes…');
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0);
    rerender(<StockTable caption="q" quotes={[]} emptyLabel="No quotes match." />);
    expect(screen.getByRole('status').textContent).toBe('No quotes match.');
    rerender(<StockTable caption="q" quotes={[]} state="error" onRetry={onRetry} />);
    expect(screen.getByRole('alert').textContent).toContain('Quotes could not be loaded.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('applies density, max height and stacking hooks', () => {
    const { container } = render(<StockTable caption="q" quotes={QUOTES.slice(0, 1)} density="compact" maxHeight={320} testId="x" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.density).toBe('compact');
    expect(root.style.getPropertyValue('--stock-max-h')).toBe('320px');
    expect(container.querySelector('.kit-tablebox.stack')).not.toBeNull();
  });

  it('updates values in place under stable row keys', () => {
    const { rerender } = render(<StockTable caption="q" quotes={QUOTES.slice(0, 3)} />);
    const row = screen.getByRole('row', { name: /NTC/ });
    rerender(<StockTable caption="q" quotes={QUOTES.slice(0, 3).map((q) => (q.symbol === 'NTC' ? { ...q, ltp: npr('891.00') } : q))} />);
    expect(screen.getByRole('row', { name: /NTC/ })).toBe(row);
    expect(row.textContent).toContain('891.00');
  });

  it('lets the caller render the symbol cell and uses the red-up convention', () => {
    const { container } = render(<StockTable caption="q" quotes={QUOTES.slice(0, 1)} renderSymbol={(q) => <a href={`/stocks/${q.symbol}`}>{q.symbol}</a>} convention="red-up" />);
    expect(screen.getByRole('link', { name: 'NABIL' }).getAttribute('href')).toBe('/stocks/NABIL');
    expect(container.querySelector('.pu-change')?.getAttribute('data-convention')).toBe('red-up');
  });

  it('formats for another market: US dollars with a US locale', () => {
    const usd: Quote = { symbol: 'AAPL', ltp: 18_934n, previousClose: 18_800n, volume: 52_000_000, turnover: 984_568_000_000n };
    render(<StockTable caption="q" quotes={[usd]} money={{ currency: 'USD', locale: 'en-US', display: 'none' }} />);
    const row = screen.getByRole('row', { name: /AAPL/ });
    expect(row.textContent).toContain('189.34');
    expect(row.textContent).toContain('52M');
    expect(row.textContent).toContain('9.85B');
  });

  it('passes axe, including selection and sorting', async () => {
    const { container } = render(<Harness extra={{ columns: ['symbol', 'ltp', 'change', 'volume', 'turnover', 'trend'] }} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('MarketMovers', () => {
  it('shows gainers first and switches tabs with the keyboard', async () => {
    const user = userEvent.setup();
    render(<MarketMovers quotes={QUOTES} label="Market movers" />);
    expect(screen.getByRole('tab', { name: 'Gainers' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getAllByRole('row').slice(1).map((r) => r.querySelector('b')?.textContent)).toEqual(['UPPER', 'NICA', 'NABIL']);
    await user.click(screen.getByRole('tab', { name: 'Gainers' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Losers' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toContain('CIT');
    expect(screen.getByRole('tabpanel').textContent).not.toContain('UPPER');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tabpanel').textContent).toContain('Turnover');
    expect(screen.getByRole('tabpanel').textContent).toContain('UPPER');
  });

  it('can be controlled, respects the limit and shows an empty message', async () => {
    const onTabChange = vi.fn<(tab: string) => void>();
    const { rerender } = render(<MarketMovers quotes={QUOTES} label="Movers" tab="losers" onTabChange={onTabChange} limit={1} />);
    expect(screen.getAllByRole('row')).toHaveLength(2);
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Most active' }));
    expect(onTabChange).toHaveBeenCalledWith('active');
    expect(screen.getByRole('tab', { name: 'Losers' }).getAttribute('aria-selected')).toBe('true');
    rerender(<MarketMovers quotes={[]} label="Movers" tab="losers" emptyLabels={{ losers: 'Nothing fell.' }} />);
    expect(screen.getByText('Nothing fell.')).toBeTruthy();
  });

  it('passes axe', async () => {
    const { container } = render(<MarketMovers quotes={QUOTES} label="Market movers" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('MarketIndices', () => {
  it('shows index values in points, signed change with a word, and a trend', () => {
    const { container } = render(<MarketIndices indices={INDICES} label="Market indices" state="open" asOf="As of 14:59" />);
    const nepse = screen.getByText('NEPSE').closest('li')!;
    expect(nepse.textContent).toContain('2,712.45');
    expect(nepse.textContent).toContain('up');
    expect(nepse.textContent).toContain('+14.35');
    expect(nepse.textContent).toContain('+0.53%');
    expect(screen.getByText('Sensitive').closest('li')!.textContent).toMatch(/[-−]2\.83/);
    expect(screen.getByText('Float').closest('li')!.textContent).toContain('unchanged');
    expect(container.querySelectorAll('svg.kit-spark')).toHaveLength(2);
    expect(screen.getByText('Open')).toBeTruthy();
    expect(screen.getByText('As of 14:59')).toBeTruthy();
  });

  it('shows an unpublished index as a dash, not zero', () => {
    render(<MarketIndices indices={INDICES} label="Indices" />);
    const banking = screen.getByText('Banking').closest('li')!;
    expect(banking.textContent).toContain('No value');
    expect(banking.textContent).not.toContain('0.00');
  });

  it('supports the strip variant, loading and empty states', () => {
    const { container, rerender } = render(<MarketIndices indices={INDICES} label="Indices" variant="strip" />);
    expect(container.querySelector('[data-variant="strip"]')).not.toBeNull();
    rerender(<MarketIndices indices={[]} label="Indices" loading />);
    expect(screen.getByRole('status', { name: 'Loading indices' })).toBeTruthy();
    rerender(<MarketIndices indices={[]} label="Indices" emptyLabel="Nothing to show." />);
    expect(screen.getByText('Nothing to show.')).toBeTruthy();
  });

  it('passes axe', async () => {
    const { container } = render(<MarketIndices indices={INDICES} label="Market indices" state="closed" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('MarketStatus', () => {
  const states: MarketState[] = ['open', 'pre-open', 'closed', 'halted', 'holiday'];
  it.each(states)('says %s in words with its own icon', (state) => {
    const { container } = render(<MarketStatus state={state} />);
    expect(screen.getByRole('status').textContent).toMatch(/Open|Pre-open|Closed|Halted|Holiday/);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
  it('uses a different icon shape for every state, so colour is never the only cue', () => {
    const shapes = states.map((state) => {
      const { container, unmount } = render(<MarketStatus state={state} />);
      const html = container.querySelector('svg')!.innerHTML;
      unmount();
      return html;
    });
    expect(new Set(shapes).size).toBe(states.length);
  });
  it('takes a session, names the market and shows the holiday name', () => {
    const session = getMarketSession(new Date('2026-11-02T06:00:00Z'), { ...nepseSchedule, holidays: [{ date: '2026-11-02', name: 'Sample holiday' }] });
    render(<MarketStatus session={session} market="NEPSE" labels={{ holiday: 'Public holiday' }} />);
    expect(screen.getByRole('status').textContent).toBe('NEPSE: Public holidaySample holiday');
  });
  it('shows an explicit detail and passes axe', async () => {
    const { container } = render(<MarketStatus state="closed" detail="Opens Sun 10:30" />);
    expect(screen.getByText('Opens Sun 10:30')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('PriceLimitIndicator', () => {
  const nabil = QUOTES[0]!;
  it('describes where the price sits between the published limits', () => {
    render(<PriceLimitIndicator symbol="NABIL" ltp={nabil.ltp} lowerLimit={nabil.lowerLimit} upperLimit={nabil.upperLimit} previousClose={nabil.previousClose} />);
    const bar = screen.getByRole('img');
    expect(bar.getAttribute('aria-label')).toBe('NABIL: Last price 512.30; Lower limit 457.20; Upper limit 558.80; Previous close 508.00; Within limits');
    expect(screen.queryByText('At upper circuit')).toBeNull();
  });
  it('flags the upper circuit in words and with an announced status', () => {
    const upper = QUOTES.find((q) => q.symbol === 'UPPER')!;
    render(<PriceLimitIndicator symbol="UPPER" ltp={upper.ltp} lowerLimit={upper.lowerLimit} upperLimit={upper.upperLimit} />);
    expect(screen.getByText('At upper circuit').closest('[role="status"]')).not.toBeNull();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('At upper circuit');
  });
  it('flags the lower circuit, and a price beyond the band', () => {
    const { rerender } = render(<PriceLimitIndicator ltp={npr('200.88')} lowerLimit={npr('200.88')} upperLimit={npr('245.52')} />);
    expect(screen.getByText('At lower circuit')).toBeTruthy();
    rerender(<PriceLimitIndicator ltp={npr('190.00')} lowerLimit={npr('200.88')} upperLimit={npr('245.52')} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('At lower circuit, beyond the circuit band');
  });
  it('computes the band from the previous close and a rate when no limits are given', () => {
    render(<PriceLimitIndicator ltp={npr('245.52')} previousClose={npr('223.20')} bandRate="0.10" />);
    const label = screen.getByRole('img').getAttribute('aria-label')!;
    expect(label).toContain('Lower limit 200.88');
    expect(label).toContain('Upper limit 245.52');
    expect(screen.getByText('At upper circuit')).toBeTruthy();
  });
  it('says so when limits are missing', () => {
    render(<PriceLimitIndicator ltp={npr('10.00')} />);
    expect(screen.getByRole('status').textContent).toBe('Circuit limits unavailable');
    expect(screen.queryByRole('img')).toBeNull();
  });
  it('passes axe at a limit and within', async () => {
    const { container } = render(<><PriceLimitIndicator symbol="UPPER" ltp={npr('245.52')} lowerLimit={npr('200.88')} upperLimit={npr('245.52')} /><PriceLimitIndicator symbol="NABIL" ltp={nabil.ltp} lowerLimit={nabil.lowerLimit} upperLimit={nabil.upperLimit} previousClose={nabil.previousClose} /></>);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

function WatchlistHarness({ initial = ['NABIL', 'NTC', 'HDL'], onRemoveSpy }: { initial?: string[]; onRemoveSpy?: (s: string) => void }) {
  const [order, setOrder] = useState(initial);
  const quotes = order.map((s) => QUOTES.find((q) => q.symbol === s)!);
  return <Watchlist quotes={quotes} label="My watchlist" onReorder={setOrder} onRemove={(s) => { onRemoveSpy?.(s); setOrder((o) => o.filter((x) => x !== s)); }} testId="wl" />;
}
const order = () => screen.getAllByRole('listitem').map((li) => li.querySelector('b')?.textContent);

describe('Watchlist', () => {
  it('lists quotes in the given order with price and change', () => {
    render(<Watchlist quotes={QUOTES.slice(0, 3)} label="My watchlist" />);
    expect(order()).toEqual(['NABIL', 'NTC', 'HDL']);
    expect(screen.getByRole('region', { name: 'My watchlist' })).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('moves rows with the buttons, keeps focus and announces the new position', async () => {
    const user = userEvent.setup();
    render(<WatchlistHarness />);
    await user.click(screen.getByRole('button', { name: 'Move HDL up' }));
    expect(order()).toEqual(['NABIL', 'HDL', 'NTC']);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Move HDL up' }));
    expect(screen.getByText('HDL moved to position 2 of 3')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Move NABIL up' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('moves the focused row with Alt+ArrowUp and Alt+ArrowDown, and moves focus to the partner button at an end', async () => {
    const user = userEvent.setup();
    render(<WatchlistHarness />);
    screen.getByRole('button', { name: 'Remove NTC from watchlist' }).focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(order()).toEqual(['NABIL', 'HDL', 'NTC']);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove NTC from watchlist' }));
    await user.keyboard('{ArrowDown}');
    expect(order()).toEqual(['NABIL', 'HDL', 'NTC']);
    screen.getByRole('button', { name: 'Move NTC up' }).focus();
    await user.keyboard('{Alt>}{ArrowUp}{ArrowUp}{/Alt}');
    expect(order()).toEqual(['NTC', 'NABIL', 'HDL']);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Move NTC down' }));
  });

  it('removes a row and puts focus on its neighbour; the last row falls back to the list', async () => {
    const user = userEvent.setup();
    const spy = vi.fn<(symbol: string) => void>();
    render(<WatchlistHarness initial={['NABIL', 'NTC']} onRemoveSpy={spy} />);
    await user.click(screen.getByRole('button', { name: 'Remove NABIL from watchlist' }));
    expect(spy).toHaveBeenCalledWith('NABIL');
    expect(order()).toEqual(['NTC']);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove NTC from watchlist' }));
    expect(screen.getByText('NABIL removed')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Remove NTC from watchlist' }));
    expect(screen.getByText('Your watchlist is empty')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'My watchlist' }));
  });

  it('shows an empty state with its action', () => {
    render(<Watchlist quotes={[]} label="Watchlist" emptyBody="Add a symbol to follow it." emptyAction={<button type="button">Add symbol</button>} />);
    expect(screen.getByText('Add a symbol to follow it.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add symbol' })).toBeTruthy();
  });

  it('keeps row elements and order while live values change', () => {
    const { rerender } = render(<Watchlist quotes={QUOTES.slice(0, 3)} label="w" />);
    const before = screen.getAllByRole('listitem');
    rerender(<Watchlist quotes={QUOTES.slice(0, 3).map((q) => ({ ...q, ltp: q.ltp! + 1000n }))} label="w" />);
    const after = screen.getAllByRole('listitem');
    expect(after).toEqual(before);
    expect(after[0]!.textContent).toContain('522.30');
  });

  it('passes axe with controls and when empty', async () => {
    const { container } = render(<WatchlistHarness />);
    expect(await seriousViolations(container)).toEqual([]);
    const empty = render(<Watchlist quotes={[]} label="Watchlist" />);
    expect(await seriousViolations(empty.container)).toEqual([]);
  });
});

describe('MarketHeatmap', () => {
  const items = heatmapItemsFromQuotes(QUOTES);
  it('draws a tile per sized item, labelled with symbol, size and change, and lists the rest', () => {
    render(<MarketHeatmap items={items} label="NEPSE turnover" sizeLabel="Turnover" />);
    const tiles = within(screen.getByRole('list', { name: 'NEPSE turnover' })).getAllByRole('group');
    expect(tiles).toHaveLength(7);
    expect(screen.getByRole('group', { name: /^UPPER, Upper Tamakoshi Hydropower, Turnover 29,57,34,000, up 10.00 percent$/ })).toBeTruthy();
    expect(screen.getByRole('group', { name: /^CIT,.* down 9.87 percent$/ })).toBeTruthy();
    expect(screen.getByText(/1 not drawn: no size: SHIVM/)).toBeTruthy();
  });
  it('colours by a diverging step and also prints an arrow and a signed change', () => {
    const { container } = render(<MarketHeatmap items={items} label="m" />);
    const upper = [...container.querySelectorAll('.pu-heat-tile')].find((t) => t.textContent?.includes('UPPER'))!;
    expect(upper.getAttribute('data-step')).toBe('3');
    expect(upper.textContent).toContain('▲ +10.00%');
    const cit = [...container.querySelectorAll('.pu-heat-tile')].find((t) => t.textContent?.includes('CIT'))!;
    expect(cit.getAttribute('data-step')).toBe('-3');
    expect(cit.textContent).toContain('▼ −9.87%');
  });
  it('gives the legend every step, an unchanged step and a no-data step', () => {
    render(<MarketHeatmap items={items} label="m" />);
    const legend = screen.getByRole('list', { name: /Colour scale/ });
    expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['< −2%', '−2 to −1%', '−1 to 0%', 'Unchanged', '0 to +1%', '+1 to +2%', '> +2%', 'No change data']);
  });
  it('offers every item, including unsized ones, in a data table', () => {
    render(<MarketHeatmap items={items} label="m" sizeLabel="Turnover" />);
    const table = screen.getByRole('table', { hidden: true });
    const rows = within(table).getAllByRole('row', { hidden: true });
    expect(rows).toHaveLength(9);
    expect(rows.at(-2)!.textContent).toContain('SHIVM');
    expect(rows.at(-2)!.textContent).toContain('No size');
  });
  it('handles zero, negative and missing sizes and no drawable items', () => {
    const odd = [{ id: 'A', label: 'A', size: 0, change: 1 }, { id: 'B', label: 'B', size: -5, change: -1 }, { id: 'C', label: 'C', size: null, change: null }];
    render(<MarketHeatmap items={odd} label="odd" />);
    expect(screen.queryByRole('list', { name: 'odd' })).toBeNull();
    expect(screen.getByText('No size', { selector: 'p' })).toBeTruthy();
    expect(screen.getByText(/3 not drawn/)).toBeTruthy();
  });
  it('makes tiles buttons when onSelect is given', async () => {
    const onSelect = vi.fn<(id: string) => void>();
    render(<MarketHeatmap items={items} label="m" onSelect={onSelect} />);
    await userEvent.setup().click(screen.getByRole('button', { name: /^NICA/ }));
    expect(onSelect).toHaveBeenCalledWith('NICA');
  });
  it('swaps colours for the red-up convention', () => {
    const { container } = render(<MarketHeatmap items={items} label="m" convention="red-up" />);
    expect(container.querySelector('.pu-heat')?.getAttribute('data-convention')).toBe('red-up');
  });
  it('lays out the same way twice', () => {
    const a = render(<MarketHeatmap items={items} label="m" />).container.innerHTML;
    const b = render(<MarketHeatmap items={items} label="m" />).container.innerHTML;
    expect(b).toBe(a);
  });
  it('passes axe, with and without actions', async () => {
    const plain = render(<MarketHeatmap items={items} label="m" />);
    expect(await seriousViolations(plain.container)).toEqual([]);
    const buttons = render(<MarketHeatmap items={items} label="m2" onSelect={() => undefined} />);
    expect(await seriousViolations(buttons.container)).toEqual([]);
  });
});
