import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ScrollTable, type ColumnDef } from '../src/index.ts';
import { money as moneyOf } from '../src/money/money.ts';
import { seriousViolations } from './axe.ts';

interface Co { s: string; name: string; ltp: bigint; chg: number | null; cap: ReturnType<typeof moneyOf> }
const COS: Co[] = [
  { s: 'NABIL', name: 'Nabil Bank', ltp: 50000n, chg: 1.2, cap: moneyOf(9007199254740993n, 'NPR') },
  { s: 'ADBL', name: 'Agri Dev Bank', ltp: 31000n, chg: null, cap: moneyOf(9007199254740992n, 'NPR') },
  { s: 'HDL', name: 'Himalayan Distillery', ltp: 120000n, chg: -0.5, cap: moneyOf(100n, 'NPR') },
];
const COLUMNS: ColumnDef<Co, string>[] = [
  { id: 's', header: 'Company', accessor: (c) => c.s, sortable: true },
  { id: 'ltp', header: 'Close', kind: 'price', accessor: (c) => c.ltp, sortable: true },
  { id: 'chg', header: 'Today', kind: 'percent', accessor: (c) => c.chg, cell: (c) => (c.chg === null ? '—' : `${c.chg}%`), sortable: true, hideUnder: 760 },
  { id: 'cap', header: 'Value', kind: 'money', accessor: (c) => c.cap, sortable: true, aggregate: 'sum' },
];
const order = () => screen.getAllByRole('rowheader').map((th) => th.textContent);
const table = (props: Partial<React.ComponentProps<typeof ScrollTable<Co>>> = {}) => render(<ScrollTable caption="Companies" columns={COLUMNS} rows={COS} rowKey={(c) => c.s} {...props} />);

