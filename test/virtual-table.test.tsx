import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { VirtualFinancialTable, type SortRule, type VirtualColumn } from '../src/virtual-table/VirtualFinancialTable.tsx';
import { clampWidth, compareByRules, fixedLayout, measuredLayout, nextSortRules, placeColumns, renderedIndices, visibleRange } from '../src/virtual-table/layout.ts';
import { TableExport, rowsWithIds } from '../src/table-export/TableExport.tsx';
import * as download from '../src/download/downloadText.ts';
import { sampleTrades, tickTrade, type SampleTrade } from '../fixtures/trade-data.ts';
import { seriousViolations } from './axe.ts';

const trades = sampleTrades(10_000);
const rowKey = (t: SampleTrade) => t.id;
const columns: VirtualColumn<SampleTrade>[] = [
  { key: 'id', label: 'Contract', rowHeader: true, pin: 'left', width: 130, render: (t) => t.id },
  { key: 'symbol', label: 'Symbol', sortable: true, width: 90, render: (t) => t.symbol },
  { key: 'quantity', label: 'Units', num: true, sortable: true, render: (t) => t.quantity },
  { key: 'rate', label: 'Rate', num: true, sortable: true, minWidth: 80, maxWidth: 200, render: (t) => String(t.rate) },
  { key: 'time', label: 'Time', pin: 'right', width: 90, resizable: false, render: (t) => t.time },
];
function Harness() {
  const [ids, setIds] = useState<readonly string[]>([]);
  return <VirtualFinancialTable caption="Floorsheet" columns={columns} rows={trades.slice(0, 500)} rowKey={rowKey} emptyTitle="No trades"
    selection={{ selectedRowIds: ids, onChange: setIds, rowLabel: (id) => `Select trade ${id}` }} />;
}
const drawn = (container: HTMLElement) => [...container.querySelectorAll<HTMLTableRowElement>('tbody tr[data-index]')];

describe('virtual table layout helpers', () => {
  it('moves through single and multi-column sorts', () => {
    expect(nextSortRules([], 'rate')).toEqual([{ key: 'rate', dir: 'asc' }]);
    expect(nextSortRules([{ key: 'rate', dir: 'asc' }], 'rate')).toEqual([{ key: 'rate', dir: 'desc' }]);
    expect(nextSortRules([{ key: 'rate', dir: 'desc' }], 'rate')).toEqual([{ key: 'rate', dir: 'asc' }]);
    const two: SortRule[] = [{ key: 'symbol', dir: 'asc' }, { key: 'rate', dir: 'desc' }];
    expect(nextSortRules(two, 'rate')).toEqual([{ key: 'rate', dir: 'asc' }]);
    expect(nextSortRules([{ key: 'symbol', dir: 'asc' }], 'rate', true)).toEqual([{ key: 'symbol', dir: 'asc' }, { key: 'rate', dir: 'asc' }]);
    expect(nextSortRules([{ key: 'symbol', dir: 'asc' }, { key: 'rate', dir: 'asc' }], 'rate', true)).toEqual(two);
    expect(nextSortRules(two, 'rate', true)).toEqual([{ key: 'symbol', dir: 'asc' }]);
  });
  it('compares by rules with missing values last and bigint support', () => {
    type R = { s: string; n: number | null; b: bigint };
    const rows: R[] = [{ s: 'b', n: 2, b: 5n }, { s: 'a', n: null, b: 1n }, { s: 'a', n: 1, b: 9n }, { s: 'b', n: 2, b: 1n }];
    const sorted = rows.toSorted(compareByRules<R>([{ key: 's', dir: 'asc' }, { key: 'n', dir: 'desc' }, { key: 'b', dir: 'asc' }], { s: (r) => r.s, n: (r) => r.n, b: (r) => r.b }));
    expect(sorted).toEqual([rows[2], rows[1], rows[3], rows[0]]);
    expect(rows.toSorted(compareByRules<R>([{ key: 'n', dir: 'asc' }], { n: (r) => r.n })).at(-1)).toBe(rows[1]);
  });
  it('lays out fixed and measured rows and finds the window', () => {
    const fixed = fixedLayout(10_000, 40);
    expect(fixed.total).toBe(400_000);
    expect(fixed.indexAt(4_019)).toBe(100);
    expect(visibleRange(fixed, 4_000, 400, 5)).toEqual({ start: 95, end: 115 });
    expect(visibleRange(fixedLayout(0, 40), 0, 400, 5)).toEqual({ start: 0, end: 0 });
    const measured = measuredLayout(4, 40, (i) => (i === 1 ? 100 : undefined));
    expect([0, 1, 2, 3, 4].map(measured.offset)).toEqual([0, 40, 140, 180, 220]);
    expect([0, 39, 40, 139, 140, 999].map(measured.indexAt)).toEqual([0, 0, 1, 1, 2, 3]);
    expect(renderedIndices(10, 13, [2, 11, 50], 20)).toEqual([2, 10, 11, 12]);
  });
  it('places pinned columns with sticky offsets and clamps widths', () => {
    const placed = placeColumns([{ key: 'a', width: 100 }, { key: 'b', width: 80, pin: 'left' }, { key: 'c', width: 60, pin: 'right' }, { key: 'd', width: 50, pin: 'right' }, { key: 'e', width: 70, pin: 'left' }], 44);
    expect(placed.map((c) => [c.key, c.inset, c.edge ?? false])).toEqual([['b', 44, false], ['e', 124, true], ['a', undefined, false], ['c', 50, true], ['d', 0, false]]);
    expect(clampWidth(10, 64, 200)).toBe(64);
    expect(clampWidth(999.4, 64, 200)).toBe(200);
    expect(clampWidth(Number.NaN, 64, 200)).toBe(64);
  });
});

