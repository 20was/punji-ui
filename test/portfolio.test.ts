import { describe, expect, it } from 'vitest';

import {
  allocateHoldings, dividendEntriesFromTransactions, dividendsByFiscalYear, filterTransactions, holdingsSummary, holdingsToCsv, nextHoldingSort,
  positionsFromTransactions, sortHoldings, transactionLedger,
  type DividendEntry, type HoldingsQuote, type PortfolioPosition, type PortfolioTransaction,
} from '../src/index.ts';
import { portfolioQuotes, portfolioTransactions } from '../fixtures/portfolio-data.ts';

const position = (symbol: string, trades: PortfolioPosition['trades'], extra: Partial<PortfolioPosition> = {}): PortfolioPosition => ({ symbol, trades, ...extra });
const quote = (symbol: string, ltp: bigint | null, previousClose: bigint | null): HoldingsQuote => ({ symbol, ltp, previousClose });

describe('holdingsSummary', () => {
  const positions = [
    position('AAA', [{ side: 'buy', quantity: 100n, price: 10_000n, fees: 500n }], { name: 'Alpha', sector: 'Banking' }),
    position('BBB', [{ side: 'buy', quantity: 50n, price: 20_000n }, { side: 'buy', quantity: 50n, price: 30_000n }]),
  ];
  const quotes = [quote('AAA', 11_000n, 10_500n), quote('BBB', 24_000n, 25_000n)];

  it('marks positions to quotes with exact bigint money', () => {
    const { holdings, totals } = holdingsSummary(positions, quotes);
    const [a, b] = holdings;
    expect(a).toMatchObject({ symbol: 'AAA', name: 'Alpha', sector: 'Banking', quantity: 100n, costBasis: 1_000_500n, averageCost: 10_005n, marketValue: 1_100_000n, unrealisedPnL: 99_500n, dayChange: 50_000n });
    expect(a!.unrealisedPercent).toBeCloseTo(9.945, 3);
    expect(b).toMatchObject({ quantity: 100n, costBasis: 2_500_000n, averageCost: 25_000n, marketValue: 2_400_000n, unrealisedPnL: -100_000n, dayChange: -100_000n });
    expect(totals).toMatchObject({ count: 2, costBasis: 3_500_500n, pricedCostBasis: 3_500_500n, marketValue: 3_500_000n, unrealisedPnL: -500n, dayChange: -50_000n, realisedPnL: 0n, totalFees: 500n, complete: true });
    expect(totals.unpriced).toEqual([]);
    expect(totals.dayChangePercent).toBeCloseTo((-50_000 / 3_550_000) * 100, 6);
  });

  it('weights add up to exactly 100 by largest remainder', () => {
    const three = ['A', 'B', 'C'].map((s) => position(s, [{ side: 'buy', quantity: 1n, price: 10_000n }]));
    const { holdings } = holdingsSummary(three, three.map((p) => quote(p.symbol, 10_000n, 10_000n)), { weightDecimals: 2 });
    expect(holdings.map((h) => h.displayWeight)).toEqual([33.34, 33.33, 33.33]);
    expect(holdings.reduce((sum, h) => sum + Math.round(h.displayWeight! * 100), 0)).toBe(10_000);
  });

  it('never turns a missing quote into zero', () => {
    const { holdings, totals } = holdingsSummary(positions, [quote('AAA', 11_000n, 10_500n)]);
    const b = holdings[1]!;
    expect(b).toMatchObject({ ltp: null, marketValue: null, unrealisedPnL: null, unrealisedPercent: null, dayChange: null, dayChangePercent: null, weight: null, displayWeight: null });
    expect(b.costBasis).toBe(2_500_000n);
    expect(totals.unpriced).toEqual(['BBB']);
    expect(totals.complete).toBe(false);
    // Totals cover the priced holdings only and say so; the unpriced cost is still in costBasis.
    expect(totals.marketValue).toBe(1_100_000n);
    expect(totals.pricedCostBasis).toBe(1_000_500n);
    expect(totals.costBasis).toBe(3_500_500n);
    expect(holdings[0]!.displayWeight).toBe(100);
  });

  it('gives null totals, not zero, when nothing has a price', () => {
    const { totals } = holdingsSummary(positions, []);
    expect(totals.marketValue).toBeNull();
    expect(totals.unrealisedPnL).toBeNull();
    expect(totals.unrealisedPercent).toBeNull();
    expect(totals.dayChange).toBeNull();
    expect(totals.dayChangePercent).toBeNull();
    expect(totals.unpriced).toEqual(['AAA', 'BBB']);
  });

  it('leaves the day change null without a previous close and names the symbol', () => {
    const { holdings, totals } = holdingsSummary(positions, [quote('AAA', 11_000n, null), quote('BBB', 24_000n, 25_000n)]);
    expect(holdings[0]).toMatchObject({ marketValue: 1_100_000n, dayChange: null, dayChangePercent: null });
    expect(totals.noPreviousClose).toEqual(['AAA']);
    expect(totals.dayChange).toBe(-100_000n);
    expect(totals.complete).toBe(false);
  });

  it('omits fully sold symbols but keeps their realised P&L and fees in the totals', () => {
    const sold = position('SOLD', [{ side: 'buy', quantity: 10n, price: 10_000n, fees: 100n }, { side: 'sell', quantity: 10n, price: 12_000n, fees: 200n }]);
    const { holdings, totals } = holdingsSummary([sold, positions[0]!], quotes);
    expect(holdings.map((h) => h.symbol)).toEqual(['AAA']);
    expect(totals.realisedPnL).toBe(120_000n - 200n - 100_100n);
    expect(totals.totalFees).toBe(800n);
    expect(totals.count).toBe(1);
    const kept = holdingsSummary([sold], [quote('SOLD', 12_000n, 12_000n)], { includeClosed: true });
    expect(kept.holdings[0]).toMatchObject({ quantity: 0n, averageCost: null, marketValue: 0n, unrealisedPnL: 0n, unrealisedPercent: null, realisedPnL: 19_700n });
    expect(kept.totals.count).toBe(0);
    expect(kept.totals.marketValue).toBe(0n);
  });

  it('values a portfolio with no open holdings as a real zero', () => {
    const { holdings, totals } = holdingsSummary([], []);
    expect(holdings).toEqual([]);
    expect(totals).toMatchObject({ count: 0, marketValue: 0n, unrealisedPnL: 0n, costBasis: 0n, complete: true });
    expect(totals.unrealisedPercent).toBeNull();
  });

  it('has no percent against a zero cost (a bonus-only holding)', () => {
    const bonus = position('BON', [{ side: 'buy', quantity: 12n, price: 0n }]);
    const { holdings } = holdingsSummary([bonus], [quote('BON', 50_000n, 49_000n)]);
    expect(holdings[0]).toMatchObject({ costBasis: 0n, averageCost: 0n, marketValue: 600_000n, unrealisedPnL: 600_000n, unrealisedPercent: null });
  });

  it('supports fifo and rounding, and rejects duplicates and oversold positions', () => {
    const lots = position('LOT', [{ side: 'buy', quantity: 10n, price: 100n }, { side: 'buy', quantity: 10n, price: 200n }, { side: 'sell', quantity: 10n, price: 300n }]);
    expect(holdingsSummary([lots], [], { method: 'fifo' }).totals.realisedPnL).toBe(2_000n);
    expect(holdingsSummary([lots], [], { method: 'average' }).totals.realisedPnL).toBe(1_500n);
    expect(() => holdingsSummary([positions[0]!, positions[0]!], quotes)).toThrow(/Duplicate position/);
    expect(() => holdingsSummary([position('X', [{ side: 'sell', quantity: 1n, price: 1n }])], [])).toThrow(RangeError);
  });

  it('accepts quotes as a Map and keeps input order', () => {
    const map = new Map(quotes.map((q) => [q.symbol, q]));
    expect(holdingsSummary(positions, map).holdings.map((h) => h.symbol)).toEqual(['AAA', 'BBB']);
  });

  it('is exact on the sample portfolio: value, cost and P&L reconcile across holdings', () => {
    const { holdings, totals } = holdingsSummary(positionsFromTransactions(portfolioTransactions), portfolioQuotes);
    const priced = holdings.filter((h) => h.marketValue !== null);
    expect(totals.marketValue).toBe(priced.reduce((s, h) => s + h.marketValue!, 0n));
    expect(totals.unrealisedPnL).toBe(totals.marketValue! - totals.pricedCostBasis);
    expect(totals.unpriced).toEqual(['BFC']);
    expect(totals.noPreviousClose).toEqual(['IPOX']);
    expect(holdings.find((h) => h.symbol === 'CHCL')).toBeUndefined();
    expect(priced.reduce((s, h) => s + Math.round(h.displayWeight! * 100), 0)).toBe(10_000);
  });
});

