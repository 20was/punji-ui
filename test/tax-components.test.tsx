import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  AgingTable, IncomeTaxBreakdown, IncomeTaxCalculator, LineItemEditor, PanInput, Payslip, TaxInvoice, TdsSummary, computeIncomeTax,
  type IncomeTaxCalculatorResult, type InvoiceTotals, type LineItemDraft, type PanCheck, type TaxSlab,
} from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const L = 10_000_000n; // one lakh rupees in paisa
const SINGLE: TaxSlab[] = [
  { width: 5n * L, rate: '0.01', label: 'Social security tax', waivable: true },
  { width: 2n * L, rate: '0.1' }, { width: 3n * L, rate: '0.2' }, { width: 10n * L, rate: '0.3' }, { width: 30n * L, rate: '0.36' }, { width: null, rate: '0.39' },
];
const COUPLE: TaxSlab[] = [
  { width: 6n * L, rate: '0.01', label: 'Social security tax', waivable: true },
  { width: 2n * L, rate: '0.1' }, { width: 3n * L, rate: '0.2' }, { width: 9n * L, rate: '0.3' }, { width: 30n * L, rate: '0.36' }, { width: null, rate: '0.39' },
];
const value = (id: string) => screen.getByTestId(id).getAttribute('value');

describe('TaxInvoice', () => {
  const props = {
    seller: { name: 'Himalayan Stationers Pvt. Ltd.', address: 'New Road, Kathmandu', pan: '301234567' },
    buyer: { name: 'Everest Accounting Services', address: 'Lalitpur', pan: '६०९८७६५४३' },
    invoiceNumber: 'INV-2082-0142',
    date: { year: 2025, month: 10, day: 29 },
    lines: [
      { id: 'l1', description: 'A4 copier paper', quantity: 40n, unit: 'box', rate: 285_000n },
      { id: 'l2', description: 'Ledger books', quantity: 25n, rate: 64_000n },
      { id: 'l3', description: 'Toner cartridge', quantity: 6n, rate: 345_000n },
      { id: 'l4', description: 'Delivery', quantity: 1n, rate: 50_000n },
    ],
    discount: { rate: '0.05' },
  };

  it('prints PANs, BS and AD dates, exact totals and the amount in words', async () => {
    const onTotals = vi.fn<(totals: InvoiceTotals) => void>();
    const { container } = render(<TaxInvoice {...props} onTotals={onTotals} testId="inv" />);
    expect(screen.getByRole('article', { name: 'Tax invoice' })).toBeTruthy();
    expect(screen.getByTestId('inv-seller-pan').textContent).toBe('301234567');
    expect(screen.getByText('609876543')).toBeTruthy();
    expect(screen.getByTestId('inv-number').textContent).toBe('INV-2082-0142');
    expect(container.querySelector('time')?.getAttribute('dateTime')).toBe('2025-10-29');
    expect(container.textContent).toContain('2082');
    expect(value('inv-subtotal')).toBe('151200.00');
    expect(value('inv-discount')).toBe('7560.00');
    expect(value('inv-taxable')).toBe('143640.00');
    expect(value('inv-vat')).toBe('18673.20');
    expect(value('inv-total')).toBe('162313.20');
    expect(screen.getByText('VAT 13%')).toBeTruthy();
    expect(screen.getByTestId('inv-words').textContent).toContain('Rupees One Lakh Sixty-Two Thousand Three Hundred Thirteen and Twenty Paisa Only');
    expect(onTotals).toHaveBeenCalledWith(expect.objectContaining({ total: 16_231_320n }));
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(5);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('marks exempt lines, takes another VAT rate and Nepali words, and alerts on invalid lines', () => {
    const { rerender } = render(<TaxInvoice {...props} discount={undefined} vatRate="0.1" lines={[{ id: 'a', description: 'Rice', quantity: '2.5', unit: 'kg', rate: 10_000n, taxable: false }, { id: 'b', description: 'Pen', quantity: 1n, rate: 1000n }]} words={{ language: 'ne' }} testId="inv" />);
    expect(screen.getByText('(exempt)', { exact: false })).toBeTruthy();
    expect(value('inv-exempt')).toBe('250.00');
    expect(value('inv-vat')).toBe('1.00');
    expect(screen.getByText('VAT 10%')).toBeTruthy();
    expect(screen.getByTestId('inv-words').textContent).toContain('रुपैयाँ');
    rerender(<TaxInvoice {...props} lines={[{ id: 'x', description: 'Bad', quantity: -1n, rate: 1n }]} testId="inv" />);
    expect(screen.getByRole('alert').textContent).toContain('cannot be totalled');
  });

  it('shows a print button only when asked', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(<TaxInvoice {...props} printable testId="inv" />);
    await userEvent.click(screen.getByTestId('inv-print'));
    expect(print).toHaveBeenCalled();
    print.mockRestore();
  });
});

function EditorHarness({ initial, onTotals }: { initial: LineItemDraft[]; onTotals?: (t: InvoiceTotals | null, incomplete: string[]) => void }) {
  const [lines, setLines] = useState(initial);
  return <LineItemEditor lines={lines} onChange={setLines} onTotals={onTotals} testId="ed" />;
}

describe('LineItemEditor', () => {
  const initial: LineItemDraft[] = [{ id: 'a', description: 'Paper', quantity: '2', rate: '1000', taxable: true }];

  it('totals exactly as rates are typed and leaves unfinished lines out', async () => {
    const onTotals = vi.fn<(totals: InvoiceTotals | null, incomplete: string[]) => void>();
    const { container } = render(<EditorHarness initial={initial} onTotals={onTotals} />);
    expect(value('ed-amount-0')).toBe('2000.00');
    expect(value('ed-vat')).toBe('260.00');
    expect(value('ed-total')).toBe('2260.00');
    const qty = screen.getByTestId('ed-qty-0');
    await userEvent.clear(qty);
    await userEvent.type(qty, '२.५');
    expect(value('ed-amount-0')).toBe('2500.00');
    await userEvent.clear(qty);
    expect(screen.getByTestId('ed-line-0').dataset.incomplete).toBe('true');
    expect(onTotals).toHaveBeenLastCalledWith(expect.objectContaining({ total: 0n }), ['a']);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('adds a line, focuses it and announces; removes and moves focus', async () => {
    render(<EditorHarness initial={initial} />);
    await userEvent.click(screen.getByTestId('ed-add'));
    expect(document.activeElement).toBe(screen.getByTestId('ed-desc-1'));
    expect(screen.getByTestId('ed-status').textContent).toBe('Line 2 added.');
    await userEvent.type(screen.getByTestId('ed-desc-1'), 'Ink');
    await userEvent.type(screen.getByTestId('ed-rate-1'), '500');
    await userEvent.click(screen.getByTestId('ed-vat-1'));
    expect(value('ed-exempt')).toBe('500.00');
    expect(value('ed-total')).toBe('2760.00');
    expect(screen.getByRole('textbox', { name: 'Description, line 2' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Remove line 1' }));
    expect(screen.getByTestId('ed-status').textContent).toBe('Line 1 removed.');
    expect(document.activeElement).toBe(screen.getByTestId('ed-remove-0'));
    expect(value('ed-total')).toBe('500.00');
    await userEvent.click(screen.getByTestId('ed-remove-0'));
    expect(document.activeElement).toBe(screen.getByTestId('ed-add'));
  });
});

function PanHarness({ onCheck, digits }: { onCheck?: (c: PanCheck) => void; digits?: 'latn' | 'deva' }) {
  const [v, setV] = useState('');
  return <><PanInput label="Buyer PAN" value={v} digits={digits} onValueChange={(c) => { setV(c.value); onCheck?.(c); }} testId="pan" /><button type="button">next</button></>;
}

describe('PanInput', () => {
  it('accepts Devanagari and spaces, keeps ASCII digits, and explains after blur', async () => {
    const onCheck = vi.fn<(check: PanCheck) => void>();
    const { container } = render(<PanHarness onCheck={onCheck} />);
    const input = screen.getByRole('textbox', { name: 'Buyer PAN' });
    await userEvent.type(input, '१२३ 45');
    expect(input).toHaveProperty('value', '12345');
    expect(screen.queryByRole('alert')).toBeNull();
    await userEvent.tab();
    expect(screen.getByRole('alert').textContent).toBe('Enter all 9 digits of the number.');
    await userEvent.type(input, '6789');
    expect(onCheck).toHaveBeenLastCalledWith({ state: 'valid', value: '123456789' });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBeTruthy();
    await userEvent.type(input, 'x');
    expect(screen.getByRole('alert').textContent).toBe('Use digits only.');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('shows Devanagari digits when asked', async () => {
    render(<PanHarness digits="deva" />);
    const input = screen.getByRole('textbox', { name: 'Buyer PAN' });
    await userEvent.type(input, '301');
    expect(input).toHaveProperty('value', '३०१');
  });
});

describe('IncomeTaxCalculator', () => {
  it('computes tax from typed income, status, SSF waiver and capped contributions', async () => {
    const onResult = vi.fn<(result: IncomeTaxCalculatorResult) => void>();
    const { container } = render(
      <IncomeTaxCalculator slabs={{ single: SINGLE, couple: COUPLE }} retirementRule={{ cap: 5n * L, fraction: { numerator: 1n, denominator: 3n } }}
        deductions={[{ id: 'life', label: 'Life insurance premium', cap: 4_000_000n }]} rebates={[{ id: 'women', label: 'Rebate for women', rate: '0.1' }]}
        fiscalYear="FY 2082/83 (example rates)" onResult={onResult} testId="calc" />,
    );
    await userEvent.type(screen.getByTestId('calc-income'), '1200000');
    expect(value('calc-tax')).toBe('145000.00');
    expect(value('calc-monthly')).toBe('12083.33');
    expect(screen.getByTestId('calc-effective').textContent).toBe('12.08%');
    await userEvent.click(screen.getByTestId('calc-status-couple'));
    expect(value('calc-tax')).toBe('116000.00');
    await userEvent.click(screen.getByTestId('calc-ssf-member'));
    expect(value('calc-tax')).toBe('110000.00');
    await userEvent.type(screen.getByTestId('calc-cit'), '600000');
    // Retirement limited to a third of income (4 lakh): taxable 8 lakh, 6 lakh at 1% waived, 2 lakh at 10%.
    expect(value('calc-taxable')).toBe('800000.00');
    expect(value('calc-tax')).toBe('20000.00');
    await userEvent.click(screen.getByTestId('calc-rebate-women'));
    expect(value('calc-tax')).toBe('18000.00');
    expect(onResult).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'couple' }));
    await userEvent.tab();
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Tax for the year');
    expect(screen.getByRole('table', { name: 'Tax by band' })).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('IncomeTaxBreakdown names bands and marks waived ones', () => {
    const result = computeIncomeTax(12n * L, SINGLE, { rounding: 'half-up', waive: true });
    render(<IncomeTaxBreakdown result={result} caption="Tax by band" hideEmpty testId="bands" />);
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(screen.getByText('Social security tax')).toBeTruthy();
    expect(screen.getByText('(waived)', { exact: false })).toBeTruthy();
    expect(screen.getByText('Next 2,00,000.00')).toBeTruthy();
    expect(screen.getByTestId('bands-total').textContent).toContain('1,40,000.00');
  });
});

describe('Payslip', () => {
  const props = {
    employer: { name: 'Himalayan Stationers Pvt. Ltd.', pan: '301234567' },
    employee: { name: 'Sita Gurung', detail: 'EMP-014', pan: '123456789', facts: [{ label: 'Designation', value: 'Accountant' }] },
    period: 'Kartik 2082',
    earnings: [{ id: 'basic', label: 'Basic salary', amount: 5_000_000n }, { id: 'allow', label: 'Allowance', amount: 1_000_000n }],
    deductions: [{ id: 'ssf', label: 'SSF (11%)', amount: 550_000n }, { id: 'tds', label: 'TDS', amount: 125_000n }],
  };

  it('shows gross, deductions, net and the net in words', async () => {
    const { container } = render(<Payslip {...props} testId="slip" />);
    expect(value('slip-gross')).toBe('60000.00');
    expect(value('slip-deductions')).toBe('6750.00');
    expect(value('slip-net')).toBe('53250.00');
    expect(screen.getByTestId('slip-words').textContent).toContain('Fifty-Three Thousand Two Hundred Fifty');
    expect(screen.getByRole('heading', { name: 'Earnings' })).toBeTruthy();
    expect(screen.getByTestId('slip-employee').textContent).toContain('123456789');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('shows a negative net rather than hiding it', () => {
    const { container } = render(<Payslip {...props} earnings={[]} words={false} testId="slip" />);
    expect(value('slip-net')).toBe('-6750.00');
    expect(container.querySelector('.pu-slip-net')?.getAttribute('data-negative')).toBe('true');
    expect(screen.getByText('None')).toBeTruthy();
  });
});

describe('AgingTable', () => {
  const asOf = { year: 2025, month: 11, day: 15 };
  const items = [
    { id: 'i2', party: 'Himal Traders', date: { year: 2025, month: 11, day: 1 }, amount: 2_000_000n },
    { id: 'i3', party: 'Everest Stores', date: { year: 2025, month: 9, day: 30 }, amount: 3_000_000n },
    { id: 'i4', party: 'Everest Stores', date: { year: 2025, month: 8, day: 1 }, amount: 4_000_000n },
  ];

  it('buckets by party with totals and shares, hiding an empty not-due column', async () => {
    const { container } = render(<AgingTable caption="Receivables aging (NPR)" items={items} asOf={asOf} testId="aging" />);
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Party', '0–30 days', '31–60 days', '61–90 days', 'Over 90 days', 'Total']);
    expect(screen.getByTestId('aging-grand').textContent).toContain('90,000.00');
    expect(screen.getByTestId('aging-total-90+').textContent).toContain('40,000.00');
    expect(within(screen.getByTestId('aging-share')).getByText('44.4%')).toBeTruthy();
    expect(container.querySelector('.pu-aging-old')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('shows not-due when present, and the loading and empty states', () => {
    const { rerender } = render(<AgingTable caption="Payables" items={[...items, { id: 'n', party: 'Lumbini', date: { year: 2025, month: 12, day: 1 }, amount: 100n }]} asOf={asOf} testId="aging" />);
    expect(screen.getAllByRole('columnheader')[1]!.textContent).toBe('Not due');
    rerender(<AgingTable caption="Payables" items={[]} asOf={asOf} testId="aging" />);
    expect(screen.getByText('Nothing outstanding.')).toBeTruthy();
    rerender(<AgingTable caption="Payables" items={items} asOf={asOf} state="error" onRetry={() => undefined} testId="aging" />);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});

describe('TdsSummary', () => {
  const entries = [
    { id: 't1', party: 'Ram Shrestha', pan: '123456789', category: 'Rent', gross: 5_000_000n, rate: '0.1' },
    { id: 't2', party: 'Sita Builders', pan: '301234567', category: 'Contract', gross: 10_000_000n, rate: '0.015' },
    { id: 't3', party: 'Hari Shrestha', category: 'Rent', gross: 2_000_000n, rate: '0.1' },
  ];

  it('sums by category with rates and a total row', async () => {
    const { container } = render(<TdsSummary caption="TDS, Kartik 2082 (NPR)" entries={entries} testId="tds" />);
    const rent = screen.getByTestId('tds-category-Rent');
    expect(rent.textContent).toContain('10%');
    expect(rent.textContent).toContain('7,000.00');
    expect(screen.getByTestId('tds-category-Contract').textContent).toContain('1.5%');
    expect(value('tds-total-tds')).toBe('8500.00');
    expect(value('tds-total-gross')).toBe('170000.00');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('lists entries with PANs, and alerts on bad input', () => {
    const { rerender } = render(<TdsSummary caption="TDS entries" entries={entries} view="entries" testId="tds" />);
    expect(screen.getByTestId('tds-entry-t1').textContent).toContain('123456789');
    expect(screen.getByTestId('tds-entry-t3').textContent).toContain('—');
    rerender(<TdsSummary caption="TDS" entries={[{ ...entries[0]!, rate: 'ten' }]} testId="tds" />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
