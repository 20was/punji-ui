import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as root from '../src/index.ts';
import { BillSummary, billTotal, type BillLine } from '../src/bill-summary/BillSummary.tsx';
import { seriousViolations } from './axe.ts';

const LINES: BillLine[] = [
  { id: 'energy', label: 'Energy charge', amount: 184_500n, detail: '212 units' },
  { id: 'service', label: 'Service charge', amount: 17_500n },
];
const ADJ: BillLine[] = [{ id: 'rebate', label: 'Early payment rebate', amount: -4_040n }];

describe('BillSummary', () => {
  it('adds the lines and adjustments exactly', () => {
    expect(billTotal(LINES, ADJ)).toBe(197_960n);
    expect(billTotal()).toBe(0n);
  });

  it('shows the customer, the lines, the due date in BS and the total', async () => {
    const { container } = render(
      <BillSummary biller="Nepal Electricity Authority" service="Electricity" customerName="Sita Sharma" customerId="012.34.567A" period="Ashwin 2083" lines={LINES} adjustments={ADJ} dueDate="2026-11-15" calendar="bs" status="unpaid" testId="bill" />,
    );
    expect(screen.getByRole('heading', { name: 'Nepal Electricity Authority' })).toBeTruthy();
    expect(screen.getByTestId('bill-total').textContent).toContain('1,979.60');
    expect(container.textContent).toContain('2083');
    expect(container.textContent).toContain('Unpaid');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('prefers the total the biller returned', () => {
    render(<BillSummary biller="KUKL" lines={LINES} total={250_000n} testId="bill" />);
    expect(screen.getByTestId('bill-total').textContent).toContain('2,500.00');
  });

  it('has loading, error and empty states', async () => {
    const retry = vi.fn<() => void>();
    const { rerender, container } = render(<BillSummary biller="WorldLink" state="loading" />);
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    rerender(<BillSummary biller="WorldLink" state="error" onRetry={retry} testId="bill" />);
    expect(screen.getByRole('alert').textContent).toContain('Could not fetch the bill');
    fireEvent.click(screen.getByTestId('bill-retry'));
    expect(retry).toHaveBeenCalled();
    rerender(<BillSummary biller="WorldLink" customerId="sita_home" state="empty" />);
    expect(screen.getByRole('status').textContent).toContain('Nothing to pay');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('is in the root export', () => {
    expect(root.BillSummary).toBe(BillSummary);
    expect(root.billTotal).toBe(billTotal);
  });
});
