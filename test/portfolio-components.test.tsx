import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DataListRow, DataTable, DividendHistory, HoldingsTable, PortfolioAllocation, PortfolioOverview, TransactionHistory, Cell,
  dividendEntriesFromTransactions, holdingsSummary, positionsFromTransactions, sortHoldings,
  type Holding, type HoldingSort, type TransactionFilters,
} from '../src/index.ts';
import * as download from '../src/download/downloadText.ts';
import { seriousViolations } from './axe.ts';
import { portfolioQuotes, portfolioTransactions } from '../fixtures/portfolio-data.ts';

const summary = holdingsSummary(positionsFromTransactions(portfolioTransactions), portfolioQuotes);
const { holdings, totals } = summary;
const rowSymbols = () => screen.getAllByRole('row').slice(1).map((row) => within(row).queryAllByRole('rowheader')[0]?.querySelector('b')?.textContent ?? '');

describe('DataTable footer', () => {
  const columns = [{ key: 'a', label: 'A' }, { key: 'b', label: 'B', num: true }];
  it('renders a tfoot row after the body rows', () => {
    render(
      <DataTable caption="t" columns={columns} footer={<DataListRow testId="foot"><Cell header>Total</Cell><Cell num>9</Cell></DataListRow>}>
        <DataListRow><Cell header>x</Cell><Cell num>9</Cell></DataListRow>
      </DataTable>,
    );
    const foot = screen.getByTestId('foot');
    expect(foot.closest('tfoot')).not.toBeNull();
    expect(screen.getAllByRole('row').at(-1)).toBe(foot);
  });
  it('omits it while loading and when there are no rows', () => {
    const footer = <DataListRow testId="foot"><Cell header>Total</Cell><Cell num>0</Cell></DataListRow>;
    const { rerender } = render(<DataTable caption="t" columns={columns} footer={footer} loading><DataListRow><Cell header>x</Cell><Cell>1</Cell></DataListRow></DataTable>);
    expect(screen.queryByTestId('foot')).toBeNull();
    rerender(<DataTable caption="t" columns={columns} footer={footer}>{[]}</DataTable>);
    expect(screen.queryByTestId('foot')).toBeNull();
  });
});

