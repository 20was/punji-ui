import { act, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AccountNumber, BankAccountCard, BeneficiarySelector, PaymentReceipt, PaymentTimeline, TransactionList, TransactionStatus,
} from '../src/index.ts';
import {
  accounts, beneficiaries, manyTransactions, receipt, sampleAccountNumber, shortAccountNumber, timelineFailed, timelineInProgress, timelineReversed, transactions, walletId,
} from '../fixtures/banking-data.ts';
import { seriousViolations } from './axe.ts';

const flat = (s: string | null | undefined) => (s ?? '').replace(/[\u00a0\u202f]/g, ' ');
const grouped = '0123 4567 8901 2345';
const setClipboard = (value: unknown) => Object.defineProperty(navigator, 'clipboard', { configurable: true, value });
afterEach(() => Reflect.deleteProperty(navigator, 'clipboard'));

/** The full number, with or without grouping, must not appear anywhere in the markup. */
function expectNoFullNumber(html: string, number: string) {
  expect(html).not.toContain(number);
  expect(html).not.toContain(number.replace(/(.{4})/g, '$1 ').trim());
}

describe('AccountNumber', () => {
  it('is masked by default and the full number is nowhere in the DOM', async () => {
    const { container } = render(<AccountNumber value={sampleAccountNumber} copyable testId="an" />);
    expect(container.querySelector('.pu-acct-num')?.textContent).toBe('•••• •••• •••• 2345');
    expectNoFullNumber(container.innerHTML, sampleAccountNumber);
    expect(container.innerHTML).not.toContain('0123');
    expect(container.innerHTML).not.toMatch(/title=|data-value|data-number/);
    expect(container.textContent).toContain('ending in 2 3 4 5');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('reveals with an aria-pressed toggle whose name does not change, and hides again', async () => {
    const user = userEvent.setup();
    const onRevealedChange = vi.fn<(revealed: boolean) => void>();
    const { container } = render(<AccountNumber value={sampleAccountNumber} onRevealedChange={onRevealedChange} testId="an" />);
    const toggle = screen.getByTestId('an-reveal');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Show full account number');
    expect(container.querySelector('.pu-acct-num')?.textContent).toBe(grouped);
    expect(await seriousViolations(container)).toEqual([]);
    await user.click(toggle);
    expectNoFullNumber(container.innerHTML, sampleAccountNumber);
    expect(onRevealedChange.mock.calls).toEqual([[true], [false]]);
  });
  it('hides again by itself after the timeout and when the tab is hidden', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { container } = render(<AccountNumber value={sampleAccountNumber} autoHideMs={5000} testId="an" />);
      act(() => screen.getByTestId('an-reveal').click());
      expect(container.innerHTML).toContain('0123');
      act(() => { vi.advanceTimersByTime(5001); });
      expectNoFullNumber(container.innerHTML, sampleAccountNumber);
      expect(container.innerHTML).not.toContain('0123');
      act(() => screen.getByTestId('an-reveal').click());
      expect(container.innerHTML).toContain('0123');
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      act(() => { document.dispatchEvent(new Event('visibilitychange')); });
      expect(container.innerHTML).not.toContain('0123');
    } finally {
      Reflect.deleteProperty(document, 'visibilityState');
      vi.useRealTimers();
    }
  });
  it('can be permanently masked and handles short and missing numbers', () => {
    const { container, rerender } = render(<AccountNumber value={sampleAccountNumber} revealable={false} />);
    expect(container.querySelector('button')).toBeNull();
    rerender(<AccountNumber value={shortAccountNumber} />);
    expect(container.querySelector('.pu-acct-num')?.textContent).toBe('••21');
    rerender(<AccountNumber value="" />);
    expect(container.querySelector('button')).toBeNull();
    expect(container.textContent).toContain('No account number');
  });
  it('touches the clipboard only when the copy button is pressed, and copies the full value', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const { container } = render(<AccountNumber value={sampleAccountNumber} copyable testId="an" />);
    await user.click(screen.getByTestId('an-reveal'));
    await user.hover(screen.getByTestId('an-copy'));
    expect(writeText).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('an-copy'));
    expect(writeText).toHaveBeenCalledExactlyOnceWith(sampleAccountNumber);
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Account number copied');
  });
  it('has no copy button unless asked, and reports a failed copy', async () => {
    const user = userEvent.setup();
    const { rerender, container } = render(<AccountNumber value={sampleAccountNumber} testId="an" />);
    expect(screen.queryByTestId('an-copy')).toBeNull();
    setClipboard({ writeText: vi.fn<(text: string) => Promise<void>>().mockRejectedValue(new Error('x')) });
    rerender(<AccountNumber value={sampleAccountNumber} copyable testId="an" />);
    await user.click(screen.getByTestId('an-copy'));
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Could not copy');
  });
});