describe('VirtualFinancialTable', () => {
  it('draws only the rows in view out of 10,000, with the real size and positions', async () => {
    const { container } = render(<VirtualFinancialTable caption="Floorsheet" columns={columns} rows={trades} rowKey={rowKey} emptyTitle="No trades" height={480} rowHeight={40} overscan={4} />);
    const table = screen.getByRole('table', { name: 'Floorsheet' });
    expect(table.getAttribute('aria-rowcount')).toBe('10001');
    const rows = drawn(container);
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.length).toBeLessThan(30);
    expect(rows[0]!.getAttribute('aria-rowindex')).toBe('2');
    expect(screen.getAllByRole('row')[0]!.getAttribute('aria-rowindex')).toBe('1');
    const spacer = container.querySelector<HTMLTableCellElement>('tr.pu-vt-spacer td')!;
    expect(parseFloat(spacer.style.height) + rows.length * 40).toBe(400_000);
    expect(screen.getAllByRole('rowheader')[0]!.textContent).toBe(trades[0]!.id);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('draws the window for the scroll position', () => {
    const { container } = render(<VirtualFinancialTable caption="Floorsheet" columns={columns} rows={trades} rowKey={rowKey} emptyTitle="No trades" overscan={2} />);
    const region = screen.getByRole('region', { name: 'Floorsheet' });
    act(() => {
      region.scrollTop = 200_000;
      fireEvent.scroll(region);
    });
    const indices = drawn(container).map((tr) => Number(tr.dataset.index));
    expect(indices[0]).toBe(4_998);
    expect(indices).toContain(5_005);
    expect(container.querySelectorAll('tr.pu-vt-spacer')).toHaveLength(2);
  });

  it('moves focus between rows with the arrow, page, Home and End keys', async () => {
    const user = userEvent.setup();
    const { container } = render(<VirtualFinancialTable caption="Floorsheet" columns={columns} rows={trades} rowKey={rowKey} emptyTitle="No trades" />);
    const first = drawn(container)[0]!;
    expect(first.tabIndex).toBe(0);
    expect(drawn(container)[1]!.tabIndex).toBe(-1);
    first.focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement?.getAttribute('aria-rowindex')).toBe('3');
    await user.keyboard('{End}');
    expect(document.activeElement?.getAttribute('aria-rowindex')).toBe('10001');
    expect(within(document.activeElement as HTMLElement).getByRole('rowheader').textContent).toBe(trades.at(-1)!.id);
    await user.keyboard('{PageUp}');
    expect(Number(document.activeElement?.getAttribute('aria-rowindex'))).toBeLessThan(10001);
    await user.keyboard('{Home}');
    expect(document.activeElement?.getAttribute('aria-rowindex')).toBe('2');
  });

  it('keeps the focused row drawn when it scrolls out of view', () => {
    const { container } = render(<VirtualFinancialTable caption="Floorsheet" columns={columns} rows={trades} rowKey={rowKey} emptyTitle="No trades" overscan={0} />);
    const first = drawn(container)[0]!;
    act(() => first.focus());
    const region = screen.getByRole('region', { name: 'Floorsheet' });
    act(() => {
      region.scrollTop = 80_000;
      fireEvent.scroll(region);
    });
    expect(document.activeElement).toBe(first);
    expect(drawn(container)[0]!.dataset.index).toBe('0');
    expect(container.querySelectorAll('tr.pu-vt-spacer')).toHaveLength(2);
  });

  it('sorts by one or more columns from pointer and keyboard and announces it', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn<(sort: SortRule[]) => void>();
    const { rerender } = render(<VirtualFinancialTable caption="Floorsheet" columns={columns} rows={trades} rowKey={rowKey} emptyTitle="No trades" sort={[{ key: 'symbol', dir: 'asc' }]} onSortChange={onSortChange} />);
    await user.click(screen.getByRole('button', { name: /^Rate/ }));
    expect(onSortChange).toHaveBeenLastCalledWith([{ key: 'rate', dir: 'asc' }]);
    await user.keyboard('{Shift>}');
    await user.click(screen.getByRole('button', { name: /^Units/ }));
    await user.keyboard('{/Shift}');
    expect(onSortChange).toHaveBeenLastCalledWith([{ key: 'symbol', dir: 'asc' }, { key: 'quantity', dir: 'asc' }]);
    expect(screen.getByText('Sorted by Symbol ascending, then Units ascending')).toBeTruthy();
    screen.getByRole('button', { name: /^Rate/ }).focus();
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(onSortChange).toHaveBeenLastCalledWith([{ key: 'symbol', dir: 'asc' }, { key: 'rate', dir: 'asc' }]);
    await user.keyboard(' ');
    expect(onSortChange).toHaveBeenLastCalledWith([{ key: 'rate', dir: 'asc' }]);

    rerender(<VirtualFinancialTable caption="Floorsheet" columns={columns} rows={trades} rowKey={rowKey} emptyTitle="No trades" sort={[{ key: 'symbol', dir: 'asc' }, { key: 'rate', dir: 'desc' }]} onSortChange={onSortChange} />);
    const heads = screen.getAllByRole('columnheader');
    expect(heads.filter((h) => h.hasAttribute('aria-sort')).map((h) => [h.textContent?.slice(0, 6), h.getAttribute('aria-sort')])).toEqual([['Symbol', 'ascending']]);
    expect(screen.getByRole('button', { name: /^Rate/ }).textContent).toContain('↓2, descending, sort priority 2');
    expect(screen.getByRole('button', { name: /^Symbol/ }).textContent).toContain('1, sort priority 1');
  });

  it('resizes columns from the keyboard and the pointer within their bounds and reports the width', () => {
    const onColumnResize = vi.fn<(key: string, width: number) => void>();
    render(<VirtualFinancialTable caption="Floorsheet" columns={columns} rows={trades} rowKey={rowKey} emptyTitle="No trades" onColumnResize={onColumnResize} />);
    const handle = screen.getByRole('separator', { name: 'Resize Rate column' });
    expect(handle.getAttribute('aria-valuenow')).toBe('120');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(onColumnResize).toHaveBeenLastCalledWith('rate', 130);
    expect(handle.getAttribute('aria-valuenow')).toBe('130');
    fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
    expect(onColumnResize).toHaveBeenLastCalledWith('rate', 90);
    fireEvent.keyDown(handle, { key: 'End' });
    expect(onColumnResize).toHaveBeenLastCalledWith('rate', 200);
    fireEvent.keyDown(handle, { key: 'Home' });
    expect(onColumnResize).toHaveBeenLastCalledWith('rate', 80);
    fireEvent.pointerDown(handle, { button: 0, clientX: 300, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 340, pointerId: 1 });
    expect(handle.getAttribute('aria-valuenow')).toBe('120');
    fireEvent.pointerUp(handle, { clientX: 1000, pointerId: 1 });
    expect(onColumnResize).toHaveBeenLastCalledWith('rate', 200);
    expect(screen.queryByRole('separator', { name: 'Resize Time column' })).toBeNull();
  });

  it('honours controlled widths and pins columns left and right', () => {
    const { container } = render(<VirtualFinancialTable caption="Floorsheet" columns={columns} rows={trades} rowKey={rowKey} emptyTitle="No trades" columnWidths={{ symbol: 150 }} />);
    expect(screen.getByRole('separator', { name: 'Resize Symbol column' }).getAttribute('aria-valuenow')).toBe('150');
    const heads = screen.getAllByRole('columnheader');
    expect(heads[0]!.className).toContain('pin-l');
    expect(heads[0]!.style.insetInlineStart).toBe('0px');
    expect(heads.at(-1)!.className).toContain('pin-r');
    expect(heads.at(-1)!.style.insetInlineEnd).toBe('0px');
    expect(container.querySelector('table')!.style.width).toBe(`${130 + 150 + 120 + 120 + 90}px`);
  });

  it('selects every row from the head checkbox and one row with Space', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    expect(screen.getByText('500 selected')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    const row = drawn(container)[0]!;
    row.focus();
    await user.keyboard(' ');
    expect(row.getAttribute('aria-selected')).toBe('true');
    expect((screen.getByRole('checkbox', { name: 'Select all rows' }) as HTMLInputElement).indeterminate).toBe(true);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('keeps the reader in place when live rows arrive above, and the focused row across updates', () => {
    const base = trades.slice(0, 2_000);
    const { container, rerender } = render(<VirtualFinancialTable caption="Tape" columns={columns} rows={base} rowKey={rowKey} emptyTitle="No trades" />);
    const region = screen.getByRole('region', { name: 'Tape' });
    act(() => {
      region.scrollTop = 4_000;
      fireEvent.scroll(region);
    });
    const focused = container.querySelector<HTMLElement>('tr[data-index="102"]')!;
    act(() => focused.focus());
    const fresh = sampleTrades(3, 99).map((t, i) => ({ ...t, id: `NEW${i}` }));
    act(() => rerender(<VirtualFinancialTable caption="Tape" columns={columns} rows={[...fresh, ...base.map((t, i) => (i % 7 ? t : tickTrade(t, i)))]} rowKey={rowKey} emptyTitle="No trades" />));
    expect(region.scrollTop).toBe(4_120);
    expect(document.activeElement?.getAttribute('aria-rowindex')).toBe('107');
  });

  it('keeps the scroll offset when the rows are re-sorted', () => {
    const base = trades.slice(0, 2_000);
    const { rerender } = render(<VirtualFinancialTable caption="Tape" columns={columns} rows={base} rowKey={rowKey} emptyTitle="No trades" />);
    const region = screen.getByRole('region', { name: 'Tape' });
    act(() => {
      region.scrollTop = 4_000;
      fireEvent.scroll(region);
    });
    rerender(<VirtualFinancialTable caption="Tape" columns={columns} rows={base.toReversed()} rowKey={rowKey} emptyTitle="No trades" />);
    expect(region.scrollTop).toBe(4_000);
  });

  it('shows loading, error, empty and no-match states', () => {
    const props = { caption: 'Floorsheet', columns, rowKey, emptyTitle: 'No trades today' };
    const { rerender } = render(<VirtualFinancialTable {...props} rows={[]} state="loading" />);
    expect(screen.getByRole('status')).toBeTruthy();
    rerender(<VirtualFinancialTable {...props} rows={[]} state="error" errorTitle="Floorsheet unavailable" />);
    expect(screen.getByRole('alert').textContent).toContain('Floorsheet unavailable');
    rerender(<VirtualFinancialTable {...props} rows={[]} />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('No trades today')).toBeTruthy();
    rerender(<VirtualFinancialTable {...props} rows={[]} search={{ label: 'Search trades', value: 'zzz', onChange: () => undefined }} />);
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByRole('searchbox', { name: 'Search trades' })).toBeTruthy();
  });

  it('renders on the server with only the first screenful', () => {
    const html = renderToString(<VirtualFinancialTable caption="Floorsheet" columns={columns} rows={trades} rowKey={rowKey} emptyTitle="No trades" height={400} rowHeight={40} overscan={2} />);
    expect(html).toContain('aria-rowcount="10001"');
    expect(html.match(/data-index=/g)?.length).toBe(11);
  });
});

