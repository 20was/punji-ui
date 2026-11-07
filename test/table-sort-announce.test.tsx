import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { FinancialTable, type FinancialColumn } from '../src/financial/financial.tsx';
import { DataTable, DataListRow, type DataTableSortLabels } from '../src/table/Table.tsx';
import { StockTable, type QuoteSort } from '../src/stock-table/StockTable.tsx';

interface Row { id: string; memo: string; amount: number }
const rows: Row[] = [{ id: 'a', memo: 'One', amount: 1 }, { id: 'b', memo: 'Two', amount: 2 }];
const columns: FinancialColumn<Row>[] = [
  { key: 'memo', label: 'Memo', rowHeader: true, sortable: true, render: (r) => r.memo },
  { key: 'amount', label: 'Amount', num: true, sortable: true, render: (r) => String(r.amount) },
];
const status = () => document.querySelector('[data-sort-announcer]') as HTMLElement;

function Fin({ sortLabels, initial }: { sortLabels?: Partial<DataTableSortLabels>; initial?: { key: string; dir: 'asc' | 'desc' } }) {
  const [sort, setSort] = useState(initial);
  return (
    <>
      <FinancialTable caption="Entries" columns={columns} rows={rows} rowKey={(r) => r.id} emptyTitle="None" sort={sort} sortLabels={sortLabels}
        onSort={(key) => setSort(sort?.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })} />
      <button type="button" onClick={() => setSort({ key: 'memo', dir: 'desc' })}>external</button>
    </>
  );
}

function T() {
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  return <DataTable caption="T" columns={[{ key: 'x', label: 'Price', sortable: true }]} sort={{ key: 'x', dir }} onSort={() => setDir(dir === 'asc' ? 'desc' : 'asc')}><DataListRow><td>1</td></DataListRow></DataTable>;
}

function S() {
  const [sort, setSort] = useState<QuoteSort | undefined>();
  return <StockTable caption="Quotes" quotes={[{ symbol: 'NABIL', name: 'Nabil', ltp: 10000n, previousClose: 9000n, volume: 10, turnover: 1000n }]} sort={sort} onSortChange={setSort} />;
}

describe('sort announcements', () => {
  it('FinancialTable: silent on mount, announces after a click and Enter', async () => {
    const user = userEvent.setup();
    render(<Fin initial={{ key: 'memo', dir: 'asc' }} />);
    expect(status().textContent).toBe('');
    await user.click(screen.getByRole('button', { name: /Amount/ }));
    expect(status().textContent).toBe('Sorted by Amount, ascending');
    screen.getByRole('button', { name: /Amount/ }).focus();
    await user.keyboard('{Enter}');
    expect(status().textContent).toBe('Sorted by Amount, descending');
    expect(status().getAttribute('aria-live')).toBe('polite');
  });

  it('does not announce a sort change the user did not cause', async () => {
    const user = userEvent.setup();
    render(<Fin />);
    await user.click(screen.getByRole('button', { name: 'external' }));
    expect(status().textContent).toBe('');
  });

  it('uses custom words', async () => {
    const user = userEvent.setup();
    render(<Fin sortLabels={{ ascending: 'chadhdo', sorted: (c, d) => `${c} kramabaddha: ${d}` }} />);
    await user.click(screen.getByRole('button', { name: /Memo/ }));
    expect(status().textContent).toBe('Memo kramabaddha: chadhdo');
  });

  it('DataTable announces on its own', async () => {
    const user = userEvent.setup();
    render(<T />);
    expect(status().textContent).toBe('');
    await user.click(screen.getByRole('button', { name: /Price/ }));
    expect(status().textContent).toBe('Sorted by Price, ascending');
  });

  it('StockTable announces through DataTable', async () => {
    const user = userEvent.setup();
    render(<S />);
    expect(status().textContent).toBe('');
    await user.click(screen.getByRole('button', { name: /Symbol/ }));
    expect(status().textContent).toBe('Sorted by Symbol, ascending');
  });
});