const order = (rows: readonly { symbol: string }[]) => rows.map((r) => r.symbol).join('');

describe('sortHoldings', () => {
  const { holdings } = holdingsSummary([
    position('B', [{ side: 'buy', quantity: 1n, price: 100n }], { sector: 'Hydro' }),
    position('a', [{ side: 'buy', quantity: 2n, price: 100n }]),
    position('C', [{ side: 'buy', quantity: 3n, price: 100n }], { sector: 'Banking' }),
    position('D', [{ side: 'buy', quantity: 1n, price: 100n }]),
  ], [quote('B', 150n, 100n), quote('a', 120n, 100n), quote('C', 90n, 100n)]);

  it('sorts text case-insensitively and figures numerically, with nulls last in both directions', () => {
    expect(order(sortHoldings(holdings, { key: 'symbol', dir: 'asc' }))).toBe('aBCD');
    expect(order(sortHoldings(holdings, { key: 'value', dir: 'desc' }))).toBe('CaBD');
    expect(order(sortHoldings(holdings, { key: 'value', dir: 'asc' }))).toBe('BaCD');
    expect(order(sortHoldings(holdings, { key: 'pnl', dir: 'asc' }))).toBe('CaBD');
    expect(order(sortHoldings(holdings, { key: 'sector', dir: 'asc' }))).toBe('CBaD');
  });

  it('is stable on ties and does not mutate', () => {
    const before = order(holdings);
    expect(order(sortHoldings(holdings, { key: 'quantity', dir: 'desc' }))).toBe('CaBD');
    expect(order(sortHoldings(holdings, { key: 'quantity', dir: 'asc' }))).toBe('BDaC');
    expect(order(holdings)).toBe(before);
  });

  it('nextHoldingSort starts text ascending and figures descending, and flips a repeat', () => {
    expect(nextHoldingSort(undefined, 'symbol')).toEqual({ key: 'symbol', dir: 'asc' });
    expect(nextHoldingSort(undefined, 'value')).toEqual({ key: 'value', dir: 'desc' });
    expect(nextHoldingSort({ key: 'value', dir: 'desc' }, 'value')).toEqual({ key: 'value', dir: 'asc' });
  });
});

