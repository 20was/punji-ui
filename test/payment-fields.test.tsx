import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState, type ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AbaRoutingInput, BicInput, CardCvcInput, CardExpiryInput, CardNumberInput, IbanInput, IfscInput, NepalBankAccountInput, SortCodeInput,
  UkAccountNumberInput, UpiInput, type PaymentCheck, type PaymentFieldProps,
} from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

type AnyField = ComponentType<PaymentFieldProps<never> & Record<string, unknown>>;

function Host({ field: Field, initial = '', onResult, ...rest }: { field: AnyField; initial?: string; onResult?: (r: PaymentCheck) => void } & Record<string, unknown>) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <Field label="Field" value={value} onValueChange={(r: PaymentCheck) => { setValue(r.value); onResult?.(r); }} {...rest} />
      <button type="button">Next</button>
    </>
  );
}
const field = (component: unknown) => component as AnyField;
const input = () => screen.getByLabelText('Field') as HTMLInputElement;
const live = (container: HTMLElement) => container.querySelector('[aria-live="polite"]')!.textContent;

describe('payment fields', () => {
  it('IbanInput groups as you type, accepts a paste with spaces and announces the country and validity', async () => {
    const results: PaymentCheck[] = [];
    const { container } = render(<Host field={field(IbanInput)} onResult={(r) => results.push(r)} />);
    expect(input().getAttribute('autocapitalize')).toBe('characters');
    expect(input().getAttribute('spellcheck')).toBe('false');
    await userEvent.type(input(), 'gb82west');
    expect(input().value).toBe('GB82 WEST');
    await userEvent.clear(input());
    await userEvent.click(input());
    await userEvent.paste('GB82 WEST 1234 5698 7654 32');
    expect(results.at(-1)).toMatchObject({ state: 'valid', value: 'GB82WEST12345698765432' });
    expect(live(container)).toContain('United Kingdom');
    expect(live(container)).toContain('IBAN complete');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('refuses a typed character that can never belong, and explains an incomplete value after leaving', async () => {
    const { container } = render(<Host field={field(SortCodeInput)} />);
    expect(input().getAttribute('inputmode')).toBe('numeric');
    await userEvent.type(input(), '12a34');
    expect(input().value).toBe('12-34');
    await userEvent.tab();
    expect(container.querySelector('.err')?.textContent).toBe('Enter the full sort code.');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(live(container)).toBe('Enter the full sort code.');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('reads Devanagari digits and removes invisible characters from a paste, saying so', async () => {
    const results: PaymentCheck[] = [];
    const { container } = render(<Host field={field(AbaRoutingInput)} onResult={(r) => results.push(r)} />);
    await userEvent.click(input());
    await userEvent.paste('०११​०००-०१५');
    expect(results.at(-1)).toMatchObject({ state: 'valid', value: '011000015', cleaned: true });
    expect(live(container)).toContain('Hidden characters were removed');
  });

  it('CardNumberInput detects the brand, groups Amex 4-6-5, masks when left and keeps the number out of the markup', async () => {
    const log = vi.spyOn(console, 'log');
    const { container } = render(<Host field={field(CardNumberInput)} />);
    expect(input().getAttribute('autocomplete')).toBe('cc-number');
    expect(input().getAttribute('inputmode')).toBe('numeric');
    await userEvent.type(input(), '378282246310005');
    expect(input().value).toBe('3782 822463 10005');
    expect(container.querySelector('.pu-pay-badge')?.textContent).toBe('American Express');
    expect(container.innerHTML).not.toContain('378282246310005');
    expect(container.innerHTML).not.toContain('3782 822463 10005');
    await userEvent.tab();
    expect(input().value).toBe('•••• 0005');
    await userEvent.click(input());
    expect(input().value).toBe('3782 822463 10005');
    expect(log).not.toHaveBeenCalled();
    expect(await seriousViolations(container)).toEqual([]);
    log.mockRestore();
  });

  it('CardNumberInput keeps the caret in place when grouping', async () => {
    render(<Host field={field(CardNumberInput)} />);
    await userEvent.type(input(), '42424242');
    input().setSelectionRange(2, 2);
    await userEvent.type(input(), '9', { initialSelectionStart: 2, initialSelectionEnd: 2 });
    expect(input().value).toBe('4294 2424 2');
    expect(input().selectionStart).toBe(3);
  });

  it('server render leaves a card number out of the HTML', () => {
    const html = renderToString(<CardNumberInput label="Card" value="5555555555554444" onValueChange={() => {}} />);
    expect(html).not.toContain('5555');
    expect(html).not.toContain('value=');
    const iban = renderToString(<IbanInput label="IBAN" value="DE89370400440532013000" onValueChange={() => {}} />);
    expect(iban).toContain('DE89 3704 0044 0532 0130 00');
  });

  it('CardExpiryInput and CardCvcInput use the card autofill tokens', async () => {
    const first = render(<Host field={field(CardExpiryInput)} today={{ year: 2026, month: 11 }} />);
    expect(input().getAttribute('autocomplete')).toBe('cc-exp');
    await userEvent.type(input(), '1025');
    await userEvent.tab();
    expect(first.container.querySelector('.err')?.textContent).toBe('This card has expired.');
    cleanup();
    const { container } = render(<Host field={field(CardCvcInput)} />);
    expect(input().getAttribute('autocomplete')).toBe('cc-csc');
    await userEvent.type(input(), '123');
    expect(container.innerHTML).not.toContain('123');
  });

  it('UpiInput reads a pasted upi:// link and flags a look-alike of a saved payee', async () => {
    const results: PaymentCheck[] = [];
    const { container } = render(<Host field={field(UpiInput)} knownPayees={['paypal@ybl']} onResult={(r) => results.push(r)} />);
    expect(input().getAttribute('inputmode')).toBe('email');
    await userEvent.click(input());
    await userEvent.paste('upi://pay?pa=paypa1%40ybl&pn=Shop');
    expect(results.at(-1)).toMatchObject({ state: 'valid', value: 'paypa1@ybl' });
    expect(screen.getByRole('alert').textContent).toContain('paypal@ybl');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('BIC, IFSC, UK account and Nepal account fields accept valid values', async () => {
    const cases: [unknown, string, Record<string, unknown>?][] = [
      [BicInput, 'narbnpka'], [IfscInput, 'sbin0001234'], [UkAccountNumberInput, '31926819'],
      [NepalBankAccountInput, '०१२३४५६७८९०१२३', { rule: { id: 'x', name: 'Example', lengths: [14] }, digits: 'deva' }],
    ];
    for (const [component, text, extra] of cases) {
      const results: PaymentCheck[] = [];
      render(<Host field={field(component)} onResult={(r) => results.push(r)} {...extra} />);
      await userEvent.click(input());
      await userEvent.paste(text);
      expect(results.at(-1)?.state).toBe('valid');
      cleanup();
    }
  });

  it('a server error replaces the built-in message, and fieldName and messages change the words', async () => {
    const named = render(<Host field={field(IfscInput)} fieldName="branch code" messages={{ incomplete: (f: string) => `Type the whole ${f}.` }} />);
    await userEvent.type(input(), 'SBIN');
    await userEvent.tab();
    expect(named.container.querySelector('.err')?.textContent).toBe('Type the whole branch code.');
    cleanup();
    render(<Host field={field(IfscInput)} error="Branch not found" />);
    expect(screen.getByText('Branch not found')).toBeTruthy();
  });

  it('fireEvent.change works for a controlled parent', () => {
    const onValueChange = vi.fn<(result: PaymentCheck) => void>();
    render(<IbanInput label="Field" value="" onValueChange={onValueChange} />);
    act(() => { fireEvent.change(input(), { target: { value: 'DE89 3704 0044 0532 0130 00' } }); });
    expect(onValueChange).toHaveBeenCalledWith(expect.objectContaining({ state: 'valid', country: 'DE' }));
  });
});