describe('HoldingsTable', () => {
  it('shows symbol over name, exact money, quantity, P&L with percent and a spoken direction, and weight', () => {
    render(<HoldingsTable caption="Holdings" holdings={holdings} totals={totals} testId="h" />);
    const row = screen.getByTestId('h-row-NABIL');
    // 122 NABIL: 100 @ 640 + 50 @ 590 + 12 bonus - 40 sold; average cost in the pool is 61,500/... computed by holdingsSummary.
    const nabil = holdings.find((h) => h.symbol === 'NABIL')!;
    expect(within(row).getByText('Nabil Bank Limited')).toBeTruthy();
    expect(row.textContent).toContain(nabil.quantity.toString());
    expect(row.textContent).toContain('487.50');
    expect(row.textContent).toContain(nabil.displayWeight!.toFixed(2));
    expect(row.textContent).toMatch(/(up|down)/);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Symbol', 'Market value', 'Quantity', 'Avg cost', 'LTP', 'Unrealised P&L', 'Day change', 'Weight']);
  });

  it('shows a dash with a spoken "No value" for a holding with no quote, never zero', () => {
    render(<HoldingsTable caption="Holdings" holdings={holdings} totals={totals} testId="h" />);
    const bfc = screen.getByTestId('h-row-BFC');
    expect(within(bfc).getAllByText('No value').length).toBeGreaterThanOrEqual(5);
    expect(bfc.textContent).not.toMatch(/\b0\.00\b/);
    expect(bfc.textContent).toContain('200');
  });

  it('closes with a totals row in the tfoot and names the symbols the totals leave out', () => {
    render(<HoldingsTable caption="Holdings" holdings={holdings} totals={totals} testId="h" />);
    const total = screen.getByTestId('h-total');
    expect(total.closest('tfoot')).not.toBeNull();
    expect(within(total).getByRole('rowheader').textContent).toBe('Total');
    expect(total.textContent).toContain('100.00%');
    const note = screen.getByTestId('h-incomplete').textContent!;
    expect(note).toContain('BFC');
    expect(note).toContain('IPOX');
  });

  it('has no incomplete note when every holding is priced, and no totals row without totals', () => {
    const priced = holdingsSummary(positionsFromTransactions(portfolioTransactions.filter((t) => t.symbol === 'NABIL')), portfolioQuotes);
    const { rerender } = render(<HoldingsTable caption="H" holdings={priced.holdings} totals={priced.totals} testId="h" />);
    expect(screen.queryByTestId('h-incomplete')).toBeNull();
    rerender(<HoldingsTable caption="H" holdings={priced.holdings} testId="h" />);
    expect(screen.queryByTestId('h-total')).toBeNull();
  });

  it('is sorted by the caller: heads ask for sorts and aria-sort follows', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [sort, setSort] = useState<HoldingSort>({ key: 'symbol', dir: 'asc' });
      return <HoldingsTable caption="Holdings" holdings={sortHoldings(holdings, sort)} sort={sort} onSortChange={setSort} testId="h" />;
    }
    render(<Harness />);
    expect(rowSymbols().slice(0, 3)).toEqual(['BFC', 'GBIME', 'HDL']);
    await user.click(screen.getByTestId('h-sort-value'));
    expect(screen.getByRole('columnheader', { name: /Market value/ }).getAttribute('aria-sort')).toBe('descending');
    const byValue = sortHoldings(holdings, { key: 'value', dir: 'desc' }).map((h) => h.symbol);
    expect(rowSymbols()).toEqual(byValue);
    expect(byValue.at(-1)).toBe('BFC'); // no price sorts last, not as zero
    await user.click(screen.getByTestId('h-sort-value'));
    expect(screen.getByRole('columnheader', { name: /Market value/ }).getAttribute('aria-sort')).toBe('ascending');
  });

  it('has no sort buttons without onSortChange', () => {
    render(<HoldingsTable caption="Holdings" holdings={holdings} testId="h" />);
    expect(screen.queryByTestId('h-sort-value')).toBeNull();
  });

  it('shows the columns it is given, symbol first, and the opt-in sector', () => {
    render(<HoldingsTable caption="Holdings" holdings={holdings.slice(0, 2)} columns={['weight', 'sector', 'value']} columnLabels={{ weight: 'Share' }} density="compact" testId="h" />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Symbol', 'Share', 'Sector', 'Market value']);
    expect(screen.getByTestId('h').getAttribute('data-density')).toBe('compact');
    expect(screen.getByTestId('h-row-NABIL').textContent).toContain('Banking');
  });

  it('prints loading, empty and error states; the error offers a retry only when given', async () => {
    const onRetry = vi.fn<() => void>();
    const { rerender } = render(<HoldingsTable caption="H" holdings={[]} state="loading" />);
    expect(screen.getByRole('status').textContent).toBe('Loading holdings…');
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(1);
    rerender(<HoldingsTable caption="H" holdings={[]} emptyLabel="Buy something first." />);
    expect(screen.getByText('Buy something first.')).toBeTruthy();
    expect(screen.queryByRole('row', { name: /Total/ })).toBeNull();
    rerender(<HoldingsTable caption="H" holdings={[]} state="error" onRetry={onRetry} />);
    expect(screen.getByRole('alert').textContent).toContain('Holdings could not be loaded.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    rerender(<HoldingsTable caption="H" holdings={[]} state="error" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  describe('CSV export', () => {
    beforeEach(() => { vi.restoreAllMocks(); });
    it('downloads the shown holdings and totals as CSV', async () => {
      const save = vi.spyOn(download, 'downloadText').mockImplementation(() => undefined);
      render(<HoldingsTable caption="H" holdings={holdings} totals={totals} exportFilename="holdings.csv" testId="h" />);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Export CSV' }));
      expect(save).toHaveBeenCalledTimes(1);
      const [name, text, mime] = save.mock.calls[0]!;
      expect(name).toBe('holdings.csv');
      expect(mime).toBe('text/csv;charset=utf-8');
      expect(text).toContain('Symbol,Name,Sector,Quantity');
      expect(text).toContain('Total,');
      expect(text.split('\r\n')).toHaveLength(holdings.length + 2);
    });
    it('says so when the file cannot be saved, and is disabled with nothing to export', async () => {
      vi.spyOn(download, 'downloadText').mockImplementation(() => { throw new Error('no browser'); });
      const { rerender } = render(<HoldingsTable caption="H" holdings={holdings} exportFilename="h.csv" />);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Export CSV' }));
      expect(screen.getByRole('alert').textContent).toContain('could not be saved');
      rerender(<HoldingsTable caption="H" holdings={[]} exportFilename="h.csv" />);
      expect((screen.getByRole('button', { name: 'Export CSV' }) as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it('renders a custom symbol cell and a zero-quantity holding', () => {
    const closed: Holding[] = holdingsSummary(positionsFromTransactions(portfolioTransactions), portfolioQuotes, { includeClosed: true }).holdings;
    render(<HoldingsTable caption="H" holdings={closed} renderSymbol={(h) => <a href={`/s/${h.symbol}`}>{h.symbol}</a>} testId="h" />);
    const chcl = screen.getByTestId('h-row-CHCL');
    expect(within(chcl).getByRole('link').getAttribute('href')).toBe('/s/CHCL');
    expect(chcl.textContent).toContain('0');
  });

  it('has no serious accessibility violations, including the stacked and loading forms', async () => {
    const { container, rerender } = render(<HoldingsTable caption="Holdings" holdings={holdings} totals={totals} sort={{ key: 'value', dir: 'desc' }} onSortChange={() => undefined} exportFilename="h.csv" />);
    expect(await seriousViolations(container)).toEqual([]);
    rerender(<HoldingsTable caption="Holdings" holdings={[]} state="loading" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('PortfolioAllocation', () => {
  it('draws a donut with a legend of names and percents that add up to 100', () => {
    render(<PortfolioAllocation holdings={holdings} label="Allocation by holding" testId="a" />);
    const chart = screen.getByRole('img', { name: /^Allocation by holding: / });
    expect(chart.getAttribute('aria-label')).toContain('Other');
    const table = screen.getByRole('table', { name: 'Allocation by holding', hidden: true });
    const rows = within(table).getAllByRole('row', { hidden: true }).slice(1);
    expect(rows).toHaveLength(6);
    const shares = rows.map((row) => Number.parseFloat(within(row).getAllByRole('cell', { hidden: true })[0]!.textContent!));
    expect(Math.round(shares.reduce((a, b) => a + b, 0) * 10)).toBe(1000);
    expect(within(rows.at(-1)!).getByRole('rowheader', { hidden: true }).textContent).toBe('Other');
  });

  it('groups by sector, shows the bar, and names unpriced holdings instead of charting them as zero', () => {
    render(<PortfolioAllocation holdings={holdings} by="sector" view="bar" label="By sector" maxSlices={8} testId="a" />);
    expect(screen.getByRole('img', { name: /Banking/, hidden: true })).toBeTruthy();
    expect(screen.getByTestId('a-note').textContent).toContain('BFC');
    expect(within(screen.getByRole('table', { name: 'By sector', hidden: true })).queryByText('BFC')).toBeNull();
  });

  it('hides the legend from assistive tech when the table is the alternative, and shows the table on request', () => {
    const { container, rerender } = render(<PortfolioAllocation holdings={holdings} label="Mix" />);
    expect(container.querySelector('.kit-sr table')).not.toBeNull();
    expect(container.querySelector('[aria-hidden="true"] .kit-share-legend')).not.toBeNull();
    rerender(<PortfolioAllocation holdings={holdings} label="Mix" tableView="visible" />);
    expect(container.querySelector('.kit-sr table')).toBeNull();
    expect(screen.getByRole('table', { name: 'Mix' })).toBeTruthy();
    rerender(<PortfolioAllocation holdings={holdings} label="Mix" tableView="none" />);
    expect(screen.queryByRole('table', { hidden: true })).toBeNull();
    expect(container.querySelector('[aria-hidden="true"] .kit-share-legend')).toBeNull();
  });

  it('prints empty and loading states', () => {
    const { rerender } = render(<PortfolioAllocation holdings={[]} label="Mix" emptyLabel="Nothing yet." />);
    expect(screen.getByText('Nothing yet.')).toBeTruthy();
    rerender(<PortfolioAllocation holdings={holdings.filter((h) => h.symbol === 'BFC')} label="Mix" />);
    expect(screen.getByText('No holdings to chart.')).toBeTruthy();
    expect(screen.getByText(/BFC/)).toBeTruthy();
    rerender(<PortfolioAllocation holdings={holdings} label="Mix" state="loading" />);
    expect(screen.getByRole('status', { name: 'Loading allocation…' })).toBeTruthy();
  });

  it('has no serious accessibility violations', async () => {
    const { container, rerender } = render(<PortfolioAllocation holdings={holdings} label="Mix" />);
    expect(await seriousViolations(container)).toEqual([]);
    rerender(<PortfolioAllocation holdings={holdings} label="Mix" view="bar" tableView="visible" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('PortfolioOverview', () => {
  it('prints value, day change, invested, unrealised, realised and return on cost from the totals', () => {
    render(<PortfolioOverview totals={totals} asOf="14 Nov close" testId="o" />);
    const root = screen.getByTestId('o');
    expect(within(root).getByText('Portfolio value')).toBeTruthy();
    for (const word of ['Invested', 'Unrealised P&L', 'Realised P&L', 'Return on cost']) expect(within(root).getByText(word)).toBeTruthy();
    expect(root.textContent).toContain('14 Nov close');
    expect(root.textContent).toContain('NPR');
    expect(within(screen.getByTestId('o-tiles')).getAllByText(/%/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('o-incomplete').textContent).toContain('BFC');
  });

  it('shows a dash, not zero, when nothing has a price', () => {
    const none = holdingsSummary(positionsFromTransactions(portfolioTransactions), []).totals;
    render(<PortfolioOverview totals={none} testId="o" />);
    expect(within(screen.getByTestId('o-value')).getByText('No value')).toBeTruthy();
    expect(screen.getAllByText('No value').length).toBeGreaterThanOrEqual(3);
  });

  it('has loading and error states', async () => {
    const onRetry = vi.fn<() => void>();
    const { rerender } = render(<PortfolioOverview state="loading" testId="o" />);
    expect(screen.getByRole('status').textContent).toBe('Loading portfolio…');
    expect(screen.getByTestId('o').getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Invested')).toBeTruthy();
    rerender(<PortfolioOverview state="error" onRetry={onRetry} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has no serious accessibility violations', async () => {
    const { container, rerender } = render(<PortfolioOverview totals={totals} />);
    expect(await seriousViolations(container)).toEqual([]);
    rerender(<PortfolioOverview state="loading" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('DividendHistory', () => {
  const entries = dividendEntriesFromTransactions(portfolioTransactions);
  it('lists one row per Nepal fiscal year (BS labels) with exact figures and an all-years total', () => {
    render(<DividendHistory entries={entries} caption="Dividends by fiscal year" testId="d" />);
    const labels = screen.getAllByRole('rowheader').map((h) => h.textContent);
    expect(labels).toEqual(['2080/81', '2081/82', '2082/83', 'All years']);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Fiscal year', 'Total', 'Cash dividend', 'Bonus shares', 'Rights']);
    // 2080/81: NICA 9,400 cash + NABIL bonus 12 x 100 + (rights 2024-02 is in 2080/81 too: 50 x 100).
    const row = screen.getByTestId('d-row-2080');
    expect(row.textContent).toContain('9,400.00');
    expect(row.textContent).toContain('1,200.00');
    expect(row.textContent).toContain('5,000.00');
    expect(screen.getByTestId('d-total').textContent).toContain('81,975.00');
  });

  it('draws the chart hidden from assistive tech; the table carries the figures', () => {
    const { container } = render(<DividendHistory entries={entries} caption="Dividends" testId="d" />);
    expect(container.querySelector('.pu-dividends-chart')!.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByTestId('d-chart')).toBeTruthy();
    expect(screen.getAllByRole('table')).toHaveLength(1);
  });

  it('adds cash yield columns only for the bases given, null as a dash', () => {
    const { rerender } = render(<DividendHistory entries={entries} caption="D" marketValue={100_000_00n} testId="d" />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toContain('Yield on value');
    expect(screen.queryByRole('columnheader', { name: 'Yield on cost' })).toBeNull();
    expect(screen.getByTestId('d-row-2080').textContent).toContain('9.40%');
    rerender(<DividendHistory entries={entries} caption="D" marketValue={null} costBasis={50_000_00n} testId="d" />);
    expect(within(screen.getByTestId('d-row-2080')).getAllByText('No value').length).toBe(1);
    expect(screen.getByTestId('d-row-2080').textContent).toContain('18.80%');
  });

  it('prints empty, loading and error states', () => {
    const { rerender } = render(<DividendHistory entries={[]} caption="D" />);
    expect(screen.getByText('No dividends received yet.')).toBeTruthy();
    expect(screen.queryByTestId('d-chart')).toBeNull();
    rerender(<DividendHistory entries={entries} caption="D" state="loading" />);
    expect(screen.getByRole('status').textContent).toBe('Loading dividends…');
    rerender(<DividendHistory entries={entries} caption="D" state="error" />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('has no serious accessibility violations', async () => {
    const { container } = render(<DividendHistory entries={entries} caption="Dividends" marketValue={1_000_000_00n} costBasis={900_000_00n} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

const dataRows = () => screen.getAllByRole('row').filter((row) => within(row).queryByRole('rowheader') && !row.closest('tfoot'));

describe('TransactionHistory', () => {
  it('lists the newest first, one keyed row per transaction, with a page of 10 and a pager', async () => {
    const user = userEvent.setup();
    render(<TransactionHistory transactions={portfolioTransactions} caption="Transactions" testId="t" />);
    expect(dataRows()).toHaveLength(10);
    expect(screen.getByTestId('t-row-t27')).toBeTruthy();
    expect(dataRows()[0]).toBe(screen.getByTestId('t-row-t27'));
    expect(screen.getByText('1–10 of 27')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('11–20 of 27')).toBeTruthy();
    expect(screen.getByTestId('t-row-t17')).toBeTruthy();
    expect(screen.queryByTestId('t-row-t27')).toBeNull();
  });

  it('shows the realised P&L of a sale from computePosition, and the signed cash flow', () => {
    render(<TransactionHistory transactions={portfolioTransactions} caption="T" pageSize={30} testId="t" />);
    const sale = screen.getByTestId('t-row-t12');
    // CHCL: cost 100 x 690.00 + 368.75 = 69,368.75; proceeds 100 x 612.30 - 430.15 = 60,799.85 -> loss 8,568.90.
    expect(sale.textContent).toContain('8,568.90');
    expect(sale.textContent).toContain('down');
    expect(sale.textContent).toContain('60,799.85');
    expect(screen.getByTestId('t-row-t01').textContent).toContain('64,342.50');
    expect(screen.getByTestId('t-row-t09').textContent).toContain('Bonus');
  });

  it('filters by type chips (several at once), symbol, and clears them', async () => {
    const user = userEvent.setup();
    render(<TransactionHistory transactions={portfolioTransactions} caption="T" pageSize={30} testId="t" />);
    await user.click(screen.getByTestId('t-type-sell'));
    expect(dataRows()).toHaveLength(4);
    expect(screen.getByTestId('t-type-sell').getAttribute('aria-pressed')).toBe('true');
    await user.click(screen.getByTestId('t-type-dividend'));
    expect(dataRows()).toHaveLength(10);
    await user.selectOptions(screen.getByTestId('t-symbol'), 'NICA');
    expect(dataRows().map((row) => row.getAttribute('data-testid'))).toEqual(['t-row-t26', 't-row-t08']);
    // The totals row follows the filter.
    expect(screen.getByTestId('t-total').textContent).toContain('21,700.00');
    await user.click(screen.getByTestId('t-clear'));
    expect(dataRows()).toHaveLength(27);
    expect(screen.queryByTestId('t-clear')).toBeNull();
  });

  it('does not change a sale\'s realised P&L when filtered', async () => {
    const user = userEvent.setup();
    render(<TransactionHistory transactions={portfolioTransactions} caption="T" pageSize={30} testId="t" />);
    const before = screen.getByTestId('t-row-t16').textContent;
    await user.selectOptions(screen.getByTestId('t-symbol'), 'NABIL');
    expect(screen.getByTestId('t-row-t16').textContent).toBe(before);
    expect(before).toContain('up');
  });

  it('filters by date range through the picker and resets to the first page', async () => {
    const user = userEvent.setup();
    render(<TransactionHistory transactions={portfolioTransactions} caption="T" defaultFilters={{ range: { start: '2025-01-01', end: '2025-12-31' } }} testId="t" />);
    expect(dataRows().map((row) => row.getAttribute('data-testid'))).toEqual(['t-row-t27', 't-row-t26', 't-row-t25', 't-row-t24', 't-row-t23', 't-row-t22', 't-row-t21', 't-row-t20']);
    await user.click(screen.getByTestId('t-clear'));
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await user.click(screen.getByTestId('t-type-buy'));
    expect(screen.getByText(/^1–10 of/)).toBeTruthy();
  });

  it('supports controlled filters', async () => {
    const onFiltersChange = vi.fn<(filters: TransactionFilters) => void>();
    function Controlled() {
      const [filters, setFilters] = useState<TransactionFilters>({ types: ['bonus'] });
      return <TransactionHistory transactions={portfolioTransactions} caption="T" filters={filters} onFiltersChange={(next) => { onFiltersChange(next); setFilters(next); }} testId="t" />;
    }
    render(<Controlled />);
    expect(dataRows()).toHaveLength(2);
    await userEvent.setup().click(screen.getByTestId('t-type-bonus'));
    expect(onFiltersChange).toHaveBeenCalledWith({ types: [] });
    expect(dataRows()).toHaveLength(10);
  });

  it('orders oldest first on request, formats dates with the given function, and localises words', () => {
    render(<TransactionHistory transactions={portfolioTransactions} caption="T" order="oldest" formatDate={(iso) => `on ${iso}`} labels={{ types: { buy: 'Kharid' }, allSymbols: 'Sabai' }} testId="t" />);
    expect(dataRows()[0]).toBe(screen.getByTestId('t-row-t01'));
    expect(screen.getByTestId('t-row-t01').textContent).toContain('on 2022-09-12');
    expect(screen.getByTestId('t-type-buy').textContent).toBe('Kharid');
    expect(screen.getByRole('option', { name: 'Sabai' })).toBeTruthy();
  });

  it('prints the empty, no-match, loading and error states', async () => {
    const onRetry = vi.fn<() => void>();
    const { rerender } = render(<TransactionHistory transactions={[]} caption="T" testId="t" />);
    expect(screen.getByText('No transactions yet.')).toBeTruthy();
    expect(screen.queryByTestId('t-total')).toBeNull();
    rerender(<TransactionHistory transactions={portfolioTransactions} caption="T" filters={{ symbol: 'ZZZ' }} testId="t" />);
    expect(screen.getByText('No transactions match these filters.')).toBeTruthy();
    expect(screen.queryByTestId('t-total')).toBeNull();
    rerender(<TransactionHistory transactions={portfolioTransactions} caption="T" filters={{}} state="loading" testId="t" />);
    expect(screen.getByRole('status').textContent).toBe('Loading transactions…');
    rerender(<TransactionHistory transactions={[]} caption="T" state="error" onRetry={onRetry} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('refuses an invalid history instead of showing wrong numbers', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<TransactionHistory transactions={[{ id: 'x', date: '2024-01-01', symbol: 'A', type: 'sell', quantity: 1n, price: 1n }]} caption="T" />)).toThrow(RangeError);
    spy.mockRestore();
  });

  it('has no serious accessibility violations', async () => {
    const { container } = render(<TransactionHistory transactions={portfolioTransactions} caption="Transactions" />);
    expect(await seriousViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Sell' }));
    expect(await seriousViolations(container)).toEqual([]);
  });
});