describe('holdingsToCsv', () => {
  it('writes exact decimals, empty cells for missing values and a Total row', () => {
    const { holdings, totals } = holdingsSummary([
      position('AAA', [{ side: 'buy', quantity: 100n, price: 10_000n, fees: 500n }], { name: 'Alpha, Ltd', sector: 'Banking' }),
      position('=EVIL', [{ side: 'buy', quantity: 1n, price: 100n }]),
    ], [quote('AAA', 11_000n, 10_500n)]);
    const lines = holdingsToCsv(holdings, { totals, bom: false }).split('\r\n');
    expect(lines[0]).toBe('Symbol,Name,Sector,Quantity,Average cost,LTP,Cost,Market value,Unrealised P&L,Unrealised %,Day change,Day change %,Weight %');
    expect(lines[1]).toBe('AAA,"Alpha, Ltd",Banking,100,100.05,110.00,10005.00,11000.00,995.00,9.95,500.00,4.76,100.00');
    expect(lines[2]).toBe("'=EVIL,,,1,1.00,,1.00,,,,,,");
    expect(lines[3]).toBe('Total,,,,,,10006.00,11000.00,995.00,9.95,500.00,4.76,');
  });

  it('keeps negative amounts numeric and prefixes a byte order mark by default', () => {
    const { holdings } = holdingsSummary([position('AAA', [{ side: 'buy', quantity: 10n, price: 1_000n }])], [quote('AAA', 900n, 1_000n)]);
    const csv = holdingsToCsv(holdings);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain(',-10.00,-10.00,-10.00,');
  });
});

