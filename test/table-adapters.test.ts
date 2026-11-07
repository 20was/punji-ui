import type { ColDef } from 'ag-grid-community';
import type { GridColDef } from '@mui/x-data-grid';
import { createSortedRowModel, rowSortingFeature, tableFeatures, useTable } from '@tanstack/react-table';
import { renderHook } from '@testing-library/react';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { moneyCellRenderer, moneyColDef, moneyComparator, moneyValueFormatter as agFormatter, toAgGridColumns } from '../src/ag-grid/agGrid.ts';
import { money, type Money } from '../src/money/money.ts';
import { moneyGridColDef, moneySortComparator, moneyGridValueFormatter as muiFormatter, renderMoneyCell, toGridColDefs } from '../src/mui-x-grid/muiXGrid.ts';
import type { ColumnDef } from '../src/table-core/tableCore.ts';
import { moneyCell, moneySortFn, toTanStackColumns } from '../src/tanstack-table/tanstackTable.ts';

interface Account { id: string; name: string; balance: Money | null; units: bigint }
const BIG = 9007199254740993n; // 2^53 + 1: Number() cannot tell it from 2^53.
const rows: Account[] = [
  { id: 'a', name: 'Reserve', balance: money(BIG, 'NPR'), units: 3n },
  { id: 'b', name: 'Operating', balance: money(BIG - 1n, 'NPR'), units: 1n },
  { id: 'c', name: 'Petty', balance: money(1250n, 'NPR'), units: 2n },
  { id: 'd', name: 'Closed', balance: null, units: 0n },
];
const columns: ColumnDef<Account, string>[] = [
  { id: 'name', header: 'Account', accessor: (r) => r.name, sortable: true },
  { id: 'balance', header: 'Balance', kind: 'money', accessor: (r) => r.balance, sortable: true },
  { id: 'units', header: 'Units', kind: 'quantity', accessor: (r) => r.units },
  { id: 'custom', header: 'Custom', accessor: (r) => r.name, cell: (r) => `<<${r.name}>>`, sortKey: (r) => r.units, sortable: true },
];

describe('the test data really is past 2^53', () => {
  it('Number() cannot separate the two balances', () => {
    expect(Number(BIG) === Number(BIG - 1n)).toBe(true);
  });
});

