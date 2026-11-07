import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AmountsToggle, Figure, MoneyDisplay, PrivateAmount, amountsHidden, money, setAmountsHidden, useAmountsHidden } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

beforeEach(() => {
  window.localStorage.clear();
  act(() => setAmountsHidden(false));
});
afterEach(() => act(() => setAmountsHidden(false)));

function Reader() {
  return <output data-testid="r">{String(useAmountsHidden())}</output>;
}

function Both() {
  return (
    <div>
      <AmountsToggle />
      <PrivateAmount testId="a">Rs 1,25,000.00</PrivateAmount>
      <PrivateAmount testId="b" currency="">42</PrivateAmount>
    </div>
  );
}

describe('PrivateAmount and AmountsToggle', () => {
  it('shows the figure until hidden, then neither renders it nor lets a reader hear it', async () => {
    const user = userEvent.setup();
    const { container } = render(<Both />);
    expect(container.textContent).toContain('Rs 1,25,000.00');
    await user.click(screen.getByRole('button', { name: 'Hide amounts' }));
    expect(container.textContent).not.toContain('1,25,000');
    const masked = screen.getByTestId('a');
    expect(masked.getAttribute('aria-label')).toBe('Amount hidden');
    expect(masked.getAttribute('role')).toBe('img');
    expect(masked.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(masked.textContent).toBe('Rs ••••••');
    expect(screen.getByTestId('b').textContent).toBe('••••••');
    const toggle = screen.getByRole('button', { name: 'Show amounts' });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    await user.click(toggle);
    expect(container.textContent).toContain('Rs 1,25,000.00');
  });

  it('is operable from the keyboard', async () => {
    const user = userEvent.setup();
    render(<Both />);
    await user.tab();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Hide amounts');
    await user.keyboard('{Enter}');
    expect(amountsHidden()).toBe(true);
    await user.keyboard(' ');
    expect(amountsHidden()).toBe(false);
  });

  it('remembers the choice on this device and follows another tab', () => {
    render(<Both />);
    act(() => setAmountsHidden(true));
    expect(window.localStorage.getItem('punji-amounts-hidden')).toBe('1');
    act(() => {
      window.localStorage.removeItem('punji-amounts-hidden');
      window.dispatchEvent(new StorageEvent('storage', { key: 'punji-amounts-hidden', newValue: null }));
    });
    expect(screen.queryByTestId('a')).toBeNull();
    expect(document.body.textContent).toContain('Rs 1,25,000.00');
    act(() => {
      window.localStorage.setItem('punji-amounts-hidden', '1');
      window.dispatchEvent(new StorageEvent('storage', { key: 'punji-amounts-hidden', newValue: '1' }));
    });
    expect(screen.getByTestId('a').getAttribute('aria-label')).toBe('Amount hidden');
  });

  it('one store: any reader of useAmountsHidden sees the same state', () => {
    render(<><Reader /><Both /></>);
    expect(screen.getByTestId('r').textContent).toBe('false');
    act(() => setAmountsHidden(true));
    expect(screen.getByTestId('r').textContent).toBe('true');
  });

  it('words and mark can be replaced; works when storage is blocked', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(
      <>
        <AmountsToggle hideLabel="रकम लुकाउनुहोस्" showLabel="रकम देखाउनुहोस्" />
        <PrivateAmount currency="रु" hiddenLabel="रकम लुकाइएको" testId="n">१,००,०००</PrivateAmount>
      </>,
    );
    act(() => setAmountsHidden(true));
    expect(screen.getByTestId('n').textContent).toBe('रु ••••••');
    expect(screen.getByTestId('n').getAttribute('aria-label')).toBe('रकम लुकाइएको');
    expect(screen.getByRole('button', { name: 'रकम देखाउनुहोस्' })).toBeTruthy();
    spy.mockRestore();
  });

  it('server render shows the figure and reads no storage', () => {
    window.localStorage.setItem('punji-amounts-hidden', '1');
    const html = renderToString(<Both />);
    expect(html).toContain('Rs 1,25,000.00');
    expect(html).toContain('Hide amounts');
  });

  it('has no serious axe violations, shown or hidden', async () => {
    const { container } = render(<Both />);
    expect(await seriousViolations(container)).toEqual([]);
    act(() => setAmountsHidden(true));
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('masked on MoneyDisplay and Figure', () => {
  it('MoneyDisplay masked leaves no digits, no value attribute, and says "Amount hidden"', () => {
    const { container } = render(<MoneyDisplay currency="NPR" value={12345600n} masked testId="m" />);
    const el = screen.getByTestId('m');
    expect(el.getAttribute('aria-label')).toBe('Amount hidden');
    expect(el.getAttribute('role')).toBe('img');
    expect(container.innerHTML).not.toMatch(/123|456/);
    expect(el.hasAttribute('value')).toBe(false);
    expect(el.textContent).toContain('••••••');
  });

  it('MoneyDisplay masked takes its own spoken label and unmasked renders as before', () => {
    const { rerender } = render(<MoneyDisplay currency="USD" value={500n} masked maskedLabel="Hidden" testId="m" />);
    expect(screen.getByTestId('m').getAttribute('aria-label')).toBe('Hidden');
    rerender(<MoneyDisplay currency="USD" value={500n} testId="m" />);
    expect(screen.getByTestId('m').tagName).toBe('DATA');
    expect(screen.getByTestId('m').textContent).toContain('5.00');
  });

  it('Figure masked hides numbers and money alike, with the currency mark for money', () => {
    const { container } = render(
      <>
        <Figure value={1234.5} masked testId="n" />
        <Figure value={money(250000n, 'USD')} masked testId="d" />
      </>,
    );
    expect(container.textContent).not.toMatch(/1,?234|2,?500/);
    expect(screen.getByTestId('n').textContent).toBe('••••••');
    expect(screen.getByTestId('d').textContent).toMatch(/^\S+ ••••••$/);
    expect(screen.getByTestId('d').getAttribute('aria-label')).toBe('Amount hidden');
  });

  it('masked components are axe clean', async () => {
    const { container } = render(<><MoneyDisplay currency="NPR" value={100n} masked /><Figure value={3} masked /></>);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