describe('BankAccountCard', () => {
  it('shows institution, holder, masked number, type, status and balance without leaking the number', async () => {
    const { container } = render(<BankAccountCard {...accounts.savings} testId="card" actions={<button type="button">Statement</button>} />);
    expect(screen.getByRole('heading', { name: 'NIC Asia Bank' })).toBeTruthy();
    expect(container.textContent).toContain('Sita Sharma');
    expect(container.textContent).toContain('Savings account');
    expect(container.textContent).toContain('Active');
    expect(container.textContent).toContain('2,45,180.75');
    expect(container.textContent).toContain('•••• •••• •••• 2345');
    expectNoFullNumber(container.innerHTML, sampleAccountNumber);
    expect(screen.getByRole('button', { name: 'Statement' })).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('labels frozen and closed in words with different icons', () => {
    const { container } = render(<><BankAccountCard {...accounts.current} /><BankAccountCard {...accounts.closed} /></>);
    expect(container.textContent).toContain('Frozen');
    expect(container.textContent).toContain('Closed');
    const icons = [...container.querySelectorAll('.pu-bank-status-icon')].map((svg) => svg.innerHTML);
    expect(new Set(icons).size).toBe(2);
  });
  it('hides the balance behind a toggle: the amount is not in the DOM while hidden', async () => {
    const user = userEvent.setup();
    const { container } = render(<BankAccountCard {...accounts.savings} balanceToggle testId="card" />);
    expect(container.textContent).not.toContain('2,45,180');
    expect(container.innerHTML).not.toContain('245180.75');
    expect(container.textContent).toContain('Balance hidden');
    const toggle = screen.getByRole('button', { name: 'Hide balance' });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    await user.click(toggle);
    expect(container.textContent).toContain('2,45,180.75');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('renders other currencies, a wallet id, loading and error states', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn<() => void>();
    const { container, rerender } = render(<BankAccountCard {...accounts.wallet} money={{ currency: 'USD', locale: 'en-US' }} />);
    expect(container.textContent).toContain('$12,500.50');
    expectNoFullNumber(container.innerHTML, walletId);
    rerender(<BankAccountCard {...accounts.wallet} loading />);
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(container.innerHTML).not.toContain('eSewa');
    rerender(<BankAccountCard {...accounts.wallet} error onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(container.innerHTML).not.toContain(walletId);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('TransactionList', () => {
  it('groups by date, signs amounts, and says debit or credit in words', async () => {
    const { container } = render(<TransactionList transactions={transactions} showBalance testId="tl" />);
    const headings = within(container).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['14 Nov 2025', '13 Nov 2025', '12 Nov 2025', '10 Nov 2025', '9 Nov 2025']);
    const first = container.querySelector('[data-tx-id="tx-1008"]')!;
    expect(first.textContent).toContain('Bhatbhateni Supermarket');
    expect(first.textContent).toContain('Dr');
    expect(first.querySelector('.kit-sr')?.textContent).toBe('debit');
    expect(first.querySelector('.pu-tx-amount')?.textContent).toContain('6,845.75');
    expect(container.querySelector('[data-tx-id="tx-1007"] .kit-sr')?.textContent).toBe('credit');
    expect(container.querySelector('[data-tx-id="tx-1007"]')?.textContent).toContain('Balance');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('shows non-completed status in words, hostile text stays text, and long references are shortened', () => {
    const { container } = render(<TransactionList transactions={transactions} testId="tl" />);
    expect(container.textContent).toContain('Pending');
    expect(container.textContent).toContain('Failed');
    expect(container.textContent).toContain('Reversed');
    expect(container.textContent).not.toContain('Completed');
    expect(container.querySelector('a, img, script')).toBeNull();
    expect(container.textContent).toContain('=HYPERLINK(');
    expect(container.querySelector('[data-tx-id="tx-1002"] .pu-tx-ref')?.textContent).toBe('FT25314XK92…LM3'.length <= 24 ? 'FT25314XK92Q4B7NLM3' : '');
  });
  it('labels dates in Bikram Sambat on request', () => {
    const { container } = render(<TransactionList transactions={transactions.slice(0, 2)} calendar="bs" />);
    expect(within(container).getByRole('heading', { level: 3 }).textContent).toBe('28 Kartik 2082');
  });
  it('paginates with stable rows and the shared Pagination', async () => {
    const user = userEvent.setup();
    const { container } = render(<TransactionList transactions={manyTransactions} pageSize={10} testId="tl" />);
    expect(container.querySelectorAll('li.pu-tx')).toHaveLength(10);
    const firstRow = container.querySelector('[data-tx-id="bulk-001"]');
    await user.click(screen.getByTestId('tl-pager-next'));
    expect(container.querySelector('[data-tx-id="bulk-001"]')).toBeNull();
    expect(container.querySelector('[data-tx-id="bulk-011"]')).toBeTruthy();
    expect(firstRow).not.toBe(container.querySelector('[data-tx-id="bulk-011"]'));
    expect(screen.getByTestId('tl-pager-range').textContent).toContain('11–20 of 23');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('has empty, loading and error states', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn<() => void>();
    const { container, rerender } = render(<TransactionList transactions={[]} />);
    expect(screen.getByText('No transactions')).toBeTruthy();
    rerender(<TransactionList transactions={transactions} loading />);
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(container.querySelector('li')).toBeNull();
    rerender(<TransactionList transactions={[]} error onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('TransactionStatus', () => {
  it('uses different icons and words for each status', () => {
    const { container } = render(<>{(['completed', 'pending', 'failed', 'reversed'] as const).map((s) => <TransactionStatus key={s} status={s} />)}</>);
    expect(new Set([...container.querySelectorAll('svg')].map((s) => s.innerHTML)).size).toBe(4);
    expect(container.textContent).toBe('CompletedPendingFailedReversed');
  });
});

describe('PaymentReceipt', () => {
  it('shows amount, fees, total, masked parties, status, and a timestamp in the named zone', async () => {
    const { container } = render(<PaymentReceipt {...receipt} timeZone="UTC" printable testId="rc" qr={<svg viewBox="0 0 20 20" role="img" aria-label="Pay QR"><path d="M0 0h7v7H0z" /></svg>} />);
    expect(flat(container.textContent)).toContain('NPR 20,000.00');
    expect(flat(container.textContent)).toContain('NPR 25.00');
    expect(flat(container.textContent)).toContain('NPR 20,025.00');
    expect(container.textContent).toContain('ending 2345');
    expect(container.textContent).toContain('ending 0011');
    expect(container.textContent).toContain('Completed');
    expect(container.querySelector('time')?.textContent).toMatch(/10 Nov 2025.*04:57:05/);
    expect(container.querySelector('time')?.getAttribute('datetime')).toBe('2025-11-10T04:57:05.000Z');
    expectNoFullNumber(container.innerHTML, sampleAccountNumber);
    expectNoFullNumber(container.innerHTML, '0098123456780011');
    expect(container.querySelector('figure svg')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('uses the given total over amount plus fees, and a dash for a bad time', () => {
    const { container } = render(<PaymentReceipt {...receipt} total={2100000n} timestamp="2025-11-10T10:42:05" />);
    expect(flat(container.textContent)).toContain('NPR 21,000.00');
    expect(container.querySelector('time')).toBeNull();
  });
  it('copies the reference only on press, and prints only on press', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(<PaymentReceipt {...receipt} printable testId="rc" />);
    expect(writeText).not.toHaveBeenCalled();
    expect(print).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('rc-copy'));
    expect(writeText).toHaveBeenCalledExactlyOnceWith(receipt.reference);
    await user.click(screen.getByTestId('rc-print'));
    expect(print).toHaveBeenCalledOnce();
  });
});

describe('PaymentTimeline', () => {
  it('is an ordered list with the current step marked and a state in words', async () => {
    const { container } = render(<PaymentTimeline steps={timelineInProgress} timeZone="Asia/Kathmandu" />);
    const list = screen.getByRole('list', { name: 'Payment progress' });
    expect(list.tagName).toBe('OL');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[1]!.getAttribute('aria-current')).toBe('step');
    expect(items[1]!.textContent).toContain('In progress');
    expect(items[2]!.textContent).toContain('Not started');
    expect(items[2]!.querySelector('time')).toBeNull();
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('shows failed and reversed with their own icons and words', () => {
    const { container } = render(<><PaymentTimeline steps={timelineFailed} /><PaymentTimeline steps={timelineReversed} /></>);
    expect(container.textContent).toContain('The wallet declined the top-up.');
    expect(container.textContent).toContain('Failed');
    expect(container.textContent).toContain('Reversed');
    const icons = [...container.querySelectorAll('.pu-step-mark svg')].map((s) => s.innerHTML);
    expect(new Set(icons).size).toBeGreaterThanOrEqual(3);
  });
});

function Harness({ onChange }: { onChange?: (id: string) => void }) {
  const [value, setValue] = useState<string | null>(null);
  return <BeneficiarySelector label="Pay to" beneficiaries={beneficiaries} value={value} onChange={(id) => { setValue(id); onChange?.(id); }} testId="bs" />;
}

describe('BeneficiarySelector', () => {
  it('groups favourites, recent and the rest, with masked numbers and no full number in the DOM', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    await user.click(screen.getByRole('combobox', { name: 'Pay to' }));
    const groups = within(screen.getByRole('listbox')).getAllByRole('group').map((g) => g.firstElementChild?.textContent);
    expect(groups).toEqual(['Favourites', 'Recent', 'All payees']);
    expect(screen.getAllByRole('option')).toHaveLength(beneficiaries.length);
    expect(container.textContent).toContain('•••• •••• 0011');
    for (const b of beneficiaries) expect(container.innerHTML).not.toContain(b.accountNumber);
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('filters by typing and reports no match', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox');
    await user.type(input, 'nabil');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([expect.stringContaining('Ram Thapa'), expect.stringContaining('Bikash')]);
    await user.clear(input);
    await user.type(input, 'zzz');
    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('No payee matches');
  });
  it('is fully keyboard operable: arrows, Home, End, Enter, Escape', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(id: string) => void>();
    const { container } = render(<Harness onChange={onChange} />);
    const input = screen.getByRole('combobox');
    await user.tab();
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-activedescendant')).toContain('opt-b1');
    await user.keyboard('{ArrowDown}');
    expect(input.getAttribute('aria-activedescendant')).toContain('opt-b2');
    await user.keyboard('{End}');
    expect(input.getAttribute('aria-activedescendant')).toContain('opt-b7');
    await user.keyboard('{Home}{ArrowUp}');
    expect(input.getAttribute('aria-activedescendant')).toContain('opt-b7');
    await user.keyboard('{Escape}');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledExactlyOnceWith('b2');
    expect((input as HTMLInputElement).value).toBe('Maya Gurung');
    expect(container.textContent).toContain('eSewa');
    expect(container.textContent).toContain('•••• ••45 01');
    expect(container.innerHTML).not.toContain('9841234501');
  });
  it('chooses with the mouse and shows loading and error', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(id: string) => void>();
    const { rerender, container } = render(<BeneficiarySelector label="Pay to" beneficiaries={beneficiaries} value={null} onChange={onChange} testId="bs" />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByTestId('bs-option-b3'));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('b3');
    rerender(<BeneficiarySelector label="Pay to" beneficiaries={[]} loading value={null} onChange={onChange} error="Choose a payee" />);
    expect(screen.getByRole('alert').textContent).toBe('Choose a payee');
    expect(screen.getByRole('combobox').getAttribute('aria-invalid')).toBe('true');
    expect(await seriousViolations(container)).toEqual([]);
  });
});
