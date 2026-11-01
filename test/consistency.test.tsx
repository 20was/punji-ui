// Checks from the 0.2.0 consistency pass: one PAN rule, one Devanagari digit mapping, the shared prop conventions
// (className, testId, ref, onValueChange({ value, check }), labels) and calculator announcements that wait for typing
// to settle.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fromDevanagari, showDigits, toDevanagari } from '../src/internal/digits.ts';
import {
  checkPan, ConfirmAmount, DEFAULT_ID_NUMBER_INPUT_LABELS, DepositCalculator, HoldToConfirm, IdNumberInput, LoanCalculator, PanInput, PayeeVerification,
  ScamWarning, SecureField, TransferReview, validatePan, type IdNumberInputChange,
} from '../src/index.ts';

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('one Devanagari digit mapping', () => {
  it('maps both ways and leaves other characters alone', () => {
    expect(fromDevanagari('९८४-१२३ abc')).toBe('984-123 abc');
    expect(toDevanagari('Rs 1,234.50')).toBe('Rs १,२३४.५०');
    expect(showDigits(2082, 'deva')).toBe('२०८२');
    expect(showDigits(2082)).toBe('2082');
  });
});

describe('one PAN rule (kyc validatePan is tax checkPan)', () => {
  const inputs = ['', '301234567', '३०१२३४५६७', '301 234 567', '301-234-567', '3012', '30123456789', '30A234567', '301.234.567', '301–234–567'];
  it.each(inputs)('agrees on %j', (input) => {
    const tax = checkPan(input);
    const expected = tax.state === 'partial' ? { state: 'invalid', value: tax.value, reason: 'length' } : tax;
    expect(validatePan(input)).toEqual(expected);
  });
});

function IdHost({ onChange }: { onChange: (change: IdNumberInputChange) => void }) {
  const [value, setValue] = useState('');
  return <IdNumberInput kind="pan" label="PAN" value={value} labels={{ panLength: 'Nine digits, please.' }} testId="id"
    onValueChange={(change) => { setValue(change.value); onChange(change); }} />;
}

describe('IdNumberInput', () => {
  it('reports { value, check } and takes labels like the other inputs', () => {
    const onChange = vi.fn<(change: IdNumberInputChange) => void>();
    render(<IdHost onChange={onChange} />);
    const input = screen.getByTestId('id');
    fireEvent.change(input, { target: { value: '३०१२३४५६७' } });
    expect(onChange).toHaveBeenLastCalledWith({ value: '301234567', check: { state: 'valid', value: '301234567' } });
    fireEvent.change(input, { target: { value: '3012' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert').textContent).toBe('Nine digits, please.');
    expect(DEFAULT_ID_NUMBER_INPUT_LABELS.panLength).toBe('A PAN has 9 digits.');
  });
});

describe('PanInput', () => {
  it('forwards its ref to the input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<PanInput label="PAN" value="" onValueChange={() => {}} ref={ref} />);
    expect(ref.current).toBe(screen.getByLabelText('PAN'));
  });
});

describe('className on the root, like the rest of the kit', () => {
  it('reaches the root element of each trust component', () => {
    const { container } = render(
      <>
        <TransferReview amount={100n} currency="USD" recipient={{ name: 'Sita' }} onConfirm={() => {}} className="x-review" />
        <ScamWarning scenario="purchase" onCancel={() => {}} className="x-scam" />
        <HoldToConfirm onConfirm={() => {}} className="x-hold">Send</HoldToConfirm>
        <SecureField label="PIN" kind="pin" value="" onChange={() => {}} className="x-secure" />
        <PayeeVerification result="match" enteredName="Sita" className="x-payee" />
      </>,
    );
    const pairs: [string, string][] = [['x-review', 'pu-review'], ['x-scam', 'pu-scam'], ['x-hold', 'pu-hold'], ['x-secure', 'pu-secure-field'], ['x-payee', 'pu-payee']];
    for (const [cls, base] of pairs) {
      expect(container.querySelector(`.${cls}.${base}`)).not.toBeNull();
    }
  });
});

describe('ConfirmAmount', () => {
  it('takes the currency from a full money config and a testId', () => {
    render(<ConfirmAmount amount={12_345n} money={{ currency: 'USD', locale: 'en-US' }} testId="ca" className="x-ca" />);
    const root = screen.getByTestId('ca');
    expect(root.classList.contains('x-ca')).toBe(true);
    expect(root.textContent).toContain('$123.45');
  });
});

describe('calculator announcements wait for typing to settle', () => {
  it('LoanCalculator says the new EMI once, after a pause, and the figures are not a live region', () => {
    vi.useFakeTimers();
    const { container } = render(<LoanCalculator defaultAmount="1000000" defaultRatePercent="10" defaultMonths={120} testId="lc" />);
    expect(container.querySelector('[aria-live]')).toBeNull();
    const status = screen.getByTestId('lc-status');
    expect(status.getAttribute('role')).toBe('status');
    const before = status.textContent;
    expect(before).toContain('Monthly instalment (EMI)');
    const amount = screen.getByTestId('lc-amount');
    fireEvent.change(amount, { target: { value: '200000' } });
    fireEvent.change(amount, { target: { value: '2000000' } });
    expect(status.textContent).toBe(before);
    act(() => { vi.advanceTimersByTime(700); });
    expect(status.textContent).not.toBe(before);
    expect(status.textContent).toContain('Monthly instalment (EMI)');
  });

  it('DepositCalculator does the same for the maturity amount', () => {
    vi.useFakeTimers();
    render(<DepositCalculator defaultAmount="100000" defaultRatePercent="10" defaultTdsPercent="0" testId="dc" />);
    const status = screen.getByTestId('dc-status');
    const before = status.textContent;
    expect(before).toContain('Maturity amount');
    fireEvent.change(screen.getByTestId('dc-amount'), { target: { value: '200000' } });
    expect(status.textContent).toBe(before);
    act(() => { vi.advanceTimersByTime(700); });
    expect(status.textContent).not.toBe(before);
  });
});
