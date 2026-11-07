import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FinancialTable, type FinancialColumn } from '../src/financial/financial.tsx';
import { Watchlist, WatchlistRow, WatchlistRowSkeleton, type WatchlistQuote } from '../src/watchlist/Watchlist.tsx';
import { money, type Money } from '../src/money/money.ts';
import { seriousViolations } from './axe.ts';

interface Entry { id: string; account: string; amount: Money }
const entries: Entry[] = [
  { id: 'e1', account: 'Cash', amount: money(10000n, 'NPR') },
  { id: 'e2', account: 'Bank', amount: money(25050n, 'NPR') },
  { id: 'e3', account: 'Cash', amount: money(-2025n, 'NPR') },
];
const columns: FinancialColumn<Entry>[] = [
  { key: 'id', label: 'Ref', rowHeader: true, render: (e) => e.id },
  { key: 'amount', label: 'Amount', kind: 'money', value: (e) => e.amount, aggregate: 'sum', render: (e) => String(e.amount.minor) },
];

const table = (actions: (key: string, count: number) => void = () => {}) => render(
    <FinancialTable caption="Entries" columns={columns} rows={entries} rowKey={(e) => e.id} emptyTitle="None" groupBy={(e) => e.account}
      groupActions={(key, rows) => <button type="button" onClick={() => actions(key, rows.length)}>{`Export ${key}`}</button>} />,
  );

