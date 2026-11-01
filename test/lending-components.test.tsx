import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  AmortisationTable, DepositCalculator, DocumentUpload, IdNumberInput, InsurancePremiumCard, InterestRateTable, LoanCalculator, NepalAddressPicker,
  OnboardingWizard, RemittanceTracker, amortise, emptyNepalAddress, loadNepalAddressData, maskControlNumber, normalizeControlNumber,
  type AmortisationSchedule, type DepositResult, type NepalAddress, type RemittanceDetails,
} from '../src/index.ts';
import { nepalAddressData } from '../src/nepal-address-data/data.ts';
import { depositRates, kycDocumentSlots, lendingRates, onboardingSteps, premiumBreakdown, remittanceSample } from '../fixtures/lending-data.ts';
import { seriousViolations } from './axe.ts';

const flat = (s: string | null | undefined) => (s ?? '').replace(/[  ]/g, ' ');

describe('AmortisationTable', () => {
  const schedule = amortise({ principal: 10_000_000n, ratePercent: '12', months: 24, rounding: 'half-up', prepayments: [{ period: 6, amount: 1_000_000n }] });
  it('lists every month with totals and a prepayment column, and is accessible', async () => {
    const { container } = render(<AmortisationTable schedule={schedule} testId="am" />);
    const table = screen.getByRole('table');
    expect(within(table).getByText(/Repayment schedule/)).toBeTruthy();
    expect(flat(table.querySelector('caption')?.textContent)).toContain('Amounts in NPR');
    expect(within(table).getAllByRole('row')).toHaveLength(schedule.rows.length + 2);
    expect(within(table).getByRole('columnheader', { name: 'Prepayment' })).toBeTruthy();
    expect(table.querySelector('tr[data-prepaid]')).toBeTruthy();
    expect(screen.getByRole('region', { name: /Repayment schedule/ }).tabIndex).toBe(0);
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('groups by year with exact sums', async () => {
    const user = userEvent.setup();
    render(<AmortisationTable schedule={schedule} testId="am" />);
    await user.click(screen.getByRole('radio', { name: 'Year' }));
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(2 + 2);
    expect(within(rows[0]!).getByRole('columnheader', { name: 'Year' })).toBeTruthy();
  });
  it('defaults to years for long loans and shows Devanagari period numbers', () => {
    const long = amortise({ principal: 10_000_000n, ratePercent: '10', months: 120, rounding: 'half-up' });
    render(<AmortisationTable schedule={long} digits="deva" />);
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(12);
    expect(screen.getByRole('rowheader', { name: '१०' })).toBeTruthy();
  });
});

describe('LoanCalculator', () => {
  it('shows the EMI and totals, announces politely, and reveals the schedule', async () => {
    const user = userEvent.setup();
    const onScheduleChange = vi.fn<(s: AmortisationSchedule | null) => void>();
    const { container } = render(<LoanCalculator defaultAmount="1000000" defaultRatePercent="10" defaultMonths={120} onScheduleChange={onScheduleChange} testId="lc" />);
    expect(flat(screen.getByTestId('lc-emi').textContent)).toContain('13,215.07');
    expect(container.querySelector('.pu-lcalc-result[aria-live]')).toBeNull();
    expect(screen.getByTestId('lc-status').getAttribute('role')).toBe('status');
    expect(onScheduleChange).toHaveBeenLastCalledWith(expect.objectContaining({ emi: 1_321_507n, periods: 120 }));
    const toggle = screen.getByTestId('lc-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('lc-schedule')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('reports savings from a prepayment and validates the tenure', async () => {
    const user = userEvent.setup();
    render(<LoanCalculator defaultAmount="2000000" defaultRatePercent="12" defaultMonths={120} testId="lc" />);
    await user.type(screen.getByTestId('lc-prepay'), '500000');
    expect(screen.getByText('Interest saved')).toBeTruthy();
    expect(screen.getByText('Instalments saved')).toBeTruthy();
    const tenure = screen.getByTestId('lc-tenure');
    await user.clear(tenure);
    await user.type(tenure, '45');
    expect(screen.getByRole('alert').textContent).toContain('1 to 360 months');
    expect(screen.getByText(/Enter the amount, rate and tenure/)).toBeTruthy();
  });
  it('switches the tenure unit without changing the loan', async () => {
    const user = userEvent.setup();
    render(<LoanCalculator defaultAmount="1000000" defaultRatePercent="10" defaultMonths={120} testId="lc" />);
    await user.click(screen.getByRole('radio', { name: 'Months' }));
    expect((screen.getByTestId('lc-tenure') as HTMLInputElement).value).toBe('120');
    expect(flat(screen.getByTestId('lc-emi').textContent)).toContain('13,215.07');
  });
});

describe('DepositCalculator', () => {
  it('computes a fixed deposit with quarterly compounding', async () => {
    const { container } = render(<DepositCalculator defaultAmount="100000" defaultRatePercent="10" defaultTdsPercent="0" testId="dc" />);
    expect(flat(screen.getByTestId('dc-maturity').textContent)).toContain('1,10,381.29');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('deducts TDS, switches to recurring, and lists each credit', async () => {
    const user = userEvent.setup();
    const onResultChange = vi.fn<(r: DepositResult | null) => void>();
    render(<DepositCalculator defaultAmount="1000" defaultRatePercent="12" onResultChange={onResultChange} testId="dc" />);
    await user.click(screen.getByRole('radio', { name: 'Recurring deposit' }));
    expect(screen.getByLabelText(/Monthly instalment/)).toBeTruthy();
    const last = onResultChange.mock.lastCall?.[0];
    if (!last) throw new Error('no result');
    expect(last.totalDeposited).toBe(1_200_000n);
    expect(last.totalTds > 0n).toBe(true);
    await user.click(screen.getByTestId('dc-toggle'));
    expect(within(screen.getByTestId('dc-credits')).getAllByRole('row')).toHaveLength(5);
  });
});

describe('InterestRateTable', () => {
  it('groups rows, shows changes in words and points, and is accessible', async () => {
    const { container } = render(<InterestRateTable caption="Deposit rates" rates={depositRates} />);
    const table = screen.getByRole('table', { name: /Deposit rates/ });
    expect(within(table).getByRole('columnheader', { name: 'Savings' })).toBeTruthy();
    expect(table.textContent).toContain('Down 0.25 points');
    expect(table.textContent).toContain('Up 0.25 points');
    expect(table.textContent).toContain('No change');
    expect(table.querySelector('time')?.getAttribute('dateTime')).toBe('2025-07-17');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('prints Bikram Sambat dates in Nepali and drops the change column when there is none', () => {
    render(<InterestRateTable caption="Loan rates" rates={lendingRates.map((r) => ({ ...r, previousRatePercent: undefined }))} calendar="bs" language="ne" digits="deva" />);
    expect(screen.queryByRole('columnheader', { name: 'Change' })).toBeNull();
    expect(screen.getAllByText(/२०८२/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('८.४९%')).toHaveLength(1);
  });
});

function IdHarness({ kind, onResult }: { kind: 'pan' | 'citizenship'; onResult?: (state: string) => void }) {
  const [value, setValue] = useState('');
  return <IdNumberInput kind={kind} label={kind === 'pan' ? 'PAN' : 'Citizenship number'} value={value} onValueChange={({ value: text, check }) => { setValue(text); onResult?.(check.state); }} testId="id" />;
}

describe('IdNumberInput', () => {
  it('refuses letters, accepts Devanagari digits and reports a valid PAN', async () => {
    const user = userEvent.setup();
    const onResult = vi.fn<(state: string) => void>();
    const { container } = render(<IdHarness kind="pan" onResult={onResult} />);
    const input = screen.getByTestId('id') as HTMLInputElement;
    await user.type(input, '30a12345६७');
    expect(input.value).toBe('301234567');
    expect(onResult).toHaveBeenLastCalledWith('valid');
    expect(input.inputMode).toBe('numeric');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('explains a short PAN and a malformed citizenship number after leaving the field', async () => {
    const user = userEvent.setup();
    render(<><IdHarness kind="pan" /><button type="button">next</button></>);
    await user.type(screen.getByTestId('id'), '1234');
    expect(screen.queryByRole('alert')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'next' }));
    expect(screen.getByRole('alert').textContent).toBe('A PAN has 9 digits.');
  });
  it('keeps separators in a citizenship number', async () => {
    const user = userEvent.setup();
    render(<><IdHarness kind="citizenship" /><button type="button">next</button></>);
    await user.type(screen.getByTestId('id'), '27-01--');
    await user.click(screen.getByRole('button', { name: 'next' }));
    expect(screen.getByRole('alert').textContent).toContain('one - or /');
  });
});

function AddressHarness({ data, onChange }: { data?: typeof nepalAddressData; onChange?: (a: NepalAddress) => void }) {
  const [value, setValue] = useState<NepalAddress>(emptyNepalAddress);
  return <NepalAddressPicker value={value} data={data} onChange={(a) => { setValue(a); onChange?.(a); }} testId="addr" />;
}

describe('NepalAddressPicker', () => {
  it('narrows districts and local levels and clears lower levels', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(a: NepalAddress) => void>();
    const { container } = render(<AddressHarness data={nepalAddressData} onChange={onChange} />);
    await user.selectOptions(screen.getByTestId('addr-province'), 'Bagmati');
    const district = screen.getByTestId('addr-district') as HTMLSelectElement;
    expect(district.options).toHaveLength(14);
    await user.selectOptions(district, 'Kathmandu');
    const local = screen.getByTestId('addr-local') as HTMLSelectElement;
    expect(local.options).toHaveLength(12);
    expect(within(local).getByRole('option', { name: 'Budhanilkantha Municipality' })).toBeTruthy();
    await user.selectOptions(local, 'Tokha');
    await user.type(screen.getByTestId('addr-ward'), '५');
    expect(onChange).toHaveBeenLastCalledWith({ province: 'Bagmati', district: 'Kathmandu', localLevel: 'Tokha', ward: '5' });
    await user.selectOptions(screen.getByTestId('addr-province'), 'Koshi');
    expect(onChange).toHaveBeenLastCalledWith({ province: 'Koshi', district: '', localLevel: '', ward: '5' });
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('loads the address list on demand', async () => {
    render(<AddressHarness />);
    await waitFor(() => expect(screen.getByTestId('addr-province')).toBeTruthy());
    expect(await loadNepalAddressData()).toBe(nepalAddressData);
  });
});

function UploadHarness({ onChange }: { onChange?: (v: Record<string, File | null>) => void }) {
  const [value, setValue] = useState<Record<string, File | null>>({});
  return <DocumentUpload title="Documents" slots={kycDocumentSlots} value={value} onChange={(v) => { setValue(v); onChange?.(v); }} testId="docs" />;
}

describe('DocumentUpload', () => {
  it('takes a file per slot, announces it, and removes it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(v: Record<string, File | null>) => void>();
    const { container } = render(<UploadHarness onChange={onChange} />);
    const file = new File(['x'.repeat(10)], 'front.png', { type: 'image/png' });
    await user.upload(screen.getByTestId('docs-citizenship-front-input'), file);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ 'citizenship-front': file, photo: null }));
    expect(screen.getByText('front.png')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('front.png added for Citizenship certificate, front.');
    expect(await seriousViolations(container)).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Remove Citizenship certificate, front' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ 'citizenship-front': null }));
  });
  it('refuses a wrong type or an oversized file with a message', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onChange = vi.fn<(v: Record<string, File | null>) => void>();
    render(<UploadHarness onChange={onChange} />);
    await user.upload(screen.getByTestId('docs-photo-input'), new File(['x'], 'photo.pdf', { type: 'application/pdf' }));
    expect(screen.getByRole('alert').textContent).toContain('not accepted');
    await user.upload(screen.getByTestId('docs-signature-input'), new File([new Uint8Array(1024 * 1024 + 1)], 'sig.png', { type: 'image/png' }));
    expect(screen.getAllByRole('alert')[1]!.textContent).toContain('too large');
    expect(onChange).not.toHaveBeenCalled();
  });
});

function WizardHarness({ onSubmit }: { onSubmit: () => void }) {
  const [step, setStep] = useState(0);
  return (
    <OnboardingWizard steps={onboardingSteps} current={step} onBack={() => setStep((s) => s - 1)} onStepSelect={setStep}
      onNext={() => (step === onboardingSteps.length - 1 ? onSubmit() : setStep((s) => s + 1))} testId="wiz">
      <label>Name <input /></label>
    </OnboardingWizard>
  );
}

describe('OnboardingWizard', () => {
  it('moves through steps, focuses each heading, and submits on the last', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<() => void>();
    const { container } = render(<WizardHarness onSubmit={onSubmit} />);
    expect(screen.getByRole('heading', { name: 'Personal details' })).toBeTruthy();
    expect(container.querySelector('[aria-current="step"]')?.textContent).toContain('Personal details');
    expect(screen.queryByTestId('wiz-back')).toBeNull();
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Sita{Enter}');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Address' }));
    expect(screen.getByRole('status').textContent).toBe('Step 2 of 4: Address');
    await user.click(screen.getByRole('button', { name: /Personal details/ }));
    expect(screen.getByRole('heading', { name: 'Personal details' })).toBeTruthy();
    for (let i = 0; i < 3; i++) await user.click(screen.getByTestId('wiz-next'));
    expect(screen.getByTestId('wiz-next').textContent).toBe('Submit');
    expect(await seriousViolations(container)).toEqual([]);
    await user.click(screen.getByTestId('wiz-next'));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

describe('RemittanceTracker', () => {
  it('normalises and masks control numbers', () => {
    expect(normalizeControlNumber('१२३४ 5678-9012')).toBe('123456789012');
    expect(normalizeControlNumber('12a')).toBeNull();
    expect(maskControlNumber('1234567890123456')).toBe('•••• •••• 3456');
  });
  it('checks the length, looks up, focuses the result and shows only the last digits', async () => {
    const user = userEvent.setup();
    const onLookup = vi.fn<(n: string, s: AbortSignal) => Promise<RemittanceDetails | null>>(async () => remittanceSample);
    const { container } = render(<RemittanceTracker onLookup={onLookup} testId="rt" />);
    await user.type(screen.getByTestId('rt-input'), '1234');
    await user.click(screen.getByTestId('rt-submit'));
    expect(screen.getByRole('alert').textContent).toContain('8 to 16 digits');
    expect(onLookup).not.toHaveBeenCalled();
    await user.type(screen.getByTestId('rt-input'), '56789012');
    expect((screen.getByTestId('rt-input') as HTMLInputElement).value).toBe('1234 5678 9012');
    await user.click(screen.getByTestId('rt-submit'));
    const heading = await screen.findByRole('heading', { name: /Remittance/ });
    expect(onLookup.mock.calls[0]![0]).toBe('123456789012');
    expect(heading.textContent).toBe('Remittance •••• •••• 9012');
    expect(document.activeElement).toBe(heading);
    const result = screen.getByTestId('rt-result');
    expect(flat(result.textContent)).toContain('NPR 54,930.00');
    expect(result.textContent).toContain('Cash pickup');
    expect(within(result).getByRole('list', { name: 'Transfer progress' })).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('says when nothing matches and when the lookup fails, and aborts a pending lookup on unmount', async () => {
    const user = userEvent.setup();
    const onLookup = vi.fn<(n: string, s: AbortSignal) => Promise<RemittanceDetails | null>>()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('down'))
      .mockImplementationOnce(() => new Promise(() => undefined));
    const { unmount } = render(<RemittanceTracker onLookup={onLookup} testId="rt" />);
    await user.type(screen.getByTestId('rt-input'), '12345678');
    await user.click(screen.getByTestId('rt-submit'));
    await screen.findByText(/No remittance matches/);
    await user.click(screen.getByTestId('rt-submit'));
    expect((await screen.findByRole('alert')).textContent).toContain('did not finish');
    await user.click(screen.getByTestId('rt-submit'));
    expect((screen.getByTestId('rt-submit') as HTMLButtonElement).disabled).toBe(true);
    unmount();
    expect(onLookup.mock.calls[2]![1].aborted).toBe(true);
  });
});

describe('RemittanceTracker from a link', () => {
  it('looks up a control number on mount without moving focus', async () => {
    const onLookup = vi.fn<(n: string, s: AbortSignal) => Promise<RemittanceDetails | null>>(async () => remittanceSample);
    render(<RemittanceTracker onLookup={onLookup} defaultControlNumber="1234 5678 9012" lookupOnMount testId="rt" />);
    await screen.findByTestId('rt-result');
    expect(onLookup.mock.calls[0]![0]).toBe('123456789012');
    expect(document.activeElement).toBe(document.body);
  });
});

describe('InsurancePremiumCard', () => {
  it('shows the exact total of the breakdown, status words and facts', async () => {
    const { container } = render(
      <InsurancePremiumCard plan="Endowment Plus" insurer="Example Life Insurance" status="grace" frequency="yearly" breakdown={premiumBreakdown}
        nextDueDate="2025-12-15" sumAssured={1_000_000_00n} termYears={20} policyNumber="EL-2019-004512" testId="ip" />,
    );
    const card = screen.getByTestId('ip');
    expect(flat(card.querySelector('.pu-premium-figure')?.textContent)).toContain('NPR 24,600.00');
    expect(card.textContent).toContain('per year');
    expect(card.textContent).toContain('In grace period');
    expect(card.textContent).toContain('15 Dec 2025');
    expect(card.textContent).toContain('20 years');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('shows a missing premium as a dash, never zero', () => {
    render(<InsurancePremiumCard plan="Term" frequency="monthly" testId="ip" />);
    expect(screen.getByTestId('ip').textContent).toContain('No value');
  });
});
