import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinancialTable } from '../src/financial/financial.tsx';
import { money } from '../src/money/money.ts';
import { footerTotals, groupRows, reconcile, reconcileTotals, sortRows } from '../src/table-core/tableCore.ts';
import {
  agingColumns, formatBps, holdingsColumns, ledgerColumns, statementColumns, stockQuoteColumns, toFinancialColumns, trialBalanceColumns,
  type AgingLine, type HoldingRow, type LedgerRow, type StockQuoteRow, type TrialBalanceRow,
} from '../src/table-presets/tablePresets.ts';

const npr = (minor: bigint) => money(minor, 'NPR');

describe('formatBps', () => {
  it('prints basis points exactly, with the sign', () => {
    expect(formatBps(1234n)).toBe('12.34%');
    expect(formatBps(-5n)).toBe('-0.05%');
    expect(formatBps(0n)).toBe('0.00%');
    expect(formatBps(123_456_789_012_345_678n)).toBe('1,234,567,890,123,456.78%');
  });
});

describe('holdingsColumns', () => {
  const rows: HoldingRow[] = [
    { symbol: 'NABIL', quantity: 10n, averageCost: npr(1_000_00n), price: npr(1_200_00n), value: npr(12_000_00n), gain: npr(2_000_00n), gainBps: 2000n },
    { symbol: 'NICA', quantity: 5n, averageCost: npr(900_00n), price: npr(800_00n), value: npr(4_000_00n), gain: npr(-500_00n), gainBps: -1111n },
  ];
  const cols = holdingsColumns();
  it('formats exact money and totals value and gain as bigint', () => {
    const value = cols.find((c) => c.id === 'value')!;
    expect(value.cell!(rows[0]!).replace(/\u00a0/g, " ")).toBe('NPR 12,000.00');
    const totals = footerTotals(rows, cols);
    expect(totals.value).toEqual({ minor: 16_000_00n, currency: 'NPR' });
    expect(totals.gain).toEqual({ minor: 1_500_00n, currency: 'NPR' });
    expect(totals.price).toBeUndefined();
    expect(cols.find((c) => c.id === 'gainBps')!.cell!(rows[1]!)).toBe('-11.11%');
  });
  it('overrides labels and keeps the others', () => {
    const ne = holdingsColumns({ labels: { value: 'मूल्य' } });
    expect(ne.find((c) => c.id === 'value')!.header).toBe('मूल्य');
    expect(ne.find((c) => c.id === 'symbol')!.header).toBe('Symbol');
  });
  it('sorts money by exact minor units', () => {
    expect(sortRows(rows, cols, [{ key: 'gain', dir: 'asc' }]).map((r) => r.symbol)).toEqual(['NICA', 'NABIL']);
  });
  it('refuses to total two currencies', () => {
    const mixed = [...rows, { ...rows[0]!, value: money(1n, 'USD') }];
    expect(() => footerTotals(mixed, cols)).toThrow(/Cannot combine/);
  });
  it('draws in a FinancialTable', () => {
    render(<FinancialTable caption="Holdings" columns={toFinancialColumns(cols)} rows={rows} rowKey={(r) => r.symbol} emptyTitle="None" totals />);
    expect(screen.getByRole('columnheader', { name: 'Gain or loss' })).toBeTruthy();
    expect(screen.getAllByText('NPR 16,000.00').length).toBeGreaterThan(0);
  });
});

describe('stockQuoteColumns', () => {
  const rows: StockQuoteRow[] = [{ symbol: 'NABIL', last: npr(1_234_50n), change: npr(-12_00n), changeBps: -96n, volume: 12_345n }];
  it('formats price, change, percent and volume; nothing totals', () => {
    const cols = stockQuoteColumns({ locale: 'en-IN' });
    const cell = (id: string) => cols.find((c) => c.id === id)!.cell!(rows[0]!);
    expect(cell("last").replace(/\u00a0/g, " ")).toBe('NPR 1,234.50');
    expect(cell("change").replace(/\u00a0/g, " ")).toBe('-NPR 12.00');
    expect(cell('changeBps')).toBe('-0.96%');
    expect(cell('volume')).toBe('12,345');
    expect(cell('high')).toBe('');
    expect(cols.some((c) => c.aggregate)).toBe(false);
  });
});