describe('FinancialTable groupActions', () => {
  it('draws the actions in each group header, outside the collapse button, and passes the key and rows', () => {
    const spy = vi.fn<(key: string, count: number) => void>();
    table(spy);
    const exportCash = screen.getByRole('button', { name: 'Export Cash' });
    expect(exportCash.closest('th')?.getAttribute('scope')).toBe('rowgroup');
    expect(exportCash.closest('button[aria-expanded]')).toBeNull();
    expect(exportCash.parentElement?.className).toContain('pu-no-print');
    fireEvent.click(exportCash);
    expect(spy).toHaveBeenCalledWith('Cash', 2);
  });

  it('is reachable by keyboard right after the group toggle, and does not toggle the group', async () => {
    const user = userEvent.setup();
    table();
    const toggle = screen.getAllByRole('button', { expanded: true })[0]!;
    toggle.focus();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Export Cash' }));
    await user.keyboard('{Enter}');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('adds nothing without the prop, and the region carries the public print class', () => {
    const { container } = render(<FinancialTable caption="Entries" columns={columns} rows={entries} rowKey={(e) => e.id} emptyTitle="None" groupBy={(e) => e.account} />);
    expect(container.querySelector('.pu-table-group-actions')).toBeNull();
    expect(container.querySelector('[role="region"]')?.classList.contains('pu-print-table')).toBe(true);
  });

  it('has no serious axe violations', async () => {
    const { container } = table();
    expect(await seriousViolations(container)).toEqual([]);
  });
});

const Q = (symbol: string, extra: Partial<WatchlistQuote> = {}): WatchlistQuote => ({ symbol, name: `${symbol} Ltd`, ltp: 11000n, previousClose: 10000n, volume: 10, turnover: 1000n, ...extra });

const list = (children: React.ReactNode) => render(<ul className="pu-watchlist-list">{children}</ul>);

describe('WatchlistRow', () => {
  it('renders standalone with the symbol, price and change', () => {
    list(<WatchlistRow quote={Q('NABIL')} testId="r" />);
    const row = screen.getByTestId('r');
    expect(row.tagName).toBe('LI');
    expect(row.textContent).toContain('NABIL');
    expect(row.textContent).toContain('NABIL Ltd');
    expect(row.querySelector('.pu-watch-extra')).toBeNull();
  });

  it('adds month and since-added columns as exact changes with words, not colour alone', () => {
    list(<WatchlistRow quote={Q('NABIL', { monthAgo: 8000n, addedPrice: 12500n })} showMonth showSinceAdded />);
    const extra = document.querySelector('.pu-watch-extra')!;
    expect(extra.textContent).toContain('1 month');
    expect(extra.textContent).toContain('Since added');
    const figs = extra.querySelectorAll('.pu-change');
    expect(figs[0]!.getAttribute('data-tone')).toBe('up');
    expect(figs[0]!.textContent).toMatch(/\+30\.00/);
    expect(figs[0]!.textContent).toMatch(/up/);
    expect(figs[1]!.getAttribute('data-tone')).toBe('down');
    expect(figs[1]!.textContent).toMatch(/down/);
  });

  it('shows a missing reference price as a dash with a spoken "No value"', () => {
    list(<WatchlistRow quote={Q('NABIL', { monthAgo: null })} showMonth />);
    expect(document.querySelector('.pu-watch-extra .pu-change-missing')?.textContent).toContain('No value');
  });

  it('puts the actions slot before the built-in buttons and keeps them all in tab order', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn<(delta: -1 | 1, control: string) => void>();
    const onRemove = vi.fn<() => void>();
    list(<WatchlistRow quote={Q('NABIL')} id="x" actions={<button type="button" aria-label="Alert on NABIL">bell</button>} onMove={onMove} onRemove={onRemove} first />);
    const names = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(names).toEqual(['Alert on NABIL', 'Move NABIL up', 'Move NABIL down', 'Remove NABIL from watchlist']);
    expect((screen.getByLabelText('Move NABIL up') as HTMLButtonElement).disabled).toBe(true);
    await user.tab();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Alert on NABIL');
    await user.tab();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Move NABIL down');
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(onMove).toHaveBeenCalledWith(-1, 'down');
    fireEvent.click(screen.getByLabelText('Remove NABIL from watchlist'));
    expect(onRemove).toHaveBeenCalled();
  });

  it('draws no buttons without callbacks or actions', () => {
    list(<WatchlistRow quote={Q('NABIL')} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('draws a skeleton row that is hidden from assistive technology', () => {
    list(<WatchlistRowSkeleton showMonth />);
    const row = document.querySelector('li')!;
    expect(row.getAttribute('aria-hidden')).toBe('true');
    expect(row.querySelector('.pu-watch-extra')).not.toBeNull();
  });
});

describe('Watchlist additions', () => {
  it('shows skeleton rows, busy and a status name while loading, and keeps old output otherwise', () => {
    const { container, rerender } = render(<Watchlist quotes={[]} label="My watchlist" loading skeletonRows={2} />);
    const section = container.querySelector('section')!;
    expect(section.getAttribute('aria-busy')).toBe('true');
    expect(section.querySelectorAll('[data-skeleton]')).toHaveLength(2);
    expect(screen.getByRole('status').textContent).toBe('Loading watchlist');
    rerender(<Watchlist quotes={[Q('NABIL')]} label="My watchlist" />);
    expect(section.hasAttribute('aria-busy')).toBe(false);
    expect(section.querySelector('.pu-watch-row')?.className).toBe('pu-watch-row');
  });

  it('passes month and since-added through and renders per-row actions', () => {
    render(<Watchlist quotes={[Q('NABIL', { monthAgo: 10000n, addedPrice: 11000n }), Q('NTC')]} label="w" showMonth showSinceAdded actions={(q) => <button type="button" aria-label={`Alert ${q.symbol}`}>b</button>} />);
    expect(document.querySelectorAll('.pu-watch-extra')).toHaveLength(2);
    expect(screen.getByLabelText('Alert NTC')).toBeTruthy();
    const flat = document.querySelector('.pu-watch-extra .pu-change[data-tone="flat"]');
    expect(flat?.textContent).toContain('unchanged');
  });

  it('has no serious axe violations with the new columns', async () => {
    const { container } = render(<Watchlist quotes={[Q('NABIL', { monthAgo: 10000n, addedPrice: 12000n })]} label="w" showMonth showSinceAdded onRemove={() => {}} actions={() => <button type="button" aria-label="Alert">b</button>} />);
    expect(await seriousViolations(container)).toEqual([]);
    expect(within(container).getAllByRole('button')).toHaveLength(2);
  });
});
