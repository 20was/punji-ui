import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { FinancialTable, type FinancialColumn } from '../src/financial/financial.tsx';
import { VirtualFinancialTable, type VirtualColumn } from '../src/virtual-table/VirtualFinancialTable.tsx';
import { money, type Money } from '../src/money/money.ts';
import { seriousViolations } from './axe.ts';

interface Entry { id: string; account: string; memo: string; amount: Money }
const entries: Entry[] = [
  { id: 'e1', account: 'Cash', memo: 'Opening', amount: money(1_000_00n, 'NPR') },
  { id: 'e2', account: 'Bank', memo: 'Deposit', amount: money(2_500_50n, 'NPR') },
  { id: 'e3', account: 'Cash', memo: 'Petty', amount: money(-200_25n, 'NPR') },
  { id: 'e4', account: 'Bank', memo: 'Fee', amount: money(-10_00n, 'NPR') },
];
const columns: FinancialColumn<Entry>[] = [
  { key: 'memo', label: 'Memo', rowHeader: true, render: (e) => e.memo },
  { key: 'id', label: 'Ref', render: (e) => e.id, value: (e) => e.id, aggregate: 'count' },
  { key: 'amount', label: 'Amount', kind: 'money', value: (e) => e.amount, aggregate: 'sum', render: (e) => String(e.amount.minor) },
];
const rowKey = (e: Entry) => e.id;
const byAccount = (e: Entry) => e.account;
const vcolumns: VirtualColumn<Entry>[] = columns.map((c) => ({ ...c, width: 120 }));
const drawn = (container: HTMLElement) => [...container.querySelectorAll<HTMLTableRowElement>('tbody tr[data-index]')];

function GroupedSelection() {
  const [ids, setIds] = useState<readonly string[]>([]);
  return <FinancialTable caption="Entries" columns={columns} rows={entries} rowKey={rowKey} emptyTitle="None" groupBy={byAccount} collapsedGroups={['Bank']}
    selection={{ selectedRowIds: ids, onChange: setIds, rowLabel: (id) => `Select ${id}` }} />;
}
function VirtualGroupedSelection() {
  const [ids, setIds] = useState<readonly string[]>([]);
  return <VirtualFinancialTable caption="Entries" columns={vcolumns} rows={entries} rowKey={rowKey} emptyTitle="None" groupBy={byAccount} collapsedGroups={['Cash']}
    expectedTotals={{ amount: money(3_290_25n, 'NPR') }} selection={{ selectedRowIds: ids, onChange: setIds, rowLabel: (id) => `Select ${id}` }} />;
}