describe('toTanStackColumns', () => {
  const defs = toTanStackColumns(columns, { money: { locale: 'en-IN' } });
  const row = (a: Account) => ({ original: a, getValue: (id: string) => defs.find((d) => d.id === id)!.accessorFn(a) });
  const cellOf = (id: string, a: Account) => defs.find((d) => d.id === id)!.cell({ row: row(a), getValue: () => defs.find((d) => d.id === id)!.accessorFn(a) });

  it('maps ids, headers, sortable and alignment', () => {
    expect(defs.map((d) => [d.id, d.header, d.enableSorting, d.meta.align])).toEqual([
      ['name', 'Account', true, 'start'], ['balance', 'Balance', true, 'end'], ['units', 'Units', false, 'end'], ['custom', 'Custom', true, 'start'],
    ]);
    expect(defs.every((d) => d.sortUndefined === 'last')).toBe(true);
  });

  it('prints money exactly and keeps a column cell', () => {
    expect(String(cellOf("balance", rows[0]!)).replace(/\s/g, " ")).toBe('NPR 9,00,71,99,25,47,409.93');
    expect(String(cellOf("balance", rows[1]!)).replace(/\s/g, " ")).toBe('NPR 9,00,71,99,25,47,409.92');
    expect(cellOf('balance', rows[3]!)).toBe('');
    expect(cellOf('units', rows[0]!)).toBe('3');
    expect(cellOf('custom', rows[0]!)).toBe('<<Reserve>>');
  });

  it('turns null into undefined so sortUndefined applies', () => {
    expect(defs[1]!.accessorFn(rows[3]!)).toBeUndefined();
  });

  it('moneySortFn orders by exact minor units past 2^53', () => {
    const sorted = rows.filter((r) => r.balance).toSorted((a, b) => moneySortFn(row(a), row(b), 'balance'));
    expect(sorted.map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });

  it('sortKey drives the sort of a column', () => {
    const sorted = rows.toSorted((a, b) => defs[3]!.sortFn(row(a), row(b), 'custom'));
    expect(sorted.map((r) => r.id)).toEqual(['d', 'b', 'c', 'a']);
  });

  it('works in a real TanStack Table v9 table: sorts ascending and descending, missing last', () => {
    const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel() });
    const build = (desc: boolean) => renderHook(() => useTable({
      features,
      columns: defs as never,
      data: rows,
      getRowId: (r: Account) => r.id,
      state: { sorting: [{ id: 'balance', desc }] },
    } as never)).result.current as unknown as { getRowModel: () => { rows: { id: string }[] } };
    expect(build(false).getRowModel().rows.map((r) => r.id)).toEqual(['c', 'b', 'a', 'd']);
    expect(build(true).getRowModel().rows.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('property: moneySortFn agrees with bigint order for any amounts', () => {
    fc.assert(fc.property(fc.bigInt({ min: -(10n ** 30n), max: 10n ** 30n }), fc.bigInt({ min: -(10n ** 30n), max: 10n ** 30n }), (x, y) => {
      const a = { original: null, getValue: () => money(x, 'USD') };
      const b = { original: null, getValue: () => money(y, 'USD') };
      expect(Math.sign(moneySortFn(a, b, 'x'))).toBe(x < y ? -1 : x > y ? 1 : 0);
    }));
  });

  it('moneyCell formats money, and bigint minor units with a currency', () => {
    expect(moneyCell({ locale: 'en-US' })({ getValue: () => money(123456n, 'USD') })).toBe('$1,234.56');
    expect(moneyCell({ locale: 'en-US', currency: 'USD' })({ getValue: () => 5n })).toBe('$0.05');
    expect(moneyCell()({ getValue: () => undefined })).toBe('');
  });
});

describe('AG Grid helpers', () => {
  it('moneyComparator compares past 2^53, by currency first, missing smallest', () => {
    expect(moneyComparator(money(BIG, 'NPR'), money(BIG - 1n, 'NPR'))).toBe(1);
    expect(moneyComparator(money(BIG - 1n, 'NPR'), money(BIG, 'NPR'))).toBe(-1);
    expect(moneyComparator(money(5n, 'NPR'), money(5n, 'NPR'))).toBe(0);
    expect(moneyComparator(money(10n ** 20n, 'EUR'), money(1n, 'NPR'))).toBe(-1);
    expect(moneyComparator(null, money(1n, 'NPR'))).toBe(-1);
    expect(moneyComparator(undefined, null)).toBe(0);
    expect(moneyComparator(7n, 8n)).toBe(-1);
  });

  it('formats money exactly and renders the same text', () => {
    const f = agFormatter({ locale: 'en-US' });
    expect(f({ value: money(BIG, 'USD') })).toBe('$90,071,992,547,409.93');
    expect(f({ value: null })).toBe('');
    expect(moneyCellRenderer({ locale: 'en-US' })({ value: money(-5n, 'USD') })).toBe('-$0.05');
  });

  it('moneyColDef and toAgGridColumns fit ColDef', () => {
    const col = { field: 'balance', ...moneyColDef({ locale: 'en-IN' }) } satisfies ColDef<Account>;
    expect(col.type).toBe('rightAligned');
    const defs = toAgGridColumns(columns);
    const typed: ColDef<Account>[] = defs.map((d) => ({ ...d, type: d.type }));
    expect(typed.map((d) => [d.colId, d.headerName, d.sortable, d.type])).toEqual([
      ['name', 'Account', true, undefined], ['balance', 'Balance', true, 'rightAligned'], ['units', 'Units', false, 'rightAligned'], ['custom', 'Custom', true, undefined],
    ]);
    expect(defs[1]!.valueGetter({ data: rows[0]! })).toEqual(money(BIG, 'NPR'));
    expect(defs[1]!.valueGetter({})).toBeUndefined();
    const sortKeyed = defs[3]!.comparator;
    expect(sortKeyed('x', 'y', { data: rows[0]! }, { data: rows[1]! })).toBe(1);
    expect(sortKeyed('x', 'y', {}, { data: rows[1]! })).toBe(-1);
  });
});

describe('MUI X DataGrid helpers', () => {
  it('sortComparator compares past 2^53', () => {
    expect(moneySortComparator(money(BIG, 'NPR'), money(BIG - 1n, 'NPR'))).toBe(1);
    expect(moneySortComparator(money(1n, 'NPR'), money(2n, 'NPR'))).toBe(-1);
  });

  it('valueFormatter takes the v9 value and the legacy params object', () => {
    const f = muiFormatter({ locale: 'en-US' });
    expect(f(money(BIG, 'USD'))).toBe('$90,071,992,547,409.93');
    expect(f({ value: money(BIG, 'USD') })).toBe('$90,071,992,547,409.93');
    expect(f(null)).toBe('');
    expect(renderMoneyCell({ locale: 'en-US' })({ value: money(100n, 'USD') })).toBe('$1.00');
  });

  it('moneyGridColDef and toGridColDefs fit GridColDef', () => {
    const col = { field: 'balance', ...moneyGridColDef() } satisfies GridColDef;
    expect(col.align).toBe('right');
    const byId = new Map(rows.map((r) => [r.id, r]));
    const defs = toGridColDefs(columns, { getRow: (id) => byId.get(id as string) });
    const typed: GridColDef<Account>[] = defs.map((d) => ({ ...d, valueFormatter: d.valueFormatter as never }));
    expect(typed.map((d) => [d.field, d.headerName, d.sortable, d.align])).toEqual([
      ['name', 'Account', true, 'left'], ['balance', 'Balance', true, 'right'], ['units', 'Units', false, 'right'], ['custom', 'Custom', true, 'left'],
    ]);
    expect(defs[1]!.valueGetter(undefined, rows[0]!)).toEqual(money(BIG, 'NPR'));
    expect(defs[3]!.sortComparator('x', 'y', { id: 'a' }, { id: 'b' })).toBe(1);
    expect(defs[3]!.sortComparator(2n, 1n, { id: 'zz' }, { id: 'zz2' })).toBe(1);
    expect(toGridColDefs(columns)[3]!.sortComparator(money(2n, 'NPR'), money(1n, 'NPR'), { id: 1 }, { id: 2 })).toBe(1);
  });
});