describe('ScrollTable', () => {
  it('is a focusable, named scroll region with a caption and the print hook class', () => {
    table({ testId: 'st', className: 'extra' });
    const region = screen.getByRole('region', { name: 'Companies' });
    expect(region).toBe(screen.getByTestId('st'));
    expect(region.tabIndex).toBe(0);
    expect(region.className).toContain('pu-print-table');
    expect(region.className).toContain('sticky-first');
    expect(region.className).toContain('extra');
    expect(within(region).getByRole('table', { name: 'Companies' })).toBeTruthy();
  });

  it('can turn the sticky first column off', () => {
    table({ stickyFirstColumn: false });
    expect(screen.getByRole('region').className).not.toContain('sticky-first');
  });

  it('makes the first column the row header and aligns figures to the end', () => {
    table();
    expect(order()).toEqual(['NABIL', 'ADBL', 'HDL']);
    const head = screen.getByRole('columnheader', { name: /Close/ });
    expect(head.className).toContain('num');
    expect(screen.getByRole('columnheader', { name: /Today/ }).className).toContain('hide-760');
  });

  it('sorts text ascending first and figures largest first, then flips, with aria-sort', () => {
    table();
    const company = screen.getByRole('button', { name: /Company/ });
    expect(screen.getByRole('columnheader', { name: /Company/ }).getAttribute('aria-sort')).toBe('none');
    fireEvent.click(company);
    expect(order()).toEqual(['ADBL', 'HDL', 'NABIL']);
    expect(screen.getByRole('columnheader', { name: /Company/ }).getAttribute('aria-sort')).toBe('ascending');
    fireEvent.click(company);
    expect(order()).toEqual(['NABIL', 'HDL', 'ADBL']);
    expect(screen.getByRole('columnheader', { name: /Company/ }).getAttribute('aria-sort')).toBe('descending');
    fireEvent.click(screen.getByRole('button', { name: /Close/ }));
    expect(order()).toEqual(['HDL', 'NABIL', 'ADBL']);
    // Only one head is sorted at a time.
    expect(screen.getByRole('columnheader', { name: /Company/ }).getAttribute('aria-sort')).toBe('none');
    expect(screen.getByRole('status').textContent).toBe('Sorted by Close, descending');
  });

  it('sorts money by exact minor units past 2^53 and puts missing values last either way', () => {
    table();
    fireEvent.click(screen.getByRole('button', { name: /Value/ }));
    expect(order()).toEqual(['NABIL', 'ADBL', 'HDL']);
    fireEvent.click(screen.getByRole('button', { name: /Value/ }));
    expect(order()).toEqual(['HDL', 'ADBL', 'NABIL']);
    fireEvent.click(screen.getByRole('button', { name: /Today/ }));
    expect(order()).toEqual(['NABIL', 'HDL', 'ADBL']);
    fireEvent.click(screen.getByRole('button', { name: /Today/ }));
    expect(order()).toEqual(['HDL', 'NABIL', 'ADBL']);
  });

  it('sorts from the keyboard (the head is a real button) and never reorders rows in place', () => {
    const rows = [...COS];
    table({ rows });
    const button = screen.getByRole('button', { name: /Company/ });
    expect(button.tagName).toBe('BUTTON');
    button.focus();
    expect(document.activeElement).toBe(button);
    fireEvent.click(button); // Enter and Space on a button arrive as click.
    expect(rows.map((r) => r.s)).toEqual(['NABIL', 'ADBL', 'HDL']);
  });

  it('only offers a sort button on sortable columns that have a value to sort by', () => {
    table({ columns: [{ id: 's', header: 'Company', accessor: (c) => c.s }, { id: 'ltp', header: 'Close', sortable: true }] });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getAllByRole('columnheader').every((th) => !th.hasAttribute('aria-sort'))).toBe(true);
  });

  it('can be controlled', () => {
    const onSortChange = vi.fn<(sort: unknown) => void>();
    table({ sort: { key: 's', dir: 'desc' }, onSortChange });
    expect(order()).toEqual(['NABIL', 'HDL', 'ADBL']);
    fireEvent.click(screen.getByRole('button', { name: /Company/ }));
    expect(onSortChange).toHaveBeenCalledWith({ key: 's', dir: 'asc' });
    expect(order()).toEqual(['NABIL', 'HDL', 'ADBL']);
  });

  it('starts from defaultSort', () => {
    table({ defaultSort: { key: 'ltp', dir: 'asc' } });
    expect(order()).toEqual(['ADBL', 'NABIL', 'HDL']);
  });

  it('adds exact footer totals and says Total', () => {
    table({ totals: true });
    const foot = document.querySelector('tfoot')!;
    expect(within(foot).getByRole('rowheader').textContent).toBe('Total');
    // 9007199254740993 + 9007199254740992 + 100 paisa, exactly (a float sum would be off).
    expect(foot.textContent).toContain('NPR 180143985094820.85');
  });

  it('uses formatAggregate and labels', () => {
    const columns = COLUMNS.map((c) => (c.id === 'cap' ? { ...c, formatAggregate: () => 'sum!' } : c));
    table({ totals: true, columns, labels: { total: 'Jamma' } });
    expect(document.querySelector('tfoot')!.textContent).toBe('Jammasum!');
  });

  it('shows a message and no totals for no rows, and can show the caption', () => {
    table({ rows: [], totals: true, showCaption: true });
    expect(screen.getByText('No records to display.')).toBeTruthy();
    expect(document.querySelector('tfoot')).toBeNull();
    expect(document.querySelector('caption')!.className).toBe('');
  });

  it('has no serious axe violations', async () => {
    const { container } = table({ totals: true });
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('table print stylesheet', () => {
  const css = readFileSync('src/styles/table-print.css', 'utf8');
  it('repeats the head, avoids row splits, removes scroll clipping and prints black on white', () => {
    const print = css.slice(css.indexOf('@media print'));
    expect(print).toContain('thead { display: table-header-group');
    expect(print).toContain('break-inside: avoid');
    expect(print).toContain('overflow: visible');
    expect(print).toContain('CanvasText');
    expect(print).toContain('.pu-no-print { display: none');
    expect(css).toContain("[data-print='off']");
  });
});
