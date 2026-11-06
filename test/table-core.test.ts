import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { money, type Money } from '../src/money/money.ts';
import {
  MixedCurrencyError, aggregateColumn, columnAlign, compareRowsBy, compareValues, footerTotals, fromColumn, fromFinancialColumn, groupRows,
  isNumericKind, plainValue, reconcile, reconcileTotals, sortRows, type ColumnDef,
} from '../src/table-core/tableCore.ts';

interface Line { id: string; account: string; amount: Money; units: bigint; qty: number }
const amountCol: ColumnDef<Line> = { id: 'amount', header: 'Amount', kind: 'money', accessor: (l) => l.amount, aggregate: 'sum', sortable: true };
const unitsCol: ColumnDef<Line> = { id: 'units', header: 'Units', kind: 'quantity', accessor: (l) => l.units, aggregate: 'sum' };
const countCol: ColumnDef<Line> = { id: 'id', header: 'Id', accessor: (l) => l.id, aggregate: 'count' };
const columns = [countCol, amountCol, unitsCol];

const lineArb = (currency = 'NPR') => fc.record({
  id: fc.uuid(),
  account: fc.constantFrom('cash', 'bank', 'fees', 'tax'),
  // Far beyond Number.MAX_SAFE_INTEGER, positive and negative.
  amount: fc.bigInt({ min: -(10n ** 30n), max: 10n ** 30n }).map((minor) => money(minor, currency)),
  units: fc.bigInt({ min: 0n, max: 10n ** 24n }),
  qty: fc.integer({ min: 0, max: 1000 }),
});

describe('ColumnDef kinds and alignment', () => {
  it('aligns numeric kinds to the end and the rest to the start', () => {
    for (const kind of ['money', 'quantity', 'price', 'percent'] as const) {
      expect(isNumericKind(kind)).toBe(true);
      expect(columnAlign({ kind })).toBe('end');
    }
    for (const kind of ['text', 'date', 'custom', undefined] as const) expect(columnAlign({ kind })).toBe('start');
    expect(columnAlign({ kind: 'money', align: 'start' })).toBe('start');
  });

  it('adapts Column and FinancialColumn without losing layout', () => {
    expect(fromColumn({ key: 'fee', label: 'Fee', num: true, wide: true, sortable: true })).toMatchObject({ id: 'fee', header: 'Fee', kind: 'custom', align: 'end', sortable: true, hideUnder: 760 });
    expect(columnAlign(fromColumn({ key: 'name', label: 'Name' }))).toBe('start');
    expect(fromColumn({ key: 'x', label: 'X', hideUnder: 1024 }).hideUnder).toBe(1024);
    const render = (l: Line) => l.id;
    const value = (l: Line) => l.amount;
    const def = fromFinancialColumn<Line>({ key: 'amount', label: 'Amount', kind: 'money', value, aggregate: 'sum', render, rowHeader: false, pin: 'right', width: 140 });
    expect(def).toMatchObject({ id: 'amount', kind: 'money', cell: render, accessor: value, aggregate: 'sum', pin: 'right', width: 140 });
    expect(columnAlign(def)).toBe('end');
    // A legacy numeric column keeps end alignment; `num: false` overrides a numeric kind.
    expect(columnAlign(fromFinancialColumn<Line>({ key: 'q', label: 'Q', num: true, render }))).toBe('end');
    expect(columnAlign(fromFinancialColumn<Line>({ key: 'q', label: 'Q', num: false, kind: 'money', render }))).toBe('start');
  });
});

