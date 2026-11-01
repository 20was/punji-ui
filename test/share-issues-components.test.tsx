import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  AllotmentChecker, ApplyIssueForm, BoidInput, CorporateActionTimeline, DematAccountCard, EdisConfirmation, IssueCard, IssueList,
  type AllotmentRequest, type AllotmentResult, type ApplyIssueSubmission, type BoidInputChange,
} from '../src/index.ts';
import {
  applyAccounts, corporateEvents, dematAccounts, edisTransfers, fakeAllotment, issuesToday, savedBoids, shareIssues,
} from '../fixtures/share-issues-data.ts';
import { seriousViolations } from './axe.ts';

const flat = (s: string | null | undefined) => (s ?? '').replace(/[  ]/g, ' ');
const ipo = shareIssues[0]!;

describe('IssueCard', () => {
  it('shows kind, status in words, days left, BS and AD dates and kitta rules', async () => {
    const { container } = render(<IssueCard issue={ipo} today={issuesToday} testId="ic" />);
    const card = screen.getByRole('article', { name: /Tamakoshi Valley Hydropower/ });
    expect(within(card).getByText('IPO')).toBeTruthy();
    expect(screen.getByTestId('ic-status').textContent).toBe('Open');
    expect(screen.getByTestId('ic-countdown').textContent).toBe('Closes in 3 days');
    expect(flat(card.textContent)).toContain('25 Kartik 2082 BS');
    expect(flat(card.textContent)).toContain('11 Nov 2025 AD');
    expect(card.querySelector('time')?.getAttribute('datetime')).toBe('2025-11-11');
    expect(flat(card.textContent)).toContain('15,00,000');
    expect(flat(card.textContent)).toContain('10 to 1,000 (multiples of 10)');
    expect(flat(card.textContent)).toMatch(/NPR\s?100\.00/);
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('prints Devanagari digits and Nepali months, and leads with AD on request', () => {
    const { container, rerender } = render(<IssueCard issue={ipo} today={issuesToday} digits="deva" language="ne" />);
    expect(container.textContent).toContain('२५ कात्तिक २०८२');
    expect(container.textContent).toContain('१५,००,०००');
    rerender(<IssueCard issue={ipo} today={issuesToday} primaryCalendar="ad" />);
    expect(container.querySelector('.pu-dual-date-a')?.textContent).toBe('11 Nov 2025 AD');
  });
  it('says the last day and a closed issue in words; without today there is no status', () => {
    const { rerender } = render(<IssueCard issue={shareIssues[1]!} today={issuesToday} testId="ic" />);
    expect(screen.getByTestId('ic-status').textContent).toBe('Closes today');
    expect(screen.getByTestId('ic-countdown').textContent).toBe('Last day to apply');
    rerender(<IssueCard issue={shareIssues[5]!} today={issuesToday} testId="ic" />);
    expect(screen.getByTestId('ic-countdown').textContent).toBe('Closed 7 days ago');
    rerender(<IssueCard issue={ipo} testId="ic" />);
    expect(screen.queryByTestId('ic-status')).toBeNull();
  });
});

describe('IssueList', () => {
  it('orders by status, filters by kind with counts and announces the count', async () => {
    const user = userEvent.setup();
    const onKindChange = vi.fn<(kind: string) => void>();
    const { container } = render(<IssueList issues={shareIssues} today={issuesToday} onKindChange={onKindChange} renderAction={(i, s) => (s === 'open' || s === 'closing-today' ? <button type="button">Apply {i.symbol ?? i.company}</button> : null)} testId="il" />);
    const names = screen.getAllByRole('article').map((a) => a.querySelector('.pu-issue-name')?.firstChild?.textContent);
    expect(names).toEqual(['Annapurna Finance', 'Tamakoshi Valley Hydropower', 'Sagarmatha Growth Fund', 'Lumbini Cement Industries', 'Koshi Bank 9% Debenture 2090', 'Mechi Laghubitta']);
    expect(screen.getAllByRole('button', { name: /^Apply/ })).toHaveLength(3);
    await user.click(screen.getByTestId('il-kind-ipo'));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(onKindChange).toHaveBeenCalledWith('ipo');
    expect(screen.getByRole('status').textContent).toBe('2 issues');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('shows an empty state and hides the filter with a single kind', () => {
    render(<IssueList issues={[]} today={issuesToday} emptyBody="Check back on Sunday." />);
    expect(screen.getByRole('heading', { name: 'No issues to show' })).toBeTruthy();
    render(<IssueList issues={[ipo]} today={issuesToday} testId="one" />);
    expect(screen.queryByTestId('one-kind-all')).toBeNull();
  });
});

function BoidHarness({ onChange, ...props }: { onChange?: (c: BoidInputChange) => void; digits?: 'latn' | 'deva'; prefix?: string | null }) {
  const [value, setValue] = useState('');
  return <BoidInput value={value} onValueChange={(c) => { setValue(c.value); onChange?.(c); }} testId="boid" {...props} />;
}

describe('BoidInput', () => {
  it('keeps ASCII digits, converts Devanagari, drops spaces and refuses letters', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(c: BoidInputChange) => void>();
    render(<BoidHarness onChange={onChange} />);
    const input = screen.getByTestId('boid') as HTMLInputElement;
    await user.type(input, '१३०१ 3700x');
    expect(input.value).toBe('13013700');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    await user.type(input, '00012345');
    expect(onChange.mock.lastCall![0].check).toMatchObject({ ok: true, parts: { dpId: '13013700', clientId: '00012345' } });
    expect(screen.getByText('DP ID 13013700 · Client ID 00012345')).toBeTruthy();
  });
  it('says what is wrong only after the field is left', async () => {
    const user = userEvent.setup();
    const { container } = render(<BoidHarness />);
    const input = screen.getByTestId('boid');
    await user.type(input, '13013700');
    expect(screen.queryByRole('alert')).toBeNull();
    await user.tab();
    expect(screen.getByRole('alert').textContent).toBe('A BOID has 16 digits; this has 8.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('shows Devanagari digits while the value stays ASCII', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(c: BoidInputChange) => void>();
    render(<BoidHarness digits="deva" onChange={onChange} />);
    await user.type(screen.getByTestId('boid'), '1301');
    expect((screen.getByTestId('boid') as HTMLInputElement).value).toBe('१३०१');
    expect(onChange.mock.lastCall![0].value).toBe('1301');
  });
});

describe('ApplyIssueForm', () => {
  it('reports every problem on Continue and focuses the first', async () => {
    const user = userEvent.setup();
    const { container } = render(<ApplyIssueForm issue={ipo} accounts={applyAccounts} defaultKitta="15" onSubmit={vi.fn<() => void>()} testId="ap" />);
    await user.click(screen.getByTestId('ap-continue'));
    const alerts = screen.getAllByRole('alert').map((a) => a.textContent);
    expect(alerts).toEqual(['Units must be a multiple of 10.', 'Choose the bank account to block the amount in.', 'Enter the CRN your bank gave you.', 'Confirm the declaration to continue.']);
    expect(document.activeElement).toBe(screen.getByTestId('ap-kitta'));
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('shows the exact amount as the kitta changes, prefills the CRN and submits after the PIN', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(a: ApplyIssueSubmission) => void>();
    const { container } = render(<ApplyIssueForm issue={ipo} accounts={applyAccounts} onSubmit={onSubmit} testId="ap" />);
    expect(flat(screen.getByTestId('ap-amount').textContent)).toMatch(/1,000\.00/);
    const kitta = screen.getByTestId('ap-kitta');
    await user.clear(kitta);
    await user.type(kitta, '1,000');
    expect(flat(screen.getByTestId('ap-amount').textContent)).toMatch(/1,00,000\.00/);
    await user.click(screen.getByTestId('ap-account-acc-2'));
    expect((screen.getByTestId('ap-crn') as HTMLInputElement).value).toBe('MBL-20251102');
    expect(container.innerHTML).not.toContain('0200524003127');
    await user.click(screen.getByTestId('ap-declaration'));
    await user.click(screen.getByTestId('ap-continue'));
    expect(screen.getByRole('heading', { name: 'Review and confirm' })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Review and confirm' })));
    expect(screen.getByTestId('ap-review-kitta').textContent).toBe('1,000');
    await user.click(screen.getByTestId('ap-submit'));
    expect(screen.getByRole('alert').textContent).toBe('Enter all 4 digits.');
    expect(onSubmit).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Digit 1 of 4'), '4321');
    await user.click(screen.getByTestId('ap-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ issueId: 'iss-ipo-open', kitta: 1000n, amount: 10_000_000n, accountId: 'acc-2', crn: 'MBL-20251102', secret: '4321' });
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('goes back keeping the details, stays busy while a promise is pending and shows a server error', async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const onSubmit = vi.fn<() => Promise<void>>(() => new Promise<void>((r) => { resolve = r; }));
    const { rerender } = render(<ApplyIssueForm issue={ipo} accounts={applyAccounts.slice(0, 1)} verification="otp" onResend={vi.fn<() => void>()} onSubmit={onSubmit} testId="ap" />);
    await user.click(screen.getByTestId('ap-declaration'));
    await user.click(screen.getByTestId('ap-continue'));
    await user.click(screen.getByTestId('ap-back'));
    expect((screen.getByTestId('ap-crn') as HTMLInputElement).value).toBe('HBL-77120931');
    await user.click(screen.getByTestId('ap-continue'));
    expect(screen.getByTestId('ap-resend')).toBeTruthy();
    // The form moves focus to the step heading on the next animation frame; typing before that would lose digits.
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Review and confirm' })));
    await user.type(screen.getByLabelText('Digit 1 of 6'), '123456');
    await user.click(screen.getByTestId('ap-submit'));
    expect(screen.getByTestId('ap-submit').getAttribute('aria-busy')).toBe('true');
    resolve();
    await waitFor(() => expect(screen.getByTestId('ap-submit').getAttribute('aria-busy')).toBeNull());
    rerender(<ApplyIssueForm issue={ipo} accounts={applyAccounts.slice(0, 1)} verification="otp" onSubmit={onSubmit} error="Insufficient balance in the bank account." testId="ap" />);
    expect(screen.getByTestId('ap-error').getAttribute('role')).toBe('alert');
  });
});

describe('AllotmentChecker', () => {
  it('checks saved and pasted BOIDs together, dropping duplicates, and summarises', async () => {
    const user = userEvent.setup();
    const onCheck = vi.fn<(r: AllotmentRequest) => Promise<AllotmentResult[]>>(async (r) => fakeAllotment(r.boids));
    const { container } = render(<AllotmentChecker issues={[{ value: 'iss-ipo-open', label: 'Tamakoshi Valley Hydropower' }]} savedAccounts={savedBoids} onCheck={onCheck} testId="al" />);
    await user.click(screen.getByTestId('al-saved-1301520000654320'));
    await user.type(screen.getByTestId('al-extra'), '1301 3700 0001 2345{enter}1301-4400-0000-9990');
    await user.click(screen.getByTestId('al-check'));
    expect(onCheck).toHaveBeenCalledWith({ issueId: 'iss-ipo-open', boids: ['1301370000012345', '1301090000077771', '1301440000009990'] });
    expect(await screen.findByRole('heading', { name: 'Allotment results' })).toBeTruthy();
    expect(screen.getByTestId('al-summary').textContent).toBe('2 of 3 allotted, 20 units in all.');
    const row = screen.getByTestId('al-result-1301440000009990');
    expect(row.textContent).toContain('No application');
    expect(screen.getByTestId('al-result-1301370000012345').textContent).toContain('Sita Sharma');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('names the bad line before sending anything', async () => {
    const user = userEvent.setup();
    const onCheck = vi.fn<() => Promise<AllotmentResult[]>>(async () => []);
    render(<AllotmentChecker onCheck={onCheck} testId="al" />);
    await user.click(screen.getByTestId('al-check'));
    expect(screen.getByRole('alert').textContent).toBe('Choose an account or enter a BOID to check.');
    await user.type(screen.getByTestId('al-extra'), '1301370000012345{enter}13013700');
    await user.click(screen.getByTestId('al-check'));
    expect(screen.getByRole('alert').textContent).toBe('Line 2: A BOID has 16 digits; this has 8.');
    expect(document.activeElement).toBe(screen.getByTestId('al-extra'));
    expect(onCheck).not.toHaveBeenCalled();
  });
  it('offers a retry when the check fails', async () => {
    const user = userEvent.setup();
    const onCheck = vi.fn<() => Promise<AllotmentResult[]>>().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce([{ boid: '1301370000012345', outcome: 'allotted', units: 10n }]);
    render(<AllotmentChecker savedAccounts={savedBoids.slice(0, 1)} onCheck={onCheck} testId="al" />);
    await user.click(screen.getByTestId('al-check'));
    expect((await screen.findByTestId('al-error')).textContent).toContain('Could not check the results.');
    await user.click(screen.getByTestId('al-error-retry'));
    expect(await screen.findByText('10 units')).toBeTruthy();
    expect(onCheck).toHaveBeenCalledTimes(2);
  });
});

describe('DematAccountCard', () => {
  it('splits the BOID, masks the bank account and warns before expiry', async () => {
    const { container } = render(<DematAccountCard {...dematAccounts.active} today={issuesToday} testId="dm" />);
    expect(screen.getByRole('article', { name: 'Sita Sharma' })).toBeTruthy();
    expect(flat(screen.getByTestId('dm-boid').textContent)).toContain('13013700 00012345');
    expect(container.textContent).toContain('DP ID 13013700 · Client ID 00012345');
    expect(container.innerHTML).not.toContain('01920017004501');
    expect(container.textContent).toContain('account ending in 4 5 0 1');
    expect(screen.getByTestId('dm-online-expiry').textContent).toBe('Due in 17 days');
    expect(screen.queryByTestId('dm-demat-expiry')).toBeNull();
    expect(screen.getByTestId('dm-status').textContent).toBe('Active');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('says Expired, masks the BOID on request, and has loading and error states', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn<() => void>();
    const { rerender } = render(<DematAccountCard {...dematAccounts.dormant} today={issuesToday} maskBoid testId="dm" />);
    expect(screen.getByTestId('dm-demat-expiry').textContent).toBe('Expired');
    expect(screen.getByTestId('dm-boid').textContent).toBe('•••••••• ••••4320');
    rerender(<DematAccountCard {...dematAccounts.dormant} loading testId="dm" />);
    expect(screen.getByTestId('dm').getAttribute('aria-busy')).toBe('true');
    rerender(<DematAccountCard {...dematAccounts.dormant} error onRetry={onRetry} testId="dm" />);
    await user.click(screen.getByTestId('dm-error-retry'));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('CorporateActionTimeline', () => {
  it('lists dates in order with phase words and marks the next date', async () => {
    const { container } = render(<CorporateActionTimeline events={corporateEvents} today={issuesToday} testId="ct" />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((i) => i.querySelector('.pu-ca-label')?.textContent)).toEqual(['Board proposes 10% bonus and 5% cash', 'Book close', 'AGM', 'Bonus units credited to demat']);
    expect(screen.getByTestId('ct-ev-bc').getAttribute('aria-current')).toBe('date');
    expect(screen.getByTestId('ct-ev-bc').textContent).toContain('Upcoming · In 7 days');
    expect(screen.getByTestId('ct-ev-ann').textContent).toContain('Done');
    expect(flat(screen.getByTestId('ct-ev-bc').textContent)).toContain('5 Mangsir 2082 BS');
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('EdisConfirmation', () => {
  it('counts the units chosen, requires the declaration and PIN, and sends the ids', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn<(c: { ids: string[]; units: bigint; pin: string }) => void>();
    const { container } = render(<EdisConfirmation transfers={edisTransfers} onConfirm={onConfirm} testId="ed" />);
    expect(screen.getByTestId('ed-confirm').textContent).toBe('Transfer 150 units');
    await user.click(screen.getByTestId('ed-pick-ed-2'));
    expect(screen.getByTestId('ed-confirm').textContent).toBe('Transfer 100 units');
    await user.click(screen.getByTestId('ed-confirm'));
    expect(screen.getAllByRole('alert').map((a) => a.textContent)).toEqual(['Confirm the declaration to continue.', 'Enter all 4 digits.']);
    await user.click(screen.getByTestId('ed-declaration'));
    await user.type(screen.getByLabelText('Digit 1 of 4'), '9876');
    await user.click(screen.getByTestId('ed-confirm'));
    expect(onConfirm).toHaveBeenCalledWith({ ids: ['ed-1'], units: 100n, pin: '9876' });
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('refuses to confirm with nothing chosen', async () => {
    const user = userEvent.setup();
    render(<EdisConfirmation transfers={edisTransfers.slice(0, 1)} onConfirm={vi.fn<() => void>()} testId="ed" />);
    await user.click(screen.getByTestId('ed-pick-ed-1'));
    await user.click(screen.getByTestId('ed-confirm'));
    expect(screen.getAllByRole('alert')[0]!.textContent).toBe('Choose at least one sale to transfer.');
  });
});
