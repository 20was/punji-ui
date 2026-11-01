import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ConfirmAmount, HoldToConfirm, PayeeVerification, ScamWarning, SecureField, SessionTimeoutWarning, TransferReview,
} from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(() => { cleanup(); vi.useRealTimers(); });

function SessionHost({ start, onExpire, onExtend = () => {} }: { start: number; onExpire: () => void; onExtend?: () => void }) {
  return <SessionTimeoutWarning expiresAt={start + 90_000} warnBefore={60_000} onExtend={onExtend} onSignOut={() => {}} onExpire={onExpire} />;
}
function Extending() {
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + 30_000);
  return <SessionTimeoutWarning expiresAt={expiresAt} onExtend={() => setExpiresAt(Date.now() + 600_000)} onSignOut={() => {}} onExpire={() => {}} />;
}
function SecretHost({ kind }: { kind: 'current-password' | 'one-time-code' | 'account-number' }) {
  const [value, setValue] = useState('');
  return <SecureField label="Secret" kind={kind} value={value} onChange={setValue} hint="Never share it" />;
}

describe('ConfirmAmount', () => {
  it('reads the amount back in figures and words, and marks a change', async () => {
    const { container } = render(<ConfirmAmount amount={125050n} currency="USD" previous={12505n} />);
    expect(container.textContent).toContain('$1,250.50');
    expect(container.textContent).toContain('One Thousand Two Hundred Fifty Dollars and Fifty Cents Only');
    expect(container.textContent).toContain('Changed from $125.05');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('leaves out words for a non-English locale unless given, and takes lakh grouping', () => {
    const { container } = render(<ConfirmAmount amount={50000000n} currency="NPR" money={{ locale: 'ne-NP' }} />);
    expect(container.querySelector('.pu-confirm-amount-words')).toBeNull();
    cleanup();
    render(<ConfirmAmount amount={50000000n} currency="NPR" money={{ locale: 'en-IN', display: 'code' }} words="Rupees Five Lakh Only" />);
    expect(screen.getByText('Rupees Five Lakh Only')).toBeTruthy();
  });
});

describe('TransferReview', () => {
  it('shows recipient, details, fee and total, with changed rows marked in words', async () => {
    const onConfirm = vi.fn<() => void>();
    const { container } = render(
      <TransferReview
        amount={500000n} currency="NPR" money={{ locale: 'en-IN', display: 'code' }} fee={1000n}
        recipient={{ name: 'Sita Sharma', account: '•••• 4821', institution: 'Nabil Bank' }}
        details={[{ id: 'ref', label: 'Remarks', value: 'Rent', previous: 'Rent June' }]}
        onConfirm={onConfirm} onEdit={() => {}}
      />,
    );
    const review = screen.getByRole('region', { name: 'Check before you send' });
    expect(within(review).getByText('Sita Sharma')).toBeTruthy();
    expect(review.textContent).toContain('NPR 5,010.00');
    expect(review.textContent).toContain('Changed (was Rent June)');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm and send' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('blocks confirming a spoofed name until the person checks it', async () => {
    const onConfirm = vi.fn<() => void>();
    const { container } = render(<TransferReview amount={100n} currency="USD" recipient={{ name: 'Paypa‮l' }} knownPayees={['Paypal']} onConfirm={onConfirm} />);
    expect(screen.getByRole('alert').textContent).toContain('hidden direction controls');
    expect(container.querySelector('bdi')?.textContent).toBe('Paypal');
    const confirm = screen.getByRole('button', { name: 'Confirm and send' });
    expect(confirm.getAttribute('aria-disabled')).toBe('true');
    await userEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'I have checked the name and it is right' }));
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('hides a custom confirm control while a risky name is unacknowledged, and renders on the server', () => {
    render(<TransferReview amount={100n} currency="USD" recipient={{ name: 'PаyPal' }} confirm={<button type="button">Hold</button>} />);
    expect(screen.queryByRole('button', { name: 'Hold' })).toBeNull();
    expect(renderToString(<TransferReview amount={100n} currency="USD" recipient={{ name: 'Ram' }} />)).toContain('Check before you send');
  });
});

describe('PayeeVerification', () => {
  it('is quiet on a match', async () => {
    const { container } = render(<PayeeVerification result="match" enteredName="Sita Sharma" />);
    expect(screen.getByRole('status').textContent).toContain('matches');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('offers the account name on a close match', async () => {
    const use = vi.fn<(name: string) => void>();
    const { container } = render(<PayeeVerification result="close-match" enteredName="Sita Sarma" accountName="Sita Sharma" onUseAccountName={use} onEdit={() => {}} />);
    expect(screen.getByRole('alert').textContent).toContain('close match');
    expect(container.textContent).toContain('The account is in the name "Sita Sharma"');
    await userEvent.click(screen.getByRole('button', { name: 'Use this name' }));
    expect(use).toHaveBeenCalledWith('Sita Sharma');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('needs an acknowledgement before continuing after no match', async () => {
    const proceed = vi.fn<() => void>();
    const { container } = render(<PayeeVerification result="no-match" enteredName="Sita Sharma" onProceed={proceed} onEdit={() => {}} />);
    const button = screen.getByRole('button', { name: 'Continue anyway' });
    await userEvent.click(button);
    expect(proceed).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(button);
    expect(proceed).toHaveBeenCalledTimes(1);
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('says when the name could not be checked, or is still being checked', () => {
    render(<PayeeVerification result="unavailable" enteredName="Ram" />);
    expect(screen.getByRole('alert').textContent).toContain('could not check');
    cleanup();
    render(<PayeeVerification result="checking" enteredName="Ram" />);
    expect(screen.getByRole('status').textContent).toContain('Checking');
  });
});

describe('HoldToConfirm', () => {
  it('confirms after a full hold by pointer, and cancels when released early', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn<() => void>();
    render(<HoldToConfirm onConfirm={onConfirm} holdMs={1000}>Send</HoldToConfirm>);
    const button = screen.getByRole('button', { name: 'Send, Press and hold to confirm' });
    fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
    act(() => { vi.advanceTimersByTime(400); });
    fireEvent.pointerUp(button);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('Released too early');
    fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
    act(() => { vi.advanceTimersByTime(1100); });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toBe('Confirmed');
  });
  it('works by holding Space, ignoring key repeat', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn<() => void>();
    render(<HoldToConfirm onConfirm={onConfirm} holdMs={600}>Close account</HoldToConfirm>);
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: ' ' });
    act(() => { vi.advanceTimersByTime(300); });
    fireEvent.keyDown(button, { key: ' ', repeat: true });
    act(() => { vi.advanceTimersByTime(400); });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(button, { key: ' ' });
  });
  it('cooling-off: unavailable with the time left, then works', async () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn<() => void>();
    const { container } = render(<HoldToConfirm mode="cooling-off" delaySeconds={3} onConfirm={onConfirm}>Send</HoldToConfirm>);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.textContent).toContain('available in 3 s');
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(3100); });
    expect(button.getAttribute('aria-disabled')).toBeNull();
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('refuses out-of-range timings', () => {
    expect(() => render(<HoldToConfirm onConfirm={() => {}} holdMs={100}>x</HoldToConfirm>)).toThrow(RangeError);
    expect(() => render(<HoldToConfirm onConfirm={() => {}} mode="cooling-off" delaySeconds={0}>x</HoldToConfirm>)).toThrow(RangeError);
  });
});

describe('SessionTimeoutWarning', () => {
  it('stays hidden until the warning window, then opens with focus on Stay signed in', async () => {
    vi.useFakeTimers();
    const start = Date.now();
    const onExpire = vi.fn<() => void>();
    render(<><button type="button">Before</button><SessionHost start={start} onExpire={onExpire} /></>);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    act(() => { vi.advanceTimersByTime(31_000); });
    const dialog = screen.getByRole('alertdialog', { name: 'Your session is about to end' });
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Stay signed in' }));
    expect(dialog.textContent).toContain('0:59');
    expect(dialog.textContent).toContain('59 seconds');
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.body.textContent).toContain('You have been signed out.');
    vi.useRealTimers();
  });
  it('announces only at marks, Esc extends, and passes axe', async () => {
    vi.useFakeTimers();
    const start = Date.now();
    const onExtend = vi.fn<() => void>();
    const { container } = render(<SessionHost start={start} onExpire={() => {}} onExtend={onExtend} />);
    act(() => { vi.advanceTimersByTime(45_000); });
    const live = container.querySelector('[aria-live]')!;
    expect(live.textContent).toContain('45 seconds');
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(live.textContent).toContain('45 seconds');
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(live.textContent).toContain('30 seconds');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onExtend).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('closes when the session is extended, and keeps a 20 second minimum warning', () => {
    vi.useFakeTimers();
    render(<Extending />);
    act(() => { vi.advanceTimersByTime(1000); });
    fireEvent.click(screen.getByRole('button', { name: 'Stay signed in' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    cleanup();
    const start = Date.now();
    render(<SessionTimeoutWarning expiresAt={start + 25_000} warnBefore={1000} onExtend={() => {}} onSignOut={() => {}} onExpire={() => {}} />);
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });
});

describe('ScamWarning', () => {
  it('names the scam, focuses the heading and makes cancel the primary action', async () => {
    const onCancel = vi.fn<() => void>();
    const { container } = render(<ScamWarning scenario="safe-account" onCancel={onCancel} help="Call 16600 123 456" />);
    const heading = screen.getByRole('heading', { name: 'Stop. This could be a scam.' });
    expect(document.activeElement).toBe(heading);
    expect(container.textContent).toContain('safe account');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Continue to payment' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel this payment' }));
    expect(onCancel).toHaveBeenCalled();
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('continuing needs the acknowledgement, then the cooling-off', async () => {
    const onProceed = vi.fn<() => void>();
    const { container } = render(<ScamWarning scenario="investment" onCancel={() => {}} onProceed={onProceed} coolingOffSeconds={2} />);
    const first = screen.getByRole('button', { name: 'Continue to payment' });
    fireEvent.click(first);
    expect(onProceed).not.toHaveBeenCalled();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('checkbox'));
    const cooled = screen.getByRole('button', { name: /Continue to payment/ });
    expect(cooled.getAttribute('aria-disabled')).toBe('true');
    act(() => { vi.advanceTimersByTime(2100); });
    fireEvent.click(cooled);
    expect(onProceed).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('takes custom copy', () => {
    render(<ScamWarning scenario="purchase" copy={{ summary: 'Custom words', questions: [] }} onCancel={() => {}} />);
    expect(screen.getByText('Custom words')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });
});

describe('SecureField', () => {
  it('sets autocomplete, masks, and never puts the value anywhere but the input', async () => {
    const log = vi.spyOn(console, 'log');
    const { container } = render(<SecretHost kind="current-password" />);
    const input = screen.getByLabelText('Secret') as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBe('current-password');
    expect(input.type).toBe('password');
    expect(input.getAttribute('spellcheck')).toBe('false');
    expect(input.getAttribute('autocapitalize')).toBe('none');
    await userEvent.type(input, 'hunter2');
    expect(input.value).toBe('hunter2');
    expect(container.innerHTML).not.toContain('hunter2');
    expect(log).not.toHaveBeenCalled();
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('reveals on request and hides again on blur and after the timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<SecretHost kind="current-password" />);
    const input = screen.getByLabelText('Secret') as HTMLInputElement;
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(input.type).toBe('text');
    act(() => { vi.advanceTimersByTime(31_000); });
    expect(input.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    fireEvent.blur(input);
    expect(input.type).toBe('password');
  });
  it('uses the one-time-code token and numeric keyboard; account numbers get no autofill', () => {
    render(<SecretHost kind="one-time-code" />);
    const otp = screen.getByLabelText('Secret');
    expect(otp.getAttribute('autocomplete')).toBe('one-time-code');
    expect(otp.getAttribute('inputmode')).toBe('numeric');
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();
    render(<SecretHost kind="account-number" />);
    expect(screen.getByLabelText('Secret').getAttribute('autocomplete')).toBe('off');
  });
});
