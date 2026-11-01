import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import * as root from '../src/index.ts';
import { BillSummary, billTotal, type BillLine } from '../src/bill-summary/BillSummary.tsx';
import { PayeeCheck, comparePayeeNames, payeeCheckAllowsProceed, payeeNameWords } from '../src/payee-check/PayeeCheck.tsx';
import { seriousViolations } from './axe.ts';

describe('comparePayeeNames', () => {
  it('matches regardless of case, punctuation, honorifics and word order', () => {
    expect(comparePayeeNames('sita sharma', 'Sita Sharma')).toBe('match');
    expect(comparePayeeNames('Mrs. Sita Sharma', 'SHARMA, SITA')).toBe('match');
    expect(payeeNameWords('Shri Hari-Bahadur  K.C.')).toEqual(['hari', 'bahadur', 'k', 'c']);
  });

  it('calls initials, a dropped middle name and a small misspelling a close match', () => {
    expect(comparePayeeNames('H. B. Khatri', 'Hari Bahadur Khatri')).toBe('close');
    expect(comparePayeeNames('Hari Khatri', 'Hari Bahadur Khatri')).toBe('close');
    expect(comparePayeeNames('Ramesh Adhikary', 'Ramesh Adhikari')).toBe('close');
  });

  it('says no match for a different person or an empty name', () => {
    expect(comparePayeeNames('Gopal Thapa', 'Sunita Rai')).toBe('no-match');
    expect(comparePayeeNames('', 'Sunita Rai')).toBe('no-match');
    expect(comparePayeeNames('K. Rai', 'Sunita Rai')).toBe('no-match');
  });

  it('lets the payer go on only after a match or an acknowledged warning', () => {
    expect(payeeCheckAllowsProceed('match')).toBe(true);
    expect(payeeCheckAllowsProceed('close')).toBe(false);
    expect(payeeCheckAllowsProceed('close', true)).toBe(true);
    expect(payeeCheckAllowsProceed('no-match', true)).toBe(true);
    expect(payeeCheckAllowsProceed('checking', true)).toBe(false);
    expect(payeeCheckAllowsProceed('error', true)).toBe(false);
  });
});

describe('PayeeCheck', () => {
  it('shows a close match with the registered name, a use-name action and an acknowledgement', async () => {
    const use = vi.fn<() => void>();
    const ack = vi.fn<(next: boolean) => void>();
    const { container } = render(
      <PayeeCheck result="close" enteredName="H. B. Khatri" registeredName="Hari Bahadur Khatri" institution="Nabil Bank" accountNumber="0123456789012" onUseRegisteredName={use} onEdit={() => {}} onAcknowledgedChange={ack} testId="pc" />,
    );
    expect(screen.getByRole('heading', { name: 'Name is a close match' })).toBeTruthy();
    expect(screen.getByTestId('pc-registered').textContent).toBe('Hari Bahadur Khatri');
    expect(container.textContent).toContain('••9012');
    expect(container.textContent).not.toContain('0123456789012');
    fireEvent.click(screen.getByTestId('pc-use'));
    expect(use).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(ack).toHaveBeenCalledWith(true);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('never shows the registered name unless the match is close', () => {
    render(<PayeeCheck result="no-match" enteredName="Gopal Thapa" registeredName="Sunita Rai" onAcknowledgedChange={() => {}} />);
    expect(screen.queryByText('Sunita Rai')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Name does not match' })).toBeTruthy();
  });

  it('has no acknowledgement for a match, a retry for an error, and is busy while checking', async () => {
    const retry = vi.fn<() => void>();
    const { rerender, container } = render(<PayeeCheck result="match" enteredName="Sita Sharma" onAcknowledgedChange={() => {}} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
    rerender(<PayeeCheck result="checking" enteredName="Sita Sharma" />);
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    rerender(<PayeeCheck result="error" enteredName="Sita Sharma" onRetry={retry} testId="pc" />);
    fireEvent.click(screen.getByTestId('pc-retry'));
    expect(retry).toHaveBeenCalled();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('renders on the server and is in the root export', () => {
    expect(renderToString(<PayeeCheck result="unavailable" enteredName="Ram" />)).toContain('Name check not available');
    expect(root.PayeeCheck).toBe(PayeeCheck);
    expect(root.comparePayeeNames).toBe(comparePayeeNames);
  });
});

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