describe('TableExport', () => {
  type Row = { id: string; note: string; amount: number };
  const rows: Row[] = [{ id: 'a', note: '=HYPERLINK("x")', amount: -5 }, { id: 'b', note: 'नेप्से', amount: 10 }, { id: 'c', note: 'ok', amount: 1 }];
  const csvColumns = [{ header: 'Id', accessor: 'id' as const }, { header: 'Note', accessor: 'note' as const }, { header: 'Amount', accessor: 'amount' as const }];

  it('keeps table order when picking rows by id', () => {
    expect(rowsWithIds(rows, ['c', 'a'], (r) => r.id).map((r) => r.id)).toEqual(['a', 'c']);
    expect(rowsWithIds(rows, [], (r) => r.id)).toEqual([]);
  });

  it('exports visible, all and selected rows as formula-safe CSV with a BOM', async () => {
    const user = userEvent.setup();
    const save = vi.spyOn(download, 'downloadText').mockImplementation(() => undefined);
    const onExport = vi.fn<(scope: string, count: number) => void>();
    const { container } = render(<TableExport columns={csvColumns} filename={(scope) => `floorsheet-${scope}`} visibleRows={rows.slice(0, 2)} allRows={rows} selectedRows={[]} onExport={onExport} csv={{ neutralizeFormulas: false } as never} />);
    expect(screen.getByRole('group', { name: 'Export CSV' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Selected (0)' }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Visible (2)' }));
    const [name, text, mime] = save.mock.calls[0]!;
    expect(name).toBe('floorsheet-visible.csv');
    expect(mime).toBe('text/csv;charset=utf-8');
    expect(text.startsWith('﻿Id,Note,Amount\r\n')).toBe(true);
    expect(text).toContain(`a,"'=HYPERLINK(""x"")",-5`);
    expect(text).toContain('b,नेप्से,10');
    expect(onExport).toHaveBeenLastCalledWith('visible', 2);
    expect(screen.getByRole('status').textContent).toBe('Exported 2 rows');
    await user.click(screen.getByRole('button', { name: 'All (3)' }));
    expect(save.mock.calls[1]![1].split('\r\n')).toHaveLength(4);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('says so when the file cannot be saved', async () => {
    vi.spyOn(download, 'downloadText').mockImplementation(() => { throw new Error('no browser'); });
    render(<TableExport columns={csvColumns} filename="trades.csv" allRows={rows} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'All (3)' }));
    expect(screen.getByRole('status').textContent).toBe('The file could not be saved');
  });
});