const row = (symbol: string, marketValue: bigint | null, sector?: string, quantity = 1n) => ({ symbol, marketValue, quantity, ...(sector ? { sector } : {}) });
const sum100 = (slices: readonly { displayPercent: number }[], decimals: number) => slices.reduce((s, x) => s + Math.round(x.displayPercent * 10 ** decimals), 0);

describe('allocateHoldings', () => {

  it('buckets everything past maxSlices - 1 into Other and the shares still add up to 100', () => {
    const rows = [row('A', 4_000n), row('B', 3_000n), row('C', 1_500n), row('D', 700n), row('E', 500n), row('F', 200n), row('G', 100n)];
    const { slices, total } = allocateHoldings(rows, { maxSlices: 4 });
    expect(slices.map((s) => s.label)).toEqual(['A', 'B', 'C', 'Other']);
    expect(slices[3]).toMatchObject({ key: 'other', value: 1_500n, count: 4, other: true });
    expect(total).toBe(10_000n);
    expect(slices.map((s) => s.displayPercent)).toEqual([40, 30, 15, 15]);
    expect(sum100(slices, 1)).toBe(1000);
  });

  it('uses largest remainder so awkward shares never read 99.9 or 100.1', () => {
    const { slices } = allocateHoldings([row('A', 1n), row('B', 1n), row('C', 1n)], { decimals: 1 });
    expect(slices.map((s) => s.displayPercent)).toEqual([33.4, 33.3, 33.3]);
    expect(sum100(slices, 1)).toBe(1000);
    const many = allocateHoldings(Array.from({ length: 11 }, (_, i) => row(`S${i}`, BigInt(7 + i * 13))), { maxSlices: 12, decimals: 2 });
    expect(sum100(many.slices, 2)).toBe(10_000);
  });

  it('draws no Other when the slices fit', () => {
    const { slices } = allocateHoldings([row('A', 2n), row('B', 1n)], { maxSlices: 2 });
    expect(slices.map((s) => s.other)).toEqual([false, false]);
  });

  it('groups by sector, with an Unclassified bucket, and orders ties by label', () => {
    const { slices } = allocateHoldings([row('A', 100n, 'Banking'), row('B', 100n, 'Banking'), row('C', 200n, 'Hydropower'), row('D', 50n), row('E', 50n, '  ')], { by: 'sector' });
    expect(slices.map((s) => [s.label, s.value, s.count])).toEqual([['Banking', 200n, 2], ['Hydropower', 200n, 1], ['Unclassified', 100n, 2]]);
  });

  it('leaves out unpriced and zero-value holdings, naming the open unpriced ones', () => {
    const { slices, unpriced, total } = allocateHoldings([row('A', 100n), row('B', null), row('Z', 0n), row('CLOSED', null, undefined, 0n)]);
    expect(slices.map((s) => s.label)).toEqual(['A']);
    expect(unpriced).toEqual(['B']);
    expect(total).toBe(100n);
  });

  it('returns no slices for an empty or all-zero portfolio, and rejects a bad maxSlices', () => {
    expect(allocateHoldings([]).slices).toEqual([]);
    expect(allocateHoldings([row('Z', 0n)]).slices).toEqual([]);
    expect(() => allocateHoldings([], { maxSlices: 1 })).toThrow(RangeError);
    expect(() => allocateHoldings([], { maxSlices: 2.5 })).toThrow(RangeError);
  });

  it('keeps exact bigint values beyond 2^53', () => {
    const big = 2n ** 70n;
    const { slices, total } = allocateHoldings([row('A', big), row('B', big + 1n)]);
    expect(total).toBe(2n * big + 1n);
    expect(slices[0]).toMatchObject({ label: 'B', value: big + 1n });
  });
});