describe('bigint-safe sorting', () => {
  it('sorts money by exact minor units for any values (property)', () => {
    fc.assert(fc.property(fc.array(fc.bigInt({ min: -(10n ** 40n), max: 10n ** 40n }), { maxLength: 60 }), (minors) => {
      const rows = minors.map((minor, i) => ({ id: String(i), account: 'a', amount: money(minor, 'USD'), units: 0n, qty: 0 }));
      const sorted = sortRows(rows, columns, [{ key: 'amount', dir: 'asc' }]).map((r) => r.amount.minor);
      expect(sorted).toEqual(minors.toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
      const desc = sortRows(rows, columns, [{ key: 'amount', dir: 'desc' }]).map((r) => r.amount.minor);
      expect(desc).toEqual(sorted.toReversed());
    }));
  });

  it('never sorts by formatted text, and puts missing values last', () => {
    const rows = [9n, 10n, 100n, -2n].map((minor, i) => ({ id: String(i), account: 'a', amount: money(minor, 'NPR'), units: 0n, qty: 0 }));
    // As strings "10" < "100" < "9"; as amounts 9 < 10 < 100.
    expect(sortRows(rows, columns, [{ key: 'amount', dir: 'asc' }]).map((r) => r.amount.minor)).toEqual([-2n, 9n, 10n, 100n]);
    const withMissing: ColumnDef<{ v: bigint | null }> = { id: 'v', header: 'V', accessor: (r) => r.v };
    const cmp = compareRowsBy([withMissing], [{ key: 'v', dir: 'desc' }]);
    expect([{ v: null }, { v: 1n }, { v: 3n }].toSorted(cmp).map((r) => r.v)).toEqual([3n, 1n, null]);
  });

  it('compares bigint with number exactly and money by currency first', () => {
    expect(compareValues(2n ** 64n, 2 ** 64 - 1)).toBe(0); // 2**64 - 1 rounds to 2**64 as a double
    expect(compareValues(2n ** 64n + 1n, 2 ** 64)).toBe(1);
    expect(compareValues(money(1n, 'USD'), money(5n, 'EUR'))).toBe(1);
    expect(compareValues(new Date(0), new Date(1))).toBe(-1);
  });
});

const col = (aggregate: ColumnDef<{ v: bigint | null }>['aggregate']): ColumnDef<{ v: bigint | null }> => ({ id: 'v', header: 'V', accessor: (r) => r.v, aggregate });

describe('aggregates, groups and footer totals', () => {
  it('sum of group subtotals equals the footer total, exactly (property)', () => {
    fc.assert(fc.property(fc.array(lineArb(), { maxLength: 80 }), (lines) => {
      const groups = groupRows(lines, (l) => l.account, columns);
      const footer = footerTotals(lines, columns);
      expect(groups.reduce((n, g) => n + g.rows.length, 0)).toBe(lines.length);
      const amountSum = groups.reduce((n, g) => n + ((g.subtotals.amount as Money | null)?.minor ?? 0n), 0n);
      const unitSum = groups.reduce((n, g) => n + ((g.subtotals.units as bigint | null) ?? 0n), 0n);
      const count = groups.reduce((n, g) => n + (g.subtotals.id as number), 0);
      expect(amountSum).toBe((footer.amount as Money | null)?.minor ?? 0n);
      expect(unitSum).toBe((footer.units as bigint | null) ?? 0n);
      expect(count).toBe(lines.length);
      expect((footer.amount as Money | null)?.currency ?? 'NPR').toBe('NPR');
    }));
  });

  it('refuses to sum mixed currencies (property)', () => {
    fc.assert(fc.property(fc.array(lineArb('NPR'), { minLength: 1, maxLength: 20 }), lineArb('USD'), fc.nat(), (lines, foreign, at) => {
      const mixed = lines.toSpliced(at % (lines.length + 1), 0, foreign);
      expect(() => footerTotals(mixed, columns)).toThrow(MixedCurrencyError);
      expect(() => aggregateColumn({ ...amountCol, aggregate: 'max' }, mixed)).toThrow(MixedCurrencyError);
    }));
  });

  it('keeps group order by first appearance and row order within groups', () => {
    const lines: Line[] = ['b', 'a', 'b', 'c', 'a'].map((account, i) => ({ id: String(i), account, amount: money(BigInt(i), 'NPR'), units: 1n, qty: i }));
    const groups = groupRows(lines, (l) => l.account, columns);
    expect(groups.map((g) => g.key)).toEqual(['b', 'a', 'c']);
    expect(groups[0]!.rows.map((l) => l.id)).toEqual(['0', '2']);
    expect(groups[0]!.subtotals.amount).toEqual(money(2n, 'NPR'));
    expect(groupRows(lines, (l) => l.account)[0]!.subtotals).toEqual({});
  });

  it('computes count, min, max and custom aggregates, skipping missing values', () => {
    const rows = [{ v: 3n }, { v: null }, { v: -5n }, { v: 10n }];
    expect(aggregateColumn(col('count'), rows)).toBe(3);
    expect(aggregateColumn(col('min'), rows)).toBe(-5n);
    expect(aggregateColumn(col('max'), rows)).toBe(10n);
    expect(aggregateColumn(col('sum'), rows)).toBe(8n);
    expect(aggregateColumn(col((values) => values.length * 2), rows)).toBe(6);
    expect(aggregateColumn(col('sum'), [])).toBeNull();
    expect(aggregateColumn(col(undefined), rows)).toBeUndefined();
    const numbers: ColumnDef<{ n: number }> = { id: 'n', header: 'N', accessor: (r) => r.n, aggregate: 'sum' };
    expect(aggregateColumn(numbers, [{ n: 1 }, { n: 2 }])).toBe(3);
    const mixed: ColumnDef<{ n: number | bigint }> = { id: 'n', header: 'N', accessor: (r) => r.n, aggregate: 'sum' };
    expect(() => aggregateColumn(mixed, [{ n: 1 }, { n: 2n }])).toThrow(TypeError);
  });
});

describe('reconciliation', () => {
  it('reports ok or the exact difference (computed minus expected)', () => {
    expect(reconcile(money(100_00n, 'NPR'), money(100_00n, 'NPR'))).toMatchObject({ status: 'ok', difference: { minor: 0n, currency: 'NPR' } });
    const off = reconcile(money(100_00n, 'NPR'), money(99_50n, 'NPR'));
    expect(off.status).toBe('mismatch');
    expect(off.difference).toEqual(money(-50n, 'NPR'));
    expect(() => reconcile(money(1n, 'NPR'), money(1n, 'USD'))).toThrow(MixedCurrencyError);
  });

  it('reconciles footer totals by column, treating no rows as zero', () => {
    const totals = footerTotals<Line>([], columns);
    expect(reconcileTotals(totals, { amount: money(0n, 'NPR') }).amount!.status).toBe('ok');
    expect(reconcileTotals({ amount: money(5n, 'NPR') }, { amount: money(7n, 'NPR') }).amount!.difference.minor).toBe(-2n);
    expect(() => reconcileTotals({ units: 5n }, { units: money(5n, 'NPR') })).toThrow(TypeError);
  });

  it('is exact for any amounts (property)', () => {
    fc.assert(fc.property(fc.bigInt(), fc.bigInt(), (a, b) => {
      const r = reconcile(money(a, 'JPY'), money(b, 'JPY'));
      expect(r.difference.minor).toBe(b - a);
      expect(r.status === 'ok').toBe(a === b);
    }));
  });
});

describe('plainValue', () => {
  it('prints money exactly at the currency exponent', () => {
    expect(plainValue(money(123_456_789_012_345_678_901n, 'NPR'))).toBe('NPR 1234567890123456789.01');
    expect(plainValue(money(-5n, 'USD'))).toBe('USD -0.05');
    expect(plainValue(money(1234n, 'JPY'))).toBe('JPY 1234');
    expect(plainValue(money(1n, 'KWD'))).toBe('KWD 0.001');
    expect(plainValue(new Date(Date.UTC(2026, 0, 2)))).toBe('2026-01-02');
    expect(plainValue(null)).toBe('');
    expect(plainValue(12n)).toBe('12');
  });
});