describe('ledgerColumns and statementColumns', () => {
  const entries: LedgerRow[] = [
    { date: '2083-01-05', description: 'Sales', debit: npr(500_00n), balance: npr(500_00n) },
    { date: new Date('2026-04-18T00:00:00Z'), description: 'Rent', credit: npr(200_25n), balance: npr(299_75n) },
  ];
  it('totals debits and credits and prints dates', () => {
    const cols = ledgerColumns();
    const totals = footerTotals(entries, cols);
    expect(totals.debit).toEqual({ minor: 500_00n, currency: 'NPR' });
    expect(totals.credit).toEqual({ minor: 200_25n, currency: 'NPR' });
    expect(cols[0]!.cell!(entries[1]!)).toBe('2026-04-18');
    expect(cols[0]!.cell!(entries[0]!)).toBe('2083-01-05');
    expect(totals.balance).toBeUndefined();
  });
  it('statement totals reconcile against the printed statement', () => {
    const lines = [
      { date: '2026-01-01', description: 'Deposit', moneyIn: npr(1_000_00n), balance: npr(1_000_00n) },
      { date: '2026-01-02', description: 'Fee', moneyOut: npr(5_50n), balance: npr(994_50n) },
    ];
    const totals = footerTotals(lines, statementColumns({ labels: { moneyOut: 'Withdrawals' } }));
    expect(reconcileTotals(totals, { moneyIn: npr(1_000_00n), moneyOut: npr(5_50n) }).moneyOut!.status).toBe('ok');
    expect(reconcile(npr(6_00n), totals.moneyOut as ReturnType<typeof npr>).difference.minor).toBe(-50n);
    expect(statementColumns({ labels: { moneyOut: 'Withdrawals' } }).find((c) => c.id === 'moneyOut')!.header).toBe('Withdrawals');
  });
});

describe('agingColumns and trialBalanceColumns', () => {
  const aging: AgingLine[] = [
    { party: 'A', current: npr(100_00n), days1to30: npr(50_00n), days31to60: npr(0n), days61to90: npr(0n), over90: npr(25_00n), total: npr(175_00n) },
    { party: 'B', current: npr(10_00n), days1to30: npr(0n), days31to60: npr(5_00n), days61to90: npr(0n), over90: npr(0n), total: npr(15_00n) },
  ];
  it('sums every bucket and the buckets add up to the total', () => {
    const cols = agingColumns();
    const t = footerTotals(aging, cols);
    const buckets = ['current', 'days1to30', 'days31to60', 'days61to90', 'over90'].reduce((acc, id) => acc + (t[id] as ReturnType<typeof npr>).minor, 0n);
    expect(buckets).toBe((t.total as ReturnType<typeof npr>).minor);
    expect(groupRows(aging, (r) => r.party, cols)).toHaveLength(2);
  });
  it('a trial balance reconciles debits to credits', () => {
    const tb: TrialBalanceRow[] = [
      { code: '1000', account: 'Cash', debit: npr(300_00n) },
      { code: '2000', account: 'Payables', credit: npr(100_00n) },
      { code: '3000', account: 'Equity', credit: npr(200_00n) },
    ];
    const t = footerTotals(tb, trialBalanceColumns());
    expect(reconcile(t.debit as ReturnType<typeof npr>, t.credit as ReturnType<typeof npr>).status).toBe('ok');
  });
});

describe('toFinancialColumns', () => {
  it('maps ids, labels, alignment and the responsive fold', () => {
    const [symbol, name, , , , value] = toFinancialColumns(holdingsColumns());
    expect(symbol).toMatchObject({ key: 'symbol', label: 'Symbol', rowHeader: true });
    expect(name).toMatchObject({ wide: true });
    expect(value).toMatchObject({ key: 'value', kind: 'money', aggregate: 'sum' });
  });
});
