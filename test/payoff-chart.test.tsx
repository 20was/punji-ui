import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { money, PayoffChart, payoffModel, type PayoffChartLeg } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

const npr = (units: number | bigint) => money(BigInt(units) * 100n, 'NPR');
const flat = (t: string | null | undefined) => (t ?? '').replaceAll(' ', ' ');
const live = () => flat(screen.getByRole('status').textContent);
const call = (side: 'long' | 'short', strike: number, premium: number, quantity = 1): PayoffChartLeg => ({ kind: 'call', side, quantity, strike: npr(strike), premium: npr(premium) });
const put = (side: 'long' | 'short', strike: number, premium: number, quantity = 1): PayoffChartLeg => ({ kind: 'put', side, quantity, strike: npr(strike), premium: npr(premium) });

const bullSpread = [call('long', 100, 5), call('short', 110, 2)];
const straddle = [call('long', 100, 4), put('long', 100, 3)];

describe('PayoffChart', () => {
  it('prints exact figures: spread of 100 and 110 with debit 3 gives max profit 7, max loss 3, breakeven 103', () => {
    render(<PayoffChart label="Bull call spread" legs={bullSpread} testId="p" />);
    expect(screen.getByRole('figure', { name: 'Bull call spread' })).toBeTruthy();
    expect(flat(screen.getByTestId('p-max-profit').textContent)).toContain('+NPR 7.00');
    expect(flat(screen.getByTestId('p-max-loss').textContent)).toContain('−NPR 3.00');
    expect(flat(screen.getByTestId('p-breakevens').textContent)).toBe('NPR 103.00');
  });

  it('words an unlimited profit or loss instead of a number', () => {
    render(<PayoffChart label="Long straddle" legs={straddle} testId="a" />);
    expect(screen.getByTestId('a-max-profit').textContent).toContain('Unlimited');
    expect(flat(screen.getByTestId('a-breakevens').textContent)).toBe('NPR 93.00, NPR 107.00');
    cleanup();
    render(<PayoffChart label="Naked call" legs={[call('short', 100, 4)]} testId="b" />);
    expect(screen.getByTestId('b-max-loss').textContent).toContain('Unlimited');
    expect(flat(screen.getByTestId('b-max-profit').textContent)).toContain('+NPR 4.00');
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('says "None" where there is no breakeven, no profit or no loss', () => {
    render(<PayoffChart label="Costly put" legs={[{ kind: 'put', side: 'long', quantity: 1, strike: npr(100), premium: npr(200) }]} testId="n" />);
    expect(screen.getByTestId('n-max-profit').textContent).toBe('None');
    expect(screen.getByTestId('n-breakevens').textContent).toBe('None');
  });

  it('gives the figure a spoken summary and a hidden table listing price, result and word', () => {
    render(<PayoffChart label="Bull call spread" legs={bullSpread} spot={npr(104)} />);
    const plot = screen.getByRole('group', { name: 'Bull call spread' });
    expect(plot.getAttribute('aria-roledescription')).toBe('payoff chart');
    const summary = document.getElementById(plot.getAttribute('aria-describedby')!.split(' ')[1]!)!;
    expect(flat(summary.textContent)).toContain('Maximum profit');
    expect(flat(summary.textContent)).toContain('Breakevens');
    const table = screen.getByRole('table', { name: 'Bull call spread' });
    const rows = [...table.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((c) => flat(c.textContent)));
    expect(rows.find((r) => r[0] === 'NPR 100.00')).toEqual(['NPR 100.00', '−NPR 3.00', 'Loss']);
    expect(rows.find((r) => r[0] === 'NPR 103.00')).toEqual(['NPR 103.00', 'NPR 0.00', 'Breakeven']);
    expect(rows.find((r) => r[0] === 'NPR 110.00')).toEqual(['NPR 110.00', '+NPR 7.00', 'Profit']);
    expect(table.querySelectorAll('th[scope="row"]').length).toBe(rows.length);
  });

  it('never relies on colour: loss is hatched, regions are named, results carry a sign and a word', () => {
    const { container } = render(<PayoffChart label="Spread" legs={bullSpread} spot={npr(104)} />);
    expect(container.querySelector('pattern')).not.toBeNull();
    expect(container.querySelector('.pu-pay-area.loss')).not.toBeNull();
    const zones = [...container.querySelectorAll('.pu-pay-zone')].map((z) => z.textContent);
    expect(zones).toEqual(['▲ Profit', '▼ Loss']);
    expect(container.querySelector('.pu-pay-spot text')?.textContent).toBe('Current price');
    expect(container.querySelectorAll('.pu-pay-be').length).toBe(1);
    expect(container.querySelector('.pu-pay-legend')?.textContent).toContain('Breakeven');
  });

  it('moves a keyboard cursor through the prices and speaks each one exactly', () => {
    render(<PayoffChart label="Bull call spread" legs={bullSpread} spot={npr(104)} />);
    const plot = screen.getByRole('group', { name: 'Bull call spread' });
    expect(plot.tabIndex).toBe(0);
    expect(live()).toBe('');
    act(() => plot.focus());
    expect(live()).toMatch(/^Price .*: (profit|loss|breakeven)/);
    fireEvent.keyDown(plot, { key: 'Home' });
    expect(live()).toContain('loss');
    const first = live();
    fireEvent.keyDown(plot, { key: 'ArrowRight' });
    expect(live()).not.toBe(first);
    fireEvent.keyDown(plot, { key: 'End' });
    expect(live()).toContain('profit');
    fireEvent.keyDown(plot, { key: 'Escape' });
    expect(live()).toBe('');
  });

  it('shows the tooltip for the active price with its sign and word', () => {
    render(<PayoffChart label="Bull call spread" legs={bullSpread} testId="p" />);
    const plot = screen.getByRole('group', { name: 'Bull call spread' });
    act(() => plot.focus());
    fireEvent.keyDown(plot, { key: 'End' });
    expect(flat(screen.getByTestId('p-tip').textContent)).toMatch(/▲ Profit \+NPR 7\.00/);
  });

  it('draws and lists the payoff today when the caller supplies it, without computing one', () => {
    const today = [
      { spot: npr(90), value: money(-250n, 'NPR') },
      { spot: npr(100), value: money(-120n, 'NPR') },
      { spot: npr(110), value: money(410n, 'NPR') },
    ];
    const { container } = render(<PayoffChart label="With today" legs={bullSpread} today={today} todayLabel="Today (model)" />);
    expect(container.querySelector('.pu-pay-today path')).not.toBeNull();
    expect(container.querySelectorAll('.pu-pay-today rect').length).toBe(3);
    const table = screen.getByRole('table', { name: 'With today' });
    expect([...table.querySelectorAll('thead th')].map((h) => h.textContent)).toEqual(['Price', 'At expiry', 'Result', 'Today (model)']);
    const row = [...table.querySelectorAll('tbody tr')].find((tr) => flat(tr.firstElementChild!.textContent) === 'NPR 100.00')!;
    expect(flat(row.lastElementChild!.textContent)).toBe('−NPR 1.20');
    cleanup();
    const without = render(<PayoffChart label="No today" legs={bullSpread} />);
    expect(without.container.querySelector('.pu-pay-today')).toBeNull();
  });

  it('stays exact past 2^53 minor units', () => {
    const big = 9_007_199_254_740_993n;
    const legs: PayoffChartLeg[] = [{ kind: 'call', side: 'long', quantity: 1, strike: money(big, 'NPR'), premium: money(1n, 'NPR') }];
    const model = payoffModel({ legs, range: { from: money(big - 10n, 'NPR'), to: money(big + 10n, 'NPR') } });
    expect(model.values[model.spots.indexOf(big + 5n)]).toBe(4n);
    expect(model.breakevens[0]).toMatchObject({ minor: big + 1n, exact: true });
    render(<PayoffChart label="Big" legs={legs} range={{ from: money(big - 10n, 'NPR'), to: money(big + 10n, 'NPR') }} testId="big" />);
    expect(flat(screen.getByTestId('big-breakevens').textContent)).toContain('NPR 9,00,71,99,25,47,409.94');
  });

  it('marks a rounded breakeven and explains it', () => {
    const legs: PayoffChartLeg[] = [
      { kind: 'call', side: 'long', quantity: 3, strike: money(10000n, 'NPR'), premium: money(100n, 'NPR') },
      { kind: 'call', side: 'short', quantity: 2, strike: money(11000n, 'NPR'), premium: money(100n, 'NPR') },
    ];
    render(<PayoffChart label="Ratio" legs={legs} testId="r" />);
    expect(flat(screen.getByTestId('r-breakevens').textContent)).toBe('NPR 100.33*');
    expect(screen.getByText(/Rounded to the nearest minor unit/)).toBeTruthy();
  });

  it('rejects mixed currencies and bad legs', () => {
    expect(() => payoffModel({ legs: [call('long', 100, 5), { kind: 'put', side: 'long', quantity: 1, strike: money(1n, 'USD'), premium: npr(1) }] })).toThrow(TypeError);
    expect(() => payoffModel({ legs: [{ ...call('long', 100, 5), quantity: 0 }] })).toThrow(RangeError);
  });

  it('prints an empty state, and replaces words through labels', () => {
    const { rerender } = render(<PayoffChart label="Empty" legs={[]} />);
    expect(screen.getByText('Add a leg to see the payoff')).toBeTruthy();
    rerender(<PayoffChart label="Words" legs={bullSpread} testId="w" labels={{ maxProfit: 'Sambhavit labh', unlimited: 'Asimit' }} />);
    expect(screen.getByText('Sambhavit labh')).toBeTruthy();
    cleanup();
    render(<PayoffChart label="Words" legs={straddle} testId="w" labels={{ unlimited: 'Asimit' }} />);
    expect(screen.getByTestId('w-max-profit').textContent).toContain('Asimit');
  });

  it('lists each leg in words under the chart, and can drop the facts', () => {
    const { container, rerender } = render(<PayoffChart label="Legs" legs={bullSpread} />);
    expect([...container.querySelectorAll('.pu-pay-legs li')].map((li) => flat(li.textContent))).toEqual([
      'Long 1 call, strike NPR 100.00, premium NPR 5.00',
      'Short 1 call, strike NPR 110.00, premium NPR 2.00',
    ]);
    rerender(<PayoffChart label="Legs" legs={bullSpread} facts={false} />);
    expect(container.querySelector('.pu-pay-facts')).toBeNull();
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<PayoffChart label="Axe" legs={straddle} spot={npr(100)} today={[{ spot: npr(100), value: money(-300n, 'NPR') }]} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