describe('FinancialTable grouping and totals', () => {
  it('keeps its old output when no new props are given', () => {
    const { container } = render(<FinancialTable caption="Entries" columns={columns} rows={entries} rowKey={rowKey} emptyTitle="None" />);
    expect(container.querySelectorAll('tbody')).toHaveLength(1);
    expect(container.querySelector('tfoot')).toBeNull();
    // A money kind aligns its head and cells to the end.
    expect(screen.getByRole('columnheader', { name: 'Amount' })!.classList.contains('num')).toBe(true);
    expect(screen.getByRole('columnheader', { name: 'Memo' })!.classList.contains('num')).toBe(false);
  });

  it('draws one row group per key with a rowgroup header, subtotals and a disclosure button', async () => {
    const { container } = render(<FinancialTable caption="Entries" columns={columns} rows={entries} rowKey={rowKey} emptyTitle="None" groupBy={byAccount} totals />);
    const groups = container.querySelectorAll('tbody.kit-table-group');
    expect(groups).toHaveLength(2);
    const cash = groups[0]!;
    const head = cash.querySelector<HTMLElement>('.kit-table-group-head > th')!;
    expect(head!.getAttribute('scope')).toBe('rowgroup');
    const toggle = within(head).getByRole('button', { name: 'Cash 2 rows' });
    expect(toggle!.getAttribute('aria-expanded')).toBe('true');
    // Subtotals: count 2, amount 1000.00 - 200.25 = 799.75, exact and plain by default.
    expect(within(cash.querySelector('.kit-table-group-head') as HTMLElement).getByText('NPR 799.75')).toBeTruthy();
    expect(cash.querySelectorAll('tr')).toHaveLength(3);
    // Footer total over every row: 3290.25.
    const foot = container.querySelector('tfoot')!;
    expect(within(foot as HTMLElement).getByRole('rowheader', { name: 'Total' })).toBeTruthy();
    expect(within(foot as HTMLElement).getByText('NPR 3290.25')).toBeTruthy();
    expect(within(foot as HTMLElement).getByText('4')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);

    await userEvent.click(toggle);
    expect(toggle!.getAttribute('aria-expanded')).toBe('false');
    expect(cash.querySelectorAll('tr')).toHaveLength(1);
    // Keyboard: the toggle is a native button.
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    expect(toggle!.getAttribute('aria-expanded')).toBe('true');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('supports controlled collapsed groups and custom labels', async () => {
    const onChange = vi.fn<(keys: readonly string[]) => void>();
    render(<FinancialTable caption="Entries" columns={columns} rows={entries} rowKey={rowKey} emptyTitle="None" groupBy={byAccount}
      groupLabel={(key, rows) => `${key} (${rows.length})`} collapsedGroups={['Bank']} onCollapsedGroupsChange={onChange}
      totalsLabels={{ groupCount: (n) => `${n} entries` }} />);
    const bank = screen.getByRole('button', { name: 'Bank (2) 2 entries' });
    expect(bank!.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Deposit')).toBeNull();
    await userEvent.click(bank);
    expect(onChange).toHaveBeenCalledWith([]);
    // Controlled: stays collapsed until the parent changes the prop.
    expect(bank!.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows a reconciliation badge in words when expected totals are given', async () => {
    const { container, rerender } = render(<FinancialTable caption="Entries" columns={columns} rows={entries} rowKey={rowKey} emptyTitle="None" expectedTotals={{ amount: money(3_290_25n, 'NPR') }} />);
    expect(screen.getByText('Reconciles')).toBeTruthy();
    rerender(<FinancialTable caption="Entries" columns={columns} rows={entries} rowKey={rowKey} emptyTitle="None" expectedTotals={{ amount: money(3_300_00n, 'NPR') }}
      totalsLabels={{ mismatch: 'Differs by', expected: 'statement' }} />);
    const badge = container.querySelector('.kit-recon.mismatch')!;
    expect(badge.textContent).toBe('!Differs by NPR -9.75, statement NPR 3300.00');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('keeps collapsed rows selectable through the page checkbox', async () => {
    const { container } = render(<GroupedSelection />);
    await userEvent.click(screen.getAllByRole('checkbox', { name: 'Select all rows on this page' })[0]!);
    expect(screen.getByText('4 selected')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('refuses mixed currencies in a total', () => {
    const mixed = [...entries, { id: 'e5', account: 'Cash', memo: 'FX', amount: money(1n, 'USD') }];
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<FinancialTable caption="Entries" columns={columns} rows={mixed} rowKey={rowKey} emptyTitle="None" totals />)).toThrow(/Cannot combine NPR and USD/);
    vi.restoreAllMocks();
  });
});

describe('VirtualFinancialTable grouping and sticky totals', () => {

  it('draws group headers as virtual rows with subtotals and a footer total', async () => {
    const { container } = render(<VirtualFinancialTable caption="Entries" columns={vcolumns} rows={entries} rowKey={rowKey} emptyTitle="None" groupBy={byAccount} totals />);
    const rows = drawn(container);
    expect(rows).toHaveLength(6);
    expect(rows[0]!.classList.contains('pu-vt-group')).toBe(true);
    expect(rows[0]!.getAttribute('aria-rowindex')).toBe('2');
    expect(container.querySelector('table')!.getAttribute('aria-rowcount')).toBe('8');
    expect(within(rows[0]!).getByRole('button', { name: 'Cash 2 rows' })!.getAttribute('aria-expanded')).toBe('true');
    expect(within(rows[0]!).getByText('NPR 799.75')).toBeTruthy();
    const foot = container.querySelector('tfoot tr')!;
    expect(foot!.getAttribute('aria-rowindex')).toBe('8');
    expect(within(foot as HTMLElement).getByText('NPR 3290.25')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('opens and closes groups from the keyboard on the focused header row', () => {
    const { container } = render(<VirtualFinancialTable caption="Entries" columns={vcolumns} rows={entries} rowKey={rowKey} emptyTitle="None" groupBy={byAccount} />);
    const head = drawn(container)[0]!;
    head.focus();
    fireEvent.keyDown(head, { key: 'ArrowLeft' });
    expect(drawn(container)).toHaveLength(4);
    expect(within(drawn(container)[0]!).getByRole('button')!.getAttribute('aria-expanded')).toBe('false');
    fireEvent.keyDown(drawn(container)[0]!, { key: 'ArrowRight' });
    expect(drawn(container)).toHaveLength(6);
    fireEvent.keyDown(drawn(container)[0]!, { key: 'Enter' });
    expect(drawn(container)).toHaveLength(4);
    fireEvent.keyDown(drawn(container)[0]!, { key: ' ' });
    expect(drawn(container)).toHaveLength(6);
    // Down moves on to the first record.
    fireEvent.keyDown(drawn(container)[0]!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(drawn(container)[1]);
  });

  it('selects every row, grouped or not, from the head checkbox', async () => {
    const { container } = render(<VirtualGroupedSelection />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    expect(screen.getByText('4 selected')).toBeTruthy();
    expect(screen.getByText('Reconciles')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('renders groups and totals on the server', () => {
    const html = renderToString(<VirtualFinancialTable caption="Entries" columns={vcolumns} rows={entries} rowKey={rowKey} emptyTitle="None" groupBy={byAccount} totals />);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('<tfoot>');
  });
});
