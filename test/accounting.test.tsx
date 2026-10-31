import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DebitCredit, FinancialPeriodSelector, JournalEntryView, LedgerTable, PaymentStatus, StatementTable, TrialBalance, rollUp,
  nepalFiscalMonthPeriods, nepalFiscalQuarterPeriods, nepalFiscalYearPeriods, type FinancialPeriod, type PaymentStatusValue,
} from '../src/index.ts';
import { seriousViolations } from './axe.ts';
import { cashEntries, depositJournal, incomeStatement, journals, periods, saleJournal, unbalancedJournal } from './accounting-fixtures.ts';

const flat = (s: string | null | undefined) => (s ?? '').replace(/[  ]/g, ' ');
const visible = (el: Element) => flat([...el.querySelectorAll('[aria-hidden="true"]')].map(n => n.textContent).join('') || el.textContent);

describe('DebitCredit', () => {
  it('prints the magnitude with the side in letters and words', async () => {
    const { container } = render(<><DebitCredit value={1250050n} testId="dr" /><DebitCredit value={-300000n} testId="cr" /><DebitCredit value={0n} testId="z" /></>);
    expect(flat(screen.getByTestId('dr').textContent)).toBe('12,500.50Drdebit');
    expect(flat(screen.getByTestId('cr').textContent)).toBe('3,000.00Crcredit');
    expect(screen.getByTestId('z').textContent).toBe('0.00');
    expect(screen.getByTestId('cr').dataset.side).toBe('credit');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('signed variant puts credits in accounting parentheses, or a minus without', () => {
    const { rerender } = render(<DebitCredit value={-1000n} variant="signed" testId="a" />);
    expect(flat(screen.getByTestId('a').textContent)).toContain('(10.00)');
    rerender(<DebitCredit value={-1000n} variant="signed" accounting={false} testId="a" />);
    expect(flat(screen.getByTestId('a').textContent)).toContain('-10.00');
  });

  it('column variant shows the amount only under its own column and customises words', () => {
    render(<><DebitCredit value={500n} variant="column" column="debit" testId="d1" /><DebitCredit value={500n} variant="column" column="credit" testId="c1" /><DebitCredit value={-500n} variant="column" column="credit" testId="c2" /></>);
    expect(screen.getByTestId('d1').textContent).toBe('5.00');
    expect(screen.getByTestId('c1').textContent).toBe('');
    expect(screen.getByTestId('c2').textContent).toBe('5.00');
    render(<DebitCredit value={500n} labels={{ debit: 'ना', debitSpoken: 'debit side' }} testId="n" />);
    expect(flat(screen.getByTestId('n').textContent)).toBe('5.00नाdebit side');
  });

  it('a missing value is a dash with a spoken "No value"', () => {
    render(<DebitCredit value={null} testId="m" />);
    expect(screen.getByTestId('m').textContent).toBe('—No value');
  });

  it('works in another currency with a symbol', () => {
    render(<DebitCredit value={123456n} currency="USD" locale="en-US" testId="u" />);
    expect(flat(screen.getByTestId('u').textContent)).toContain('$1,234.56');
  });
});

describe('LedgerTable', () => {
  it('lists entries with opening, total, closing and a running balance', async () => {
    const { container } = render(<LedgerTable caption="Cash ledger, Shrawan 2081" entries={cashEntries} normal="debit" opening={2500000n} testId="gl" />);
    const opening = screen.getByTestId('gl-opening');
    expect(opening.textContent).toContain('Opening balance');
    expect(flat(opening.textContent)).toContain('25,000.00Dr');
    // 25,000 + 113,000 - 45,200 + 78,000.50 - 100,000 = 70,800.50
    expect(flat(screen.getByTestId('gl-row-c1').textContent)).toContain('1,38,000.00');
    expect(flat(screen.getByTestId('gl-row-c4').textContent)).toContain('70,800.50Dr');
    expect(flat(screen.getByTestId('gl-total').textContent)).toContain('1,91,000.50');
    expect(flat(screen.getByTestId('gl-total').textContent)).toContain('1,45,200.00');
    expect(flat(screen.getByTestId('gl-closing-balance').textContent)).toContain('70,800.50Dr');
    expect(screen.getByRole('table', { name: 'Cash ledger, Shrawan 2081' })).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('shows an overdrawn debit account as a credit balance and flips for credit-normal accounts', () => {
    render(<LedgerTable caption="x" entries={[{ id: '1', date: { year: 2024, month: 8, day: 2 }, account: 'Cash', debit: 0n, credit: 500n }]} normal="debit" testId="a" />);
    expect(flat(screen.getByTestId('a-closing-balance').textContent)).toBe('5.00Crcredit');
    render(<LedgerTable caption="y" entries={[{ id: '1', date: { year: 2024, month: 8, day: 2 }, account: 'Sales', debit: 0n, credit: 500n }]} normal="credit" testId="b" />);
    expect(flat(screen.getByTestId('b-closing-balance').textContent)).toBe('5.00Crcredit');
  });

  it('formats dates through the caller (BS) and hides the reference column on request', () => {
    render(<LedgerTable caption="x" entries={cashEntries.slice(0, 1)} normal="debit" formatDate={() => '18 Shrawan 2081'} showReference={false} testId="a" />);
    expect(screen.getByTestId('a-row-c1').textContent).toContain('18 Shrawan 2081');
    expect(screen.queryByText('SI-0101')).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Ref' })).toBeNull();
  });

  it('has an empty state, a loading state that keeps the head, and an error with retry', async () => {
    const { rerender } = render(<LedgerTable caption="x" entries={[]} normal="debit" testId="a" />);
    expect(screen.getByText('No entries in this period.')).toBeTruthy();
    rerender(<LedgerTable caption="x" entries={[]} normal="debit" state="loading" testId="a" />);
    expect(screen.getByRole('status').textContent).toBe('Loading entries…');
    expect(screen.getByRole('columnheader', { name: 'Debit' })).toBeTruthy();
    const retry = vi.fn<() => void>();
    rerender(<LedgerTable caption="x" entries={[]} normal="debit" state="error" onRetry={retry} testId="a" />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows an opening balance alone, and refuses invalid amounts instead of printing a balance', () => {
    const { rerender } = render(<LedgerTable caption="x" entries={[]} normal="debit" opening={100n} testId="a" />);
    expect(screen.getByTestId('a-opening')).toBeTruthy();
    expect(screen.getByTestId('a-closing')).toBeTruthy();
    rerender(<LedgerTable caption="x" entries={[{ id: '1', date: { year: 2024, month: 8, day: 2 }, account: 'Cash', debit: -5n, credit: 0n }]} normal="debit" testId="a" />);
    expect(screen.getByRole('alert').textContent).toContain('no balance is shown');
    expect(screen.queryByTestId('a-closing')).toBeNull();
  });

  it('sets a scroll height on the region for a sticky head', () => {
    const { container } = render(<LedgerTable caption="x" entries={cashEntries} normal="debit" maxHeight={240} />);
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--ledger-max-h')).toBe('240px');
  });
});

describe('JournalEntryView', () => {
  it('shows lines, totals and a balanced status', async () => {
    const { container } = render(<JournalEntryView journal={saleJournal} testId="j" />);
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('JV-2081-0101 · Cash sale with VAT, Thamel counter');
    expect(flat(screen.getByTestId('j-total-debit').textContent)).toBe('1,13,000.00');
    expect(flat(screen.getByTestId('j-total-credit').textContent)).toBe('1,13,000.00');
    expect(screen.getByTestId('j-status').textContent).toContain('Balanced');
    expect(screen.getByRole('table')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('says "Out of balance by X" in words and which side is larger', async () => {
    const { container } = render(<JournalEntryView journal={unbalancedJournal} testId="j" />);
    const status = screen.getByTestId('j-status');
    expect(status.getAttribute('role')).toBe('status');
    expect(flat(status.textContent)).toContain('Out of balance by');
    expect(flat(status.textContent)).toContain('5.00');
    expect(flat(status.textContent)).toContain('debits exceed credits');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('reports credits exceeding debits, supports renderAccount and heading level', () => {
    render(<JournalEntryView journal={{ ...depositJournal, lines: [depositJournal.lines[0]!, { account: 'Cash', debit: 0n, credit: 10000100n }] }} headingLevel={2} renderAccount={a => <a href={`#${a}`}>{a}</a>} testId="j" />);
    expect(screen.getByTestId('j-status').textContent).toContain('credits exceed debits');
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'NIC Asia Bank' })).toBeTruthy();
  });

  it('refuses a journal with an invalid line', () => {
    render(<JournalEntryView journal={{ id: 'x', date: { year: 2024, month: 8, day: 1 }, lines: [{ account: 'Cash', debit: 5n, credit: 5n }] }} />);
    expect(screen.getByRole('alert').textContent).toContain('cannot be totalled');
  });

  it('handles a journal with no lines', () => {
    render(<JournalEntryView journal={{ id: 'x', date: { year: 2024, month: 8, day: 1 }, lines: [] }} />);
    expect(screen.getByText('This journal has no lines.')).toBeTruthy();
  });
});

describe('TrialBalance', () => {
  it('builds net balances from journals with a totals row and balanced status', async () => {
    const { container } = render(<TrialBalance caption="Trial balance, Shrawan 2081" data={journals} testId="tb" />);
    // Cash: +113,000 -45,200 -100,000 = -32,200 (credit).
    expect(flat(screen.getByTestId('tb-row-Cash').textContent)).toContain('32,200.00');
    expect(flat(screen.getByTestId('tb-row-NIC Asia Bank').textContent)).toContain('1,00,000.00');
    expect(flat(screen.getByTestId('tb-total-debit').textContent)).toBe('1,40,000.00');
    expect(flat(screen.getByTestId('tb-total-credit').textContent)).toBe('1,40,000.00');
    expect(screen.getByTestId('tb-status').textContent).toContain('Balanced');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('totals basis shows gross postings per account', () => {
    render(<TrialBalance caption="x" data={journals} basis="totals" testId="tb" />);
    const row = within(screen.getByTestId('tb-row-Cash')).getAllByRole('cell').map(c => flat(c.textContent));
    expect(row).toEqual(['1,13,000.00', '1,45,200.00']);
  });

  it('flags an out-of-balance book with text and an alert-free status role', () => {
    render(<TrialBalance caption="x" data={[...journals, unbalancedJournal]} testId="tb" />);
    expect(flat(screen.getByTestId('tb-status').textContent)).toContain('Out of balance by');
    expect(screen.getByTestId('tb-status').dataset.balanced).toBe('false');
  });

  it('accepts ledger entries, and states: empty, loading, error, invalid', () => {
    const { rerender } = render(<TrialBalance caption="x" data={cashEntries} testId="tb" />);
    expect(screen.getByTestId('tb-row-Cash')).toBeTruthy();
    rerender(<TrialBalance caption="x" data={[]} testId="tb" />);
    expect(screen.getByText('No accounts to show.')).toBeTruthy();
    rerender(<TrialBalance caption="x" data={[]} state="loading" testId="tb" />);
    expect(screen.getByRole('status').textContent).toBe('Loading trial balance…');
    rerender(<TrialBalance caption="x" data={[]} state="error" testId="tb" />);
    expect(screen.getByRole('alert').textContent).toContain('could not be loaded');
    rerender(<TrialBalance caption="x" data={[{ id: '1', date: { year: 2024, month: 8, day: 1 }, account: 'A', debit: -1n, credit: 0n }]} testId="tb" />);
    expect(screen.getByRole('alert').textContent).toContain('no trial balance is shown');
  });
});

describe('StatementTable', () => {
  const rows = rollUp(incomeStatement);
  const base = { caption: 'Income statement', periods, testId: 'st' } as const;

  it('draws given values, indents by depth, and marks subtotals and the grand total', async () => {
    const { container } = render(<StatementTable {...base} rows={rows} />);
    expect(flat(screen.getByTestId('st-row-sales').textContent)).toContain('96,12,500.00');
    // income 8,420,000+12,500 = 8,432,500.00 ; expenses 5,310,000+1,200,000+300,000+4,800 = 6,814,800.00 ; profit 1,617,700.00
    expect(flat(screen.getByTestId('st-subtotal-income').textContent)).toContain('84,32,500.00');
    expect(flat(screen.getByTestId('st-subtotal-expenses').textContent)).toContain('68,14,800.00');
    expect(flat(screen.getByTestId('st-subtotal-profit').textContent)).toContain('16,17,700.00');
    expect(screen.getByTestId('st-subtotal-profit').querySelector('.grand')).toBeTruthy();
    expect((screen.getByTestId('st-row-sales').querySelector('th') as HTMLElement).style.getPropertyValue('--depth')).toBe('2');
    expect(screen.getAllByRole('columnheader').map(h => h.textContent)).toEqual(['Item', 'FY 2080/81', 'FY 2081/82']);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('a missing value is a dash with "No value", never zero', () => {
    render(<StatementTable {...base} rows={rows} />);
    const cells = within(screen.getByTestId('st-row-bank')).getAllByRole('cell');
    expect(cells[1]!.textContent).toBe('—No value');
  });

  it('adds absolute and percent variance columns', () => {
    render(<StatementTable {...base} rows={rows} variance={{ from: '2080/81', to: '2081/82' }} />);
    expect(screen.getAllByRole('columnheader').map(h => h.textContent)).toEqual(['Item', 'FY 2080/81', 'FY 2081/82', 'Change', 'Change %']);
    const cells = within(screen.getByTestId('st-row-sales')).getAllByRole('cell').map(c => flat(c.textContent));
    expect(cells[2]).toContain('+11,92,500.00');
    expect(cells[3]).toContain('+14.2%');
    // No variance when one side is missing.
    const bank = within(screen.getByTestId('st-row-bank')).getAllByRole('cell');
    expect(bank[2]!.textContent).toBe('—No value');
    expect(bank[3]!.textContent).toBe('—No value');
  });

  it('presents negatives in parentheses by default or with a minus', () => {
    const negative: typeof incomeStatement = [{ kind: 'line', id: 'loss', label: 'Loss', values: { '2080/81': -150000n, '2081/82': 0n } }];
    const { rerender } = render(<StatementTable {...base} rows={negative} />);
    expect(visible(screen.getByTestId('st-row-loss').querySelectorAll('td')[0]!)).toBe('(1,500.00)');
    rerender(<StatementTable {...base} rows={negative} negative="minus" />);
    expect(visible(screen.getByTestId('st-row-loss').querySelectorAll('td')[0]!)).toBe('-1,500.00');
  });

  describe('subtotal honesty', () => {
    afterEach(() => vi.restoreAllMocks());

    it('never adds a subtotal for you: a missing one is a dash', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      render(<StatementTable {...base} rows={incomeStatement} />);
      expect(within(screen.getByTestId('st-subtotal-income')).getAllByRole('cell')[0]!.textContent).toBe('—No value');
      expect(spy).toHaveBeenCalled();
    });

    it('warns in development when a provided subtotal disagrees, and still shows what was given', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const wrong: typeof incomeStatement = [{ kind: 'section', id: 's', label: 'S', subtotal: { label: 'Total', values: { '2080/81': 999n, '2081/82': 300n } }, rows: [
        { kind: 'line', id: 'l1', label: 'L1', values: { '2080/81': 100n, '2081/82': 100n } },
        { kind: 'line', id: 'l2', label: 'L2', values: { '2080/81': 200n, '2081/82': 200n } },
      ] }];
      render(<StatementTable {...base} rows={wrong} />);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(String(spy.mock.calls[0]![0])).toContain('1 subtotal value(s) disagree');
      expect(String(spy.mock.calls[0]![0])).not.toContain('999');
      expect(flat(screen.getByTestId('st-subtotal-s').textContent)).toContain('9.99');
    });

    it('stays quiet when the subtotals agree', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      render(<StatementTable {...base} rows={rows} />);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  it('has empty, loading and error states', () => {
    const { rerender } = render(<StatementTable {...base} rows={[]} />);
    expect(screen.getByText('No statement lines to show.')).toBeTruthy();
    rerender(<StatementTable {...base} rows={rows} state="loading" />);
    expect(screen.getByRole('status').textContent).toBe('Loading statement…');
    rerender(<StatementTable {...base} rows={rows} state="error" />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

describe('PaymentStatus', () => {
  const all: PaymentStatusValue[] = ['paid', 'partial', 'unpaid', 'overdue', 'void'];

  it('every status has words and its own icon shape, so colour is never the only signal', async () => {
    const { container } = render(<>{all.map(status => <PaymentStatus key={status} status={status} testId={status} />)}</>);
    expect(all.map(s => screen.getByTestId(s).textContent)).toEqual(['Paid', 'Partly paid', 'Unpaid', 'Overdue', 'Void']);
    const shapes = all.map(s => screen.getByTestId(s).querySelector('svg')!.innerHTML);
    expect(new Set(shapes).size).toBe(5);
    for (const s of all) expect(screen.getByTestId(s).querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('accepts translated words', () => {
    render(<PaymentStatus status="overdue" labels={{ overdue: 'म्याद नाघेको' }} testId="p" />);
    expect(screen.getByTestId('p').textContent).toBe('म्याद नाघेको');
  });
});

function Harness({ list, initial }: { list: readonly FinancialPeriod[]; initial: string }) {
  const [value, setValue] = useState(initial);
  return <><FinancialPeriodSelector periods={list} value={value} onChange={setValue} label="Reporting period" kindLabels={{ year: 'Year', quarter: 'Quarter', month: 'Month' }} testId="ps" /><output data-testid="out">{value}</output></>;
}

describe('FinancialPeriodSelector', () => {
  const years = nepalFiscalYearPeriods(2079, 2081);
  const mixed: FinancialPeriod[] = [...years, ...nepalFiscalQuarterPeriods(2081), ...nepalFiscalMonthPeriods(2081)];

  it('builds Nepal fiscal years from the existing helper with BS and AD detail', () => {
    expect(years.map(p => p.label)).toEqual(['FY 2079/80', 'FY 2080/81', 'FY 2081/82']);
    expect(years[2]!.detail).toBe('1 Shrawan 2081 – 32 Ashadh 2082 BS · 16 Jul 2024 – 16 Jul 2025');
    expect(years[2]!.start).toEqual({ year: 2024, month: 7, day: 16 });
  });

  it('derives months and quarters from the year\'s own month starts', () => {
    const months = nepalFiscalMonthPeriods(2081);
    expect(months).toHaveLength(12);
    expect(months[0]!.label).toBe('Shrawan 2081');
    expect(months[11]!.label).toBe('Ashadh 2082');
    const quarters = nepalFiscalQuarterPeriods(2081);
    expect(quarters.map(q => q.label)).toEqual(['Q1 2081/82', 'Q2 2081/82', 'Q3 2081/82', 'Q4 2081/82']);
    expect(quarters[0]!.start).toEqual(months[0]!.start);
    expect(quarters[3]!.end).toEqual(months[11]!.end);
    // Contiguous: each period starts the day after the previous one ends.
    for (let i = 1; i < 12; i++) {
      const prev = new Date(Date.UTC(months[i - 1]!.end!.year, months[i - 1]!.end!.month - 1, months[i - 1]!.end!.day) + 86400000);
      expect([prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate()]).toEqual([months[i]!.start!.year, months[i]!.start!.month, months[i]!.start!.day]);
    }
    expect(() => nepalFiscalYearPeriods(2082, 2081)).toThrow(RangeError);
  });

  it('picks a period with the keyboard-operable select and shows its range', async () => {
    const { container } = render(<Harness list={years} initial="fy-2081" />);
    expect(screen.getByRole('combobox', { name: 'Reporting period' })).toBeTruthy();
    expect(screen.getByText(/1 Shrawan 2081 – 32 Ashadh 2082 BS/)).toBeTruthy();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Reporting period' }), 'fy-2080');
    expect(screen.getByTestId('out').textContent).toBe('fy-2080');
    expect(screen.getByText(/1 Shrawan 2080/)).toBeTruthy();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('switches kind and keeps the same time span', async () => {
    const { container } = render(<Harness list={mixed} initial="fy-2081" />);
    const kind = screen.getByRole('group', { name: 'Reporting period type' });
    await userEvent.click(within(kind).getByLabelText('Quarter'));
    expect(screen.getByTestId('out').textContent).toBe('q-2081-1');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Reporting period' }), 'q-2081-3');
    await userEvent.click(within(kind).getByLabelText('Month'));
    expect(screen.getByTestId('out').textContent).toBe('m-2081-07');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('takes any caller-supplied list (another jurisdiction)', async () => {
    const list: FinancialPeriod[] = [{ id: 'ay-2024', kind: 'year', label: 'FY ending 31 Mar 2025', detail: '1 Apr 2024 – 31 Mar 2025' }, { id: 'ay-2023', kind: 'year', label: 'FY ending 31 Mar 2024' }];
    render(<Harness list={list} initial="ay-2024" />);
    expect(screen.getByText('1 Apr 2024 – 31 Mar 2025')).toBeTruthy();
    await userEvent.selectOptions(screen.getByRole('combobox'), 'ay-2023');
    expect(screen.getByTestId('out').textContent).toBe('ay-2023');
    expect(screen.queryByText('1 Apr 2024 – 31 Mar 2025')).toBeNull();
  });
});
