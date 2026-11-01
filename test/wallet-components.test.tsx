import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AmountKeypad, MobileNumberInput, PaymentQrCard, PinPad, QrCode, buildMerchantQr, nepalMoneyConfig,
  type AmountKeypadChange, type MerchantQrInput, type NepalMobileResult,
} from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

const merchant: MerchantQrInput = {
  merchantAccounts: [{ id: '26', guid: 'np.com.example', fields: { '01': 'M1234567' } }],
  merchantName: 'Himalayan Momo',
  merchantCity: 'Kathmandu',
};

describe('QrCode', () => {
  it('is a named image drawn in one path, and renders on the server', () => {
    render(<QrCode value="hello" label="QR code to pay Himalayan Momo" testId="qr" />);
    const svg = screen.getByRole('img', { name: 'QR code to pay Himalayan Momo' });
    expect(svg.getAttribute('viewBox')).toBe('0 0 29 29');
    expect(svg.querySelectorAll('path')).toHaveLength(1);
    expect(svg.getAttribute('data-version')).toBe('1');
    expect(renderToString(<QrCode value="hello" />)).toContain('role="img"');
  });
  it('keeps dark modules on a light background, with an optional transparent background', () => {
    const { container } = render(<QrCode value="x" background="transparent" margin={2} />);
    expect(container.querySelector('rect')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 25 25');
    expect(() => render(<QrCode value="x" margin={-1} />)).toThrow(RangeError);
  });
});

describe('PaymentQrCard', () => {
  it('shows what the payload says: merchant, city and amount', async () => {
    const payload = buildMerchantQr({ ...merchant, amount: 125050n });
    const { container } = render(<PaymentQrCard payload={payload} />);
    const card = screen.getByRole('article', { name: 'Scan to pay' });
    expect(within(card).getByText('Himalayan Momo')).toBeTruthy();
    expect(within(card).getByText('Kathmandu')).toBeTruthy();
    expect(card.textContent).toContain('1,250.50');
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^QR code to pay Himalayan Momo .*1,250\.50/);
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('refuses to draw a payload that fails its CRC', () => {
    const payload = buildMerchantQr(merchant);
    render(<PaymentQrCard payload={`${payload.slice(0, -4)}0000`} />);
    expect(screen.getByRole('alert').textContent).toContain('cannot be shown');
    expect(screen.queryByRole('img')).toBeNull();
  });
  it('hides an expired code and offers a new one', async () => {
    const onRefresh = vi.fn();
    render(<PaymentQrCard payload={buildMerchantQr(merchant)} state="expired" onRefresh={onRefresh} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('expired');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Get a new code' }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });
  it('shows a busy placeholder while loading', () => {
    render(<PaymentQrCard payload="" state="loading" />);
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
  });
  it('lets the payee add, change and remove an amount on a static code', async () => {
    const user = userEvent.setup();
    function Host() {
      const [amount, setAmount] = useState<bigint | null>(null);
      return <PaymentQrCard payload={buildMerchantQr({ ...merchant, amount })} onAmountChange={setAmount} />;
    }
    render(<Host />);
    expect(screen.getByText('The payer enters the amount')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Add amount' }));
    const input = screen.getByRole('textbox', { name: /Amount/ });
    expect(document.activeElement).toBe(input);
    expect((screen.getByRole('button', { name: 'Show code' }) as HTMLButtonElement).disabled).toBe(true);
    await user.type(input, '500');
    await user.click(screen.getByRole('button', { name: 'Show code' }));
    expect(screen.getByRole('article').textContent).toContain('500.00');
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('500.00');
    await user.click(screen.getByRole('button', { name: 'Remove amount' }));
    expect(screen.getByText('The payer enters the amount')).toBeTruthy();
  });
  it('accepts a custom renderer, a display name and actions', () => {
    const renderQr = vi.fn((_payload: string, label: string) => <img alt={label} src="data:," />);
    render(<PaymentQrCard payload={buildMerchantQr(merchant)} merchantName="हिमालयन मम" detail="Counter 2" renderQr={renderQr} actions={<button type="button">Share</button>} footer="Pay with any NepalPay app" money={nepalMoneyConfig()} />);
    expect(renderQr).toHaveBeenCalled();
    expect(screen.getByText('हिमालयन मम')).toBeTruthy();
    expect(screen.getByText('Counter 2')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();
    expect(screen.getByText('Pay with any NepalPay app')).toBeTruthy();
  });
});

function Keypad(props: { max?: bigint; quick?: bigint[]; onChange?: (c: AmountKeypadChange) => void; deva?: boolean; currency?: string }) {
  const [value, setValue] = useState('');
  return (
    <AmountKeypad
      currency={props.currency ?? 'NPR'}
      locale="en-IN"
      value={value}
      onValueChange={(c) => { setValue(c.value); props.onChange?.(c); }}
      max={props.max}
      quickAmounts={props.quick}
      digits={props.deva ? 'deva' : undefined}
      hint="Balance NPR 25,000"
      testId="kp"
    />
  );
}

describe('AmountKeypad', () => {
  it('builds an exact amount from key presses and reports minor units', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<Keypad onChange={onChange} />);
    for (const key of ['1', '2', '3', '4', '5', '6', '.', '5']) await user.click(container.querySelector(`[data-key="${key}"]`)!);
    expect(onChange).toHaveBeenLastCalledWith({ value: '123456.5', minorUnits: 12345650n, state: 'valid' });
    const figure = container.querySelector('output')!;
    expect(figure.textContent).toContain('1,23,456.5');
    await user.click(screen.getByRole('button', { name: 'Delete last digit' }));
    expect(onChange).toHaveBeenLastCalledWith({ value: '123456.', minorUnits: 12345600n, state: 'partial' });
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('refuses a third decimal and an amount above max, and says why', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<Keypad max={100000n} onChange={onChange} />);
    const press = (k: string) => user.click(container.querySelector(`[data-key="${k}"]`)!);
    await press('.');
    expect(onChange).toHaveBeenLastCalledWith({ value: '0.', minorUnits: 0n, state: 'partial' });
    await press('5'); await press('5'); await press('5');
    expect(onChange).toHaveBeenLastCalledWith({ value: '0.55', minorUnits: 55n, state: 'valid' });
    expect(screen.getAllByRole('status').some((s) => s.textContent === 'Only 2 digits after the point.')).toBe(true);
    onChange.mockClear();
    await user.click(screen.getByRole('button', { name: 'Delete last digit' }));
    await user.click(screen.getByRole('button', { name: 'Delete last digit' }));
    await user.click(screen.getByRole('button', { name: 'Delete last digit' }));
    await user.click(screen.getByRole('button', { name: 'Delete last digit' }));
    for (const k of ['1', '0', '0', '0']) await press(k);
    expect(onChange).toHaveBeenLastCalledWith({ value: '1000', minorUnits: 100000n, state: 'valid' });
    await press('1');
    expect(onChange).toHaveBeenLastCalledWith({ value: '1000', minorUnits: 100000n, state: 'valid' });
    expect(screen.getAllByRole('status').some((s) => s.textContent?.startsWith('The most you can enter is'))).toBe(true);
  });
  it('is one Tab stop with arrow-key movement and accepts typed digits', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<Keypad onChange={onChange} />);
    await user.tab();
    expect(document.activeElement?.getAttribute('data-key')).toBe('1');
    await user.keyboard('{ArrowRight}{ArrowDown}');
    expect(document.activeElement?.getAttribute('data-key')).toBe('5');
    await user.keyboard('{End}');
    expect(document.activeElement?.getAttribute('data-key')).toBe('0');
    await user.keyboard('42');
    expect(onChange).toHaveBeenLastCalledWith({ value: '42', minorUnits: 4200n, state: 'valid' });
    fireEvent.keyDown(container.querySelector('.pu-keypad')!, { key: '७' });
    expect(onChange).toHaveBeenLastCalledWith({ value: '427', minorUnits: 42700n, state: 'valid' });
    await user.keyboard('{Escape}');
    expect(onChange).toHaveBeenLastCalledWith({ value: '', minorUnits: null, state: 'empty' });
    expect(container.querySelectorAll('.pu-keypad-key[tabindex="0"]')).toHaveLength(1);
  });
  it('quick amounts set the whole amount and respect max', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Keypad quick={[10000n, 50000n, 200000n]} max={100000n} onChange={onChange} />);
    const chip = screen.getByRole('button', { name: /Set amount to .*500\.00/ });
    await user.click(chip);
    expect(onChange).toHaveBeenLastCalledWith({ value: '500', minorUnits: 50000n, state: 'valid' });
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByRole('button', { name: /2,000\.00/ }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('shows Devanagari key faces and has no decimal key for a zero-exponent currency', () => {
    const { container } = render(<Keypad deva currency="JPY" />);
    expect(container.querySelector('[data-key="7"]')?.textContent).toBe('७');
    expect(container.querySelector('[data-key="."]')).toBeNull();
  });
});

function Pin(props: { onComplete?: (pin: string) => void; shuffle?: boolean; random?: () => number; shuffleKey?: number; error?: string }) {
  const [pin, setPin] = useState('');
  return <PinPad label="Enter your 4-digit PIN" value={pin} onChange={setPin} onComplete={props.onComplete} shuffle={props.shuffle} random={props.random} shuffleKey={props.shuffleKey} error={props.error} testId="pin" />;
}

describe('PinPad', () => {
  it('shows dots and progress, never the digits', async () => {
    const user = userEvent.setup();
    const first = render(<Pin />);
    for (const k of ['1', '9', '7', '3']) await user.click(first.container.querySelector(`[data-key="${k}"]`)!);
    // Ids from useId differ between mounts; everything else must be identical for two different PINs.
    const markup = (c: HTMLElement) => c.innerHTML.replace(/_r_\w+_/g, 'id');
    const afterA = markup(first.container);
    first.unmount();
    const second = render(<Pin />);
    for (const k of ['5', '5', '0', '2']) await user.click(second.container.querySelector(`[data-key="${k}"]`)!);
    expect(markup(second.container)).toBe(afterA);
    expect(second.container.querySelectorAll('[data-filled="true"]')).toHaveLength(4);
    expect(screen.getByRole('status').textContent).toBe('4 of 4 digits entered');
    expect(second.container.querySelector('input')).toBeNull();
  });
  it('calls onComplete once and ignores keys after the last digit', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const { container } = render(<Pin onComplete={onComplete} />);
    await user.tab();
    await user.keyboard('12345');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('1234');
    await user.keyboard('{Backspace}');
    expect(container.querySelectorAll('[data-filled="true"]')).toHaveLength(3);
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('shuffles the keys with the random source and reshuffles on shuffleKey', () => {
    const order = (c: HTMLElement) => [...c.querySelectorAll('.pu-keypad-key[data-key]')].map((b) => b.getAttribute('data-key')).filter((k) => k !== 'backspace').join('');
    const { container, rerender } = render(<Pin shuffle random={() => 0} />);
    // Math.floor(0 * (i + 1)) = 0 swaps each position with the first: a fixed, non-ordered permutation.
    expect(order(container)).toBe('2345678901');
    expect(order(container).split('').toSorted().join('')).toBe('0123456789');
    let calls = 0;
    rerender(<Pin shuffle random={() => (calls++ % 2 ? 0.99 : 0.5)} shuffleKey={1} />);
    expect(order(container)).not.toBe('2345678901');
  });
  it('announces an error', () => {
    render(<Pin error="Wrong PIN. 2 attempts left." />);
    expect(screen.getByRole('alert').textContent).toBe('Wrong PIN. 2 attempts left.');
    expect(screen.getByTestId('pin').getAttribute('data-invalid')).toBe('true');
  });
  it('rejects a length outside 4 to 8', () => {
    expect(() => render(<PinPad label="PIN" length={3} />)).toThrow(RangeError);
  });
});

function Mobile(props: { onResult?: (r: NepalMobileResult) => void }) {
  const [value, setValue] = useState('');
  return <MobileNumberInput label="Mobile number" value={value} onValueChange={(r) => { setValue(r.national); props.onResult?.(r); }} hint="We send the top-up to this number" />;
}

describe('MobileNumberInput', () => {
  it('groups the digits, names the operator and announces it', async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    const { container } = render(<Mobile onResult={onResult} />);
    const input = screen.getByRole('textbox', { name: 'Mobile number' }) as HTMLInputElement;
    await user.type(input, '9801234567');
    expect(input.value).toBe('980-1234567');
    expect(onResult).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'valid', e164: '+9779801234567', operator: expect.objectContaining({ id: 'ncell' }) }));
    expect(container.querySelector('.pu-mobile-input-operator')?.textContent).toBe('Ncell');
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('Operator: Ncell');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('accepts a pasted international number and refuses letters and an 11th digit', async () => {
    const user = userEvent.setup();
    render(<Mobile />);
    const input = screen.getByRole('textbox', { name: 'Mobile number' }) as HTMLInputElement;
    await user.click(input);
    await user.paste('+977 9851234567');
    expect(input.value).toBe('985-1234567');
    await user.type(input, '8');
    expect(input.value).toBe('985-1234567');
    await user.clear(input);
    await user.type(input, '98x');
    expect(input.value).toBe('98');
  });
  it('explains an incomplete or unknown number after the field is left', async () => {
    const user = userEvent.setup();
    render(<Mobile />);
    const input = screen.getByRole('textbox', { name: 'Mobile number' });
    await user.type(input, '98412');
    expect(screen.queryByRole('alert')).toBeNull();
    await act(async () => { input.blur(); });
    expect(screen.getByRole('alert').textContent).toBe('Enter a 10-digit mobile number starting with 9.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    await user.clear(input);
    await user.type(input, '990');
    await act(async () => { input.blur(); });
    expect(screen.getByRole('alert').textContent).toContain('990 is not a Nepal mobile prefix');
  });
  it('shows Devanagari digits while keeping the value ASCII', async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    function Deva() {
      const [value, setValue] = useState('');
      return <MobileNumberInput label="मोबाइल नम्बर" digits="deva" value={value} onValueChange={(r) => { setValue(r.national); onResult(r); }} />;
    }
    render(<Deva />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, '९८४१');
    expect(input.value).toBe('९८४-१');
    expect(onResult).toHaveBeenLastCalledWith(expect.objectContaining({ national: '9841' }));
  });
});
