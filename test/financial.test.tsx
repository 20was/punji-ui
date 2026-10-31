import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppShell, FinancialSummary, FinancialTable, PriceChart, OrderBook } from '../src/financial/financial.tsx';
import { seriousViolations } from './axe.ts';
const columns = [{ key: 'amount', label: 'Amount', sortable: true, num: true, render: (row: {id:string;amount:string}) => row.amount }];
describe('financial compositions', () => {
  it('sorts only through an explicit caller callback and escapes text', async () => {
    const onSort = vi.fn<(key: string) => void>();
    const {container} = render(<FinancialTable caption="Ledger" rows={[{id:'1',amount:'<script>private</script>'}]} columns={columns} rowKey={r=>r.id} emptyTitle="No records" sort={{key:'amount',dir:'desc'}} onSort={onSort} />);
    fireEvent.click(screen.getByRole('button',{name:'Amount'}));
    expect(onSort).toHaveBeenCalledWith('amount');
    expect(screen.getByRole('columnheader').getAttribute('aria-sort')).toBe('descending');
    expect(container.querySelector('script')).toBeNull();
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('keeps loading, failure and empty states distinct', () => {
    const props = {caption:'Ledger',rows:[],columns,rowKey:(r:{id:string})=>r.id,emptyTitle:'No transactions'};
    const {rerender} = render(<FinancialTable {...props} state="loading" />);
    expect(screen.getByRole('status')).toBeTruthy();
    rerender(<FinancialTable {...props} state="error" errorTitle="Try again" />);
    expect(screen.getByRole('alert').textContent).toContain('Try again');
    rerender(<FinancialTable {...props} />);
    expect(screen.getByText('No transactions')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
  it('keeps the empty body and action when search or pagination is on', async () => {
    const reset = vi.fn<() => void>();
    const {container} = render(<FinancialTable caption="Holdings" rows={[]} columns={columns} rowKey={r=>r.id} emptyTitle="No matching records" emptyBody="Clear the search." emptyAction={<button type="button" onClick={reset}>Load sample records</button>}
      search={{ label: 'Search records', value: 'zzz', onChange: () => {} }} pagination={{ pageIndex: 0, pageSize: 10, rowCount: 0, onPageChange: () => {} }} />);
    expect(screen.getByRole('heading', { level: 3, name: 'No matching records' })).toBeTruthy();
    expect(screen.getByText('Clear the search.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Load sample records' }));
    expect(reset).toHaveBeenCalledOnce();
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('forwards stable row selection without writing row IDs into DOM attributes', () => {
    const onChange = vi.fn<(selectedRowIds: readonly string[]) => void>();
    const { container } = render(<FinancialTable caption="Accounts" rows={[{ id: 'account-private-42', amount: 'NPR 1,250' }]} columns={columns} rowKey={row => row.id} emptyTitle="No accounts" selection={{ selectedRowIds: ['account-private-42'], onChange, rowLabel: () => 'Select NPR account ending 42', testIdPrefix: 'accounts' }} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Select NPR account ending 42' }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(screen.getByText('1 selected')).toBeTruthy();
    expect(container.querySelector('[data-row-id]')).toBeNull();
    expect(container.querySelector('[data-testid="accounts-row"]')).toBeTruthy();
  });
  it('does not join across missing prices, and exposes exact values as text', async () => {
    const {container} = render(<PriceChart label="Balance" points={[{label:'Mon',value:10},{label:'Tue',value:null},{label:'Wed',value:20}]} formatValue={String} />);
    expect(container.querySelector('path')!.getAttribute('d')).not.toContain('L');
    expect(screen.getByText('Unavailable')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('renders single-price and empty charts without invalid geometry', () => {
    const {container,rerender}=render(<PriceChart label="Price" points={[{label:'Today',value:0}]} formatValue={String}/>);
    expect(container.querySelector('circle')!.getAttribute('cx')).toBe('240');
    expect(container.innerHTML).not.toContain('NaN');
    rerender(<PriceChart label="Price" points={[{label:'Low',value:-Number.MAX_VALUE},{label:'High',value:Number.MAX_VALUE}]} formatValue={String}/>);
    expect(container.querySelector('path')!.getAttribute('d')).not.toMatch(/NaN|Infinity/);
    rerender(<PriceChart label="Price" points={[{label:'Today',value:NaN}]} formatValue={String}/>);
    expect(screen.queryByRole('img')).toBeNull();
  });
  it('provides named landmarks and accessible summary/order data', async () => {
    const {container} = render(<AppShell brand="Demo" navigationLabel="Primary" navigation={<a href="#portfolio">Portfolio</a>} footer="Synthetic data">
      <h1>Portfolio</h1><FinancialSummary label="Balance" metrics={[{id:'cash',label:'Cash',value:'NPR 0.00'}]} />
      <OrderBook caption="Order book" bids={[{price:10,quantity:2}]} asks={[]} labels={{bidQuantity:'Buy quantity',bid:'Bid',ask:'Ask',askQuantity:'Sell quantity'}} formatPrice={String} formatQuantity={String}/>
    </AppShell>);
    expect(screen.getByRole('navigation',{name:'Primary'})).toBeTruthy();
    expect(screen.getByRole('link',{name:'Skip to content'}).getAttribute('href')).toBe('#'+screen.getByRole('main').id);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