const t = (over: Partial<PortfolioTransaction> & Pick<PortfolioTransaction, 'id' | 'date' | 'type'>): PortfolioTransaction => ({ symbol: 'AAA', ...over });

describe('transactionLedger', () => {
  const history: PortfolioTransaction[] = [
    t({ id: 'b1', date: '2024-01-10', type: 'buy', quantity: 100n, price: 10_000n, fees: 500n }),
    t({ id: 'b2', date: '2024-02-10', type: 'buy', quantity: 100n, price: 12_000n }),
    t({ id: 's1', date: '2024-03-10', type: 'sell', quantity: 50n, price: 13_000n, fees: 300n }),
    t({ id: 's2', date: '2024-04-10', type: 'sell', quantity: 150n, price: 9_000n, fees: 400n }),
  ];

  it('gives each sale its own realised P&L (average cost) and the value and cash flow of every row', () => {
    const rows = transactionLedger(history);
    expect(rows.map((r) => r.id)).toEqual(['b1', 'b2', 's1', 's2']);
    expect(rows[0]).toMatchObject({ value: 1_000_000n, cashFlow: -1_000_500n, realisedPnL: null });
    expect(rows[1]).toMatchObject({ value: 1_200_000n, cashFlow: -1_200_000n });
    // Pool: 200 units cost 2,200,500. Selling 50 removes 550,125; proceeds 650,000 - 300.
    expect(rows[2]).toMatchObject({ value: 650_000n, cashFlow: 649_700n, realisedPnL: 649_700n - 550_125n });
    // Remaining 150 units cost 1,650,375; proceeds 1,350,000 - 400.
    expect(rows[3]!.realisedPnL).toBe(1_349_600n - 1_650_375n);
    expect(rows[2]!.realisedPnL! + rows[3]!.realisedPnL!).toBe(649_700n - 550_125n + 1_349_600n - 1_650_375n);
  });

  it('matches the position totals: per-sale results add up to computePosition realised P&L', () => {
    const rows = transactionLedger(portfolioTransactions);
    const sales = rows.filter((r) => r.type === 'sell');
    expect(sales.length).toBe(4);
    const summary = holdingsSummary(positionsFromTransactions(portfolioTransactions), portfolioQuotes, { includeClosed: true });
    expect(sales.reduce((s, r) => s + r.realisedPnL!, 0n)).toBe(summary.totals.realisedPnL);
    expect(rows.find((r) => r.id === 't12')!.realisedPnL).toBe(61_230n * 100n - 43_015n - (69_000n * 100n + 36_875n));
  });

  it('supports fifo and treats bonus as free units and rights as a purchase', () => {
    const fifo = transactionLedger(history, { method: 'fifo' });
    expect(fifo[2]!.realisedPnL).toBe(649_700n - (1_000_500n / 2n));
    const rows = transactionLedger([
      t({ id: 'bo', date: '2024-01-01', type: 'bonus', quantity: 10n }),
      t({ id: 'ri', date: '2024-01-02', type: 'rights', quantity: 10n, price: 10_000n, fees: 25n }),
      t({ id: 'dv', date: '2024-01-03', type: 'dividend', amount: 5_000n }),
    ]);
    expect(rows.map((r) => [r.value, r.cashFlow, r.realisedPnL])).toEqual([[0n, 0n, null], [100_000n, -100_025n, null], [5_000n, 5_000n, null]]);
  });

  it('sorts by date, keeps input order for the same day, and accepts a sale after a same-day buy', () => {
    const rows = transactionLedger([
      t({ id: 'late', date: '2024-05-01', type: 'buy', quantity: 1n, price: 1n }),
      t({ id: 'sell', date: '2024-01-02', type: 'sell', quantity: 5n, price: 200n }),
      t({ id: 'buy', date: '2024-01-02', type: 'buy', quantity: 5n, price: 100n }),
    ].toReversed());
    expect(rows.map((r) => r.id)).toEqual(['buy', 'sell', 'late']);
    expect(rows[1]!.realisedPnL).toBe(500n);
  });

  it('tracks symbols separately', () => {
    const rows = transactionLedger([
      t({ id: 'a', date: '2024-01-01', type: 'buy', quantity: 10n, price: 100n }),
      t({ id: 'b', date: '2024-01-02', type: 'buy', symbol: 'BBB', quantity: 10n, price: 500n }),
      t({ id: 'c', date: '2024-01-03', type: 'sell', quantity: 10n, price: 150n }),
      t({ id: 'd', date: '2024-01-04', type: 'sell', symbol: 'BBB', quantity: 10n, price: 400n }),
    ]);
    expect(rows.map((r) => r.realisedPnL)).toEqual([null, null, 500n, -1_000n]);
  });

  it('rejects duplicate ids, bad dates, invalid quantities, a missing dividend amount and overselling', () => {
    const ok = t({ id: 'a', date: '2024-01-01', type: 'buy', quantity: 1n, price: 1n });
    expect(() => transactionLedger([ok, ok])).toThrow(/Duplicate transaction id/);
    expect(() => transactionLedger([{ ...ok, date: '2024-02-30' }])).toThrow(/date/);
    expect(() => transactionLedger([{ ...ok, date: '14/11/2025' }])).toThrow(/date/);
    expect(() => transactionLedger([{ ...ok, quantity: 0n }])).toThrow(/quantity/);
    expect(() => transactionLedger([{ ...ok, price: undefined }])).toThrow(/price/);
    expect(() => transactionLedger([{ ...ok, fees: -1n }])).toThrow(/fees/);
    expect(() => transactionLedger([t({ id: 'd', date: '2024-01-01', type: 'dividend' })])).toThrow(/amount/);
    expect(() => transactionLedger([{ ...ok, type: 'swap' as 'buy' }])).toThrow(TypeError);
    expect(() => transactionLedger([ok, t({ id: 's', date: '2024-01-02', type: 'sell', quantity: 2n, price: 1n })])).toThrow(RangeError);
  });

  it('a fully sold symbol has zero holdings after its last sale', () => {
    const positions = positionsFromTransactions(portfolioTransactions);
    expect(positions.find((p) => p.symbol === 'CHCL')!.trades).toHaveLength(2);
    expect(holdingsSummary(positions, portfolioQuotes).holdings.some((h) => h.symbol === 'CHCL')).toBe(false);
    expect(positions.find((p) => p.symbol === 'NICA')).toMatchObject({ name: 'NIC Asia Bank Limited', sector: 'Banking' });
  });
});

