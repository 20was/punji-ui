import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CurrencyInput, MoneyDisplay, PriceChange, nepalMoneyConfig, type CurrencyInputChange } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const flat = (s: string | null | undefined) => (s ?? '').replace(/[  ]/g, ' ');

describe('MoneyDisplay', () => {
  it('shows the amount and speaks the currency name for a shared symbol', async () => {
    const { container } = render(<MoneyDisplay value={123456n} currency="AUD" locale="en-US" testId="m" />);
    const el = screen.getByTestId('m');
    expect(el.tagName).toBe('DATA');
    expect(el.getAttribute('value')).toBe('1234.56');
    expect(el.querySelector('[aria-hidden="true"]')?.textContent).toBe('A$1,234.56');
    expect(el.querySelector('.kit-sr')?.textContent).toBe('1,234.56 Australian dollars');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('adds no duplicate speech when the symbol is unique', () => {
    render(<MoneyDisplay value="12.5" currency="EUR" locale="en" testId="m" />);
    expect(screen.getByTestId('m').textContent).toBe('€12.50');
    expect(screen.getByTestId('m').querySelector('.kit-sr')).toBeNull();
  });
  it('prints negative amounts in accounting style', () => {
    render(<MoneyDisplay value={-250n} currency="USD" accounting testId="m" />);
    expect(screen.getByTestId('m').querySelector('[aria-hidden]')?.textContent).toBe('($2.50)');
    expect(screen.getByTestId('m').querySelector('.kit-sr')?.textContent).toBe('-2.50 US dollars');
    expect(screen.getByTestId('m').dataset.sign).toBe('negative');
  });
  it('uses the Nepal preset with lakh grouping and optional Devanagari digits', () => {
    const { rerender } = render(<MoneyDisplay value={123456789n} preset={nepalMoneyConfig()} testId="m" />);
    expect(flat(screen.getByTestId('m').textContent)).toBe('NPR 12,34,567.89');
    rerender(<MoneyDisplay value={123456789n} preset={nepalMoneyConfig({ language: 'ne', digits: 'deva' })} testId="m" />);
    expect(flat(screen.getByTestId('m').textContent)).toContain('१२,३४,५६७.८९');
  });
  it('compact keeps the exact amount for assistive tech', () => {
    render(<MoneyDisplay value={12345678900n} preset={nepalMoneyConfig()} compact testId="m" />);
    expect(flat(screen.getByTestId('m').querySelector('[aria-hidden]')?.textContent)).toBe('NPR 12.35 Cr');
    expect(flat(screen.getByTestId('m').querySelector('.kit-sr')?.textContent)).toBe('NPR 12,34,56,789.00');
  });
  it('a missing or invalid value is a dash, never zero', async () => {
    const { container } = render(<><MoneyDisplay value={null} currency="USD" testId="a" /><MoneyDisplay value="1.234" currency="USD" testId="b" /></>);
    for (const id of ['a', 'b']) {
      expect(screen.getByTestId(id).textContent).toBe('—No value');
      expect(screen.getByTestId(id).querySelector('[aria-hidden]')?.textContent).toBe('—');
    }
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('requires a currency', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<MoneyDisplay value={1n} />)).toThrow(RangeError);
  });
});

describe('PriceChange', () => {
  it('conveys direction by sign, arrow and spoken word', async () => {
    const { container } = render(<PriceChange current={10550n} previous={10000n} currency="USD" testId="c" />);
    const el = screen.getByTestId('c');
    expect(el.dataset.tone).toBe('up');
    expect(el.querySelector('[aria-hidden="true"]:not(svg)')?.textContent).toBe('+5.50 (+5.50%)');
    expect(el.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('.kit-sr')?.textContent).toBe('up 5.50 (5.50%)');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('down and flat', () => {
    render(<><PriceChange current={9000n} previous={10000n} currency="USD" testId="d" /><PriceChange current={500n} previous={500n} currency="USD" testId="f" /></>);
    expect(screen.getByTestId('d').querySelector('[aria-hidden="true"]:not(svg)')?.textContent).toBe('-10.00 (-10.00%)');
    expect(screen.getByTestId('d').querySelector('.kit-sr')?.textContent).toBe('down 10.00 (10.00%)');
    expect(screen.getByTestId('f').dataset.tone).toBe('flat');
    expect(screen.getByTestId('f').querySelector('.kit-sr')?.textContent).toBe('unchanged 0.00 (0.00%)');
  });
  it('omits the percent when the base is zero and keeps the absolute change exact', () => {
    render(<PriceChange current={12345678901234567890n} previous={0n} currency="USD" testId="z" />);
    expect(screen.getByTestId('z').querySelector('.kit-sr')?.textContent).toBe('up 123,456,789,012,345,678.90');
  });
  it('red-up is a data attribute, not a different meaning', () => {
    render(<PriceChange current={2n} previous={1n} currency="JPY" convention="red-up" showPercent={false} testId="r" />);
    expect(screen.getByTestId('r').dataset.convention).toBe('red-up');
    expect(screen.getByTestId('r').querySelector('[aria-hidden="true"]:not(svg)')?.textContent).toBe('+1');
  });
  it('shows a dash when a price is missing', () => {
    render(<PriceChange current={null} previous={1n} currency="USD" testId="m" />);
    expect(screen.getByTestId('m').textContent).toBe('—No value');
  });
  it('uses the currency display, locale and numbering system', () => {
    render(<PriceChange current={150n} previous={100n} currency="EUR" locale="de-DE" display="symbol" testId="e" />);
    expect(flat(screen.getByTestId('e').querySelector('[aria-hidden="true"]:not(svg)')?.textContent)).toBe('+0,50 € (+50,00 %)');
  });
});

function Harness({ onChange, ...props }: Partial<React.ComponentProps<typeof CurrencyInput>> & { onChange?: (c: CurrencyInputChange) => void }) {
  const [value, setValue] = useState('');
  return <CurrencyInput label="Amount" currency="USD" {...props} value={value} onValueChange={(c) => { setValue(c.value); onChange?.(c); }} hint="Per share" testId="ci" />;
}

describe('CurrencyInput', () => {
  it('has a label that names the currency, a hint, and passes axe', async () => {
    const { container } = render(<Harness />);
    const input = screen.getByRole('textbox', { name: /^Amount \(US Dollar\)$/ });
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByText('Per share').id);
    expect(input.getAttribute('inputmode')).toBe('decimal');
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('wires the error', async () => {
    const { container } = render(<CurrencyInput label="Amount" currency="USD" value="" onValueChange={() => {}} error="Enter an amount" />);
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('groups as you type and reports exact minor units', async () => {
    const user = userEvent.setup();
    const changes: CurrencyInputChange[] = [];
    render(<Harness onChange={(c) => changes.push(c)} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, '1234567.89');
    expect(input.value).toBe('1,234,567.89');
    expect(changes.at(-1)).toEqual({ value: '1234567.89', minorUnits: 123456789n, state: 'valid' });
  });
  it('groups lakh and crore and accepts Devanagari digits', async () => {
    const user = userEvent.setup();
    const changes: CurrencyInputChange[] = [];
    render(<Harness {...nepalMoneyConfig({ digits: 'deva' })} preset={undefined} currency="NPR" locale="en-IN" numberingSystem="deva" onChange={(c) => changes.push(c)} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, '१२३४५६७');
    expect(input.value).toBe('१२,३४,५६७');
    expect(changes.at(-1)).toEqual({ value: '1234567', minorUnits: 123456700n, state: 'valid' });
  });
  it('refuses more fraction digits than the currency has and non-numeric keys', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, '1.999abc');
    expect(input.value).toBe('1.99');
  });
  it('JPY has no decimal point and a numeric keyboard', async () => {
    const user = userEvent.setup();
    render(<Harness currency="JPY" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.getAttribute('inputmode')).toBe('numeric');
    await user.type(input, '1234.5');
    expect(input.value).toBe('12,345');
  });
  it('KWD allows three fraction digits', async () => {
    const user = userEvent.setup();
    const changes: CurrencyInputChange[] = [];
    render(<Harness currency="KWD" onChange={(c) => changes.push(c)} />);
    await user.type(screen.getByRole('textbox'), '1.2345');
    expect(changes.at(-1)).toEqual({ value: '1.234', minorUnits: 1234n, state: 'valid' });
  });
  it('de-DE uses a comma decimal and dot grouping', async () => {
    const user = userEvent.setup();
    render(<Harness currency="EUR" locale="de-DE" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, '1234,5');
    expect(input.value).toBe('1.234,5');
  });
  it('rejects a minus unless negative is allowed', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness />);
    await user.type(screen.getByRole('textbox'), '-5');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('5');
    unmount();
    render(<Harness allowNegative />);
    await user.type(screen.getByRole('textbox'), '-5');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('-5');
  });
  it('keeps the caret by typed character when grouping changes the text', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, '1234');
    expect(input.value).toBe('1,234');
    await user.type(input, '5', { initialSelectionStart: 1, initialSelectionEnd: 1 });
    expect(input.value).toBe('15,234');
    expect(input.selectionStart).toBe(2);
  });
  it('backspace edits and clearing reports empty', async () => {
    const user = userEvent.setup();
    const changes: CurrencyInputChange[] = [];
    render(<Harness onChange={(c) => changes.push(c)} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, '12');
    await user.keyboard('{Backspace}{Backspace}');
    expect(input.value).toBe('');
    expect(changes.at(-1)).toEqual({ value: '', minorUnits: null, state: 'empty' });
  });
  it('pads the fraction on blur and reports a partial value while typing', async () => {
    const user = userEvent.setup();
    const changes: CurrencyInputChange[] = [];
    render(<Harness onChange={(c) => changes.push(c)} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, '12.');
    expect(changes.at(-1)).toEqual({ value: '12.', minorUnits: null, state: 'partial' });
    await user.tab();
    expect(input.value).toBe('12.00');
    expect(changes.at(-1)).toEqual({ value: '12.00', minorUnits: 1200n, state: 'valid' });
  });
  it('a lone minus clears on blur', async () => {
    const user = userEvent.setup();
    render(<Harness allowNegative />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, '-');
    await user.tab();
    expect(input.value).toBe('');
  });
  it('forwards a ref to the input', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<CurrencyInput label="Amount" currency="USD" value="" onValueChange={() => {}} ref={ref} />);
    expect(ref.current).toBe(screen.getByRole('textbox'));
  });
});