describe('filterTransactions', () => {
  const rows = transactionLedger(portfolioTransactions);
  it('filters by type, symbol (case-insensitive) and inclusive date range, keeping order', () => {
    expect(filterTransactions(rows, { types: ['dividend'] }).map((r) => r.id)).toEqual(['t08', 't17', 't18', 't23', 't24', 't26']);
    expect(filterTransactions(rows, { symbol: 'nabil' }).map((r) => r.id)).toEqual(['t01', 't06', 't09', 't16', 't17', 't23']);
    expect(filterTransactions(rows, { range: { start: '2024-08-05', end: '2024-09-01' } }).map((r) => r.id)).toEqual(['t16', 't17']);
    expect(filterTransactions(rows, { types: ['sell', 'buy'], symbol: 'NICA', range: { start: '2025-01-01', end: '2025-12-31' } }).map((r) => r.id)).toEqual(['t22']);
  });
  it('ignores empty filters and a range with no end', () => {
    expect(filterTransactions(rows, {})).toHaveLength(rows.length);
    expect(filterTransactions(rows, { types: [], symbol: '  ', range: { start: '2025-01-01', end: null } })).toHaveLength(rows.length);
    expect(filterTransactions(rows, { symbol: 'NOPE' })).toEqual([]);
  });
  it('a filter does not change a sale\'s realised P&L', () => {
    const only = filterTransactions(rows, { types: ['sell'], symbol: 'GBIME' });
    expect(only[0]!.realisedPnL).toBe(rows.find((r) => r.id === 't27')!.realisedPnL);
  });
});

const entry = (id: string, date: string, kind: DividendEntry['kind'], amount: bigint): DividendEntry => ({ id, date, symbol: 'AAA', kind, amount });

describe('dividendsByFiscalYear', () => {

  it('groups by Nepal fiscal year using the BS date (1 Shrawan start), oldest first', () => {
    const years = dividendsByFiscalYear([
      entry('c', '2025-07-17', 'cash', 100n), // 1 Shrawan 2082: FY 2082/83
      entry('b', '2025-07-16', 'cash', 40n), // 32 Ashadh 2082: FY 2081/82
      entry('a', '2024-09-01', 'bonus', 60n),
      entry('d', '2025-08-01', 'rights', 7n),
    ]);
    expect(years.map((y) => y.label)).toEqual(['2081/82', '2082/83']);
    expect(years[0]).toMatchObject({ cash: 40n, bonus: 60n, rights: 0n, total: 100n, count: 2 });
    expect(years[1]).toMatchObject({ cash: 100n, rights: 7n, total: 107n, count: 2 });
  });

  it('computes cash yield on value and on cost, null without a positive base', () => {
    const entries = [entry('a', '2024-09-01', 'cash', 1_500n), entry('b', '2024-09-02', 'bonus', 9_000n)];
    const [year] = dividendsByFiscalYear(entries, { marketValue: 30_000n, costBasis: 20_000n });
    expect(year!.yieldOnValue).toBeCloseTo(5, 10);
    expect(year!.yieldOnCost).toBeCloseTo(7.5, 10);
    const [none] = dividendsByFiscalYear(entries, { marketValue: null, costBasis: 0n });
    expect(none!.yieldOnValue).toBeNull();
    expect(none!.yieldOnCost).toBeNull();
    expect(dividendsByFiscalYear(entries)[0]!.yieldOnValue).toBeNull();
  });

  it('accepts a label function and rejects bad records', () => {
    expect(dividendsByFiscalYear([entry('a', '2024-09-01', 'cash', 1n)], { fiscalLabel: (y) => `FY ${y.startYear}` })[0]!.label).toBe('FY 2081');
    expect(() => dividendsByFiscalYear([entry('a', '2024-09-01', 'cash', 1n), entry('a', '2024-09-01', 'cash', 1n)])).toThrow(/Duplicate/);
    expect(() => dividendsByFiscalYear([entry('a', 'soon', 'cash', 1n)])).toThrow(/date/);
    expect(() => dividendsByFiscalYear([entry('a', '2024-09-01', 'cash', -1n)])).toThrow(/amount/);
    expect(dividendsByFiscalYear([])).toEqual([]);
  });

  it('derives entries from the history: cash, bonus at par and rights subscribed', () => {
    const entries = dividendEntriesFromTransactions(portfolioTransactions);
    expect(entries.filter((e) => e.kind === 'cash').reduce((s, e) => s + e.amount, 0n)).toBe(8_197_500n);
    expect(entries.find((e) => e.id === 't09')).toMatchObject({ kind: 'bonus', amount: 12n * 10_000n });
    expect(entries.find((e) => e.id === 't14')).toMatchObject({ kind: 'rights', amount: 50n * 10_000n });
    expect(entries.some((e) => e.id === 't01')).toBe(false);
    const years = dividendsByFiscalYear(entries);
    expect(years.map((y) => y.label)).toEqual(['2080/81', '2081/82', '2082/83']);
    expect(years.reduce((s, y) => s + y.total, 0n)).toBe(entries.reduce((s, e) => s + e.amount, 0n));
  });
});
