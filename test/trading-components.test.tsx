import { act, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OrderList, OrderTicket, TradeList, TradingHaltBanner, nepalMoneyConfig, type OrderSide, type OrderTicketOrder, type TradingOrder } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const ticket = { symbol: 'NABIL', defaultQuantity: 100n, defaultPrice: 51_230n, previousClose: 51_230n, bandRate: '0.10', lotSize: 10n, ltp: 51_230n, testId: 't' };
const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s/g, ' ');

describe('OrderTicket', () => {
  it('shows the band, quick fills and an exact estimate', () => {
    render(<OrderTicket {...ticket} onSubmit={vi.fn<(order: OrderTicketOrder) => void>()} />);
    expect(screen.getByRole('form', { name: 'Buy NABIL' })).toBeTruthy();
    expect(screen.getByText('Band 461.07 to 563.53 · tick 0.10')).toBeTruthy();
    expect(screen.getByText('Lots of 10')).toBeTruthy();
    const estimate = screen.getByRole('region', { name: 'Estimate' });
    expect(text(estimate)).toContain('51,230.00');
    expect(text(estimate)).toContain('(0.33%)');
    expect(text(estimate)).toContain('169.06');
    expect(text(estimate)).not.toContain('DP charge');
    expect(text(screen.getByTestId('t-total'))).toMatch(/NPR 51,406\.74/);
    expect(screen.getByRole('button', { name: 'Buy 100 NABIL' })).toBeTruthy();
  });

  it('snaps an off-tick price when the field is left and announces it', async () => {
    const user = userEvent.setup();
    render(<OrderTicket {...ticket} onSubmit={vi.fn<(order: OrderTicketOrder) => void>()} />);
    const price = screen.getByTestId('t-price');
    await user.clear(price);
    await user.type(price, '512.34');
    await user.tab();
    expect((price as HTMLInputElement).value).toBe('512.30');
    const live = screen.getAllByRole('status').find((s) => s.classList.contains('kit-sr'))!;
    expect(live.textContent).toBe('Moved to the nearest tick: 512.30');
    expect(screen.getAllByText('Moved to the nearest tick: 512.30')).toHaveLength(2);
  });

  it('refuses a price beyond the circuit and a quantity off the lot, focusing the first problem', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(order: OrderTicketOrder) => void>();
    render(<OrderTicket {...ticket} onSubmit={onSubmit} />);
    const quantity = screen.getByTestId('t-quantity');
    const price = screen.getByTestId('t-price');
    await user.clear(quantity);
    await user.type(quantity, '105');
    await user.clear(price);
    await user.type(price, '600');
    await user.click(screen.getByTestId('t-submit'));
    expect(screen.getByText('Enter a multiple of 10.')).toBeTruthy();
    expect(screen.getByText('Above the upper circuit of 563.53.')).toBeTruthy();
    expect(document.activeElement).toBe(quantity);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('fills the price from the quick buttons', async () => {
    const user = userEvent.setup();
    render(<OrderTicket {...ticket} onSubmit={vi.fn<(order: OrderTicketOrder) => void>()} />);
    await user.click(screen.getByRole('button', { name: /Upper 563\.53/ }));
    expect((screen.getByTestId('t-price') as HTMLInputElement).value).toBe('563.50');
    await user.click(screen.getByRole('button', { name: /Lower 461\.07/ }));
    expect((screen.getByTestId('t-price') as HTMLInputElement).value).toBe('461.10');
  });

  it('confirms before submitting, and can go back', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(order: OrderTicketOrder) => void>();
    render(<OrderTicket {...ticket} onSubmit={onSubmit} />);
    await user.click(screen.getByTestId('t-submit'));
    const dialog = screen.getByRole('alertdialog', { name: 'Buy 100 NABIL at 512.30?' });
    expect(text(dialog)).toMatch(/Total payable NPR 51,406\.74/);
    expect(document.activeElement).toBe(screen.getByTestId('t-confirm'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await user.click(screen.getByTestId('t-submit'));
    await user.click(screen.getByTestId('t-confirm'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ symbol: 'NABIL', side: 'buy', quantity: 100n, price: 51_230n, estimate: { total: 5_140_674n } });
  });

  it('submits straight away without the confirm step', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(order: OrderTicketOrder) => void>();
    render(<OrderTicket {...ticket} confirm={false} onSubmit={onSubmit} />);
    await user.click(screen.getByTestId('t-submit'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('switches to sell with the DP charge and capital gains tax', async () => {
    const user = userEvent.setup();
    const onSideChange = vi.fn<(side: OrderSide) => void>();
    render(<OrderTicket {...ticket} defaultPrice={60_000n} lowerLimit={50_000n} upperLimit={66_000n} costPerUnit={51_406n} holdingDays={100} onSideChange={onSideChange} onSubmit={vi.fn<(order: OrderTicketOrder) => void>()} />);
    await user.click(screen.getByRole('button', { name: 'Sell' }));
    expect(onSideChange).toHaveBeenCalledWith('sell');
    const estimate = screen.getByRole('region', { name: 'Estimate' });
    expect(text(estimate)).toContain('DP charge');
    expect(text(estimate)).toContain('Capital gains tax (7.5%)');
    expect(text(estimate)).toContain('Total receivable');
    expect(screen.getByRole('button', { name: 'Sell 100 NABIL' }).className).toContain('danger');
  });

  it('blocks orders with a reason, and shows Devanagari digits', () => {
    render(<OrderTicket {...ticket} money={nepalMoneyConfig({ digits: 'deva' })} disabledReason="NEPSE is halted." onSubmit={vi.fn<(order: OrderTicketOrder) => void>()} />);
    expect((screen.getByTestId('t-submit') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('NEPSE is halted.')).toBeTruthy();
    expect(text(screen.getByTestId('t-total'))).toContain('५१,४०६.७४');
    expect(screen.getByRole('button', { name: 'Buy १०० NABIL' })).toBeTruthy();
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<OrderTicket {...ticket} onSubmit={vi.fn<(order: OrderTicketOrder) => void>()} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

const ORDERS: TradingOrder[] = [
  { id: 'o1', symbol: 'NABIL', side: 'buy', quantity: 100n, filledQuantity: 60n, price: 51_230n, averagePrice: 51_220n, status: 'partially-filled', time: '11:02:15' },
  { id: 'o2', symbol: 'NTC', side: 'sell', quantity: 50n, price: 88_000n, status: 'open', time: '11:05:40' },
  { id: 'o3', symbol: 'UPPER', side: 'buy', quantity: 200n, filledQuantity: 200n, price: 21_000n, averagePrice: 21_000n, status: 'filled', time: '11:10:02' },
  { id: 'o4', symbol: 'HDL', side: 'buy', quantity: 10n, price: 99_990n, status: 'rejected', reason: 'Above the upper circuit', time: '11:12:30' },
];

describe('OrderList', () => {
  it('shows status in words, the filled share and actions only for live orders', () => {
    render(<OrderList orders={ORDERS} onCancel={vi.fn<(order: TradingOrder) => void>()} onModify={vi.fn<(order: TradingOrder) => void>()} testId="ol" />);
    const nabil = screen.getByTestId('ol-o1');
    expect(text(nabil)).toContain('60 of 100');
    expect(text(nabil)).toContain('avg 512.20');
    expect(within(nabil).getByText('Part filled')).toBeTruthy();
    expect(within(nabil).getByRole('button', { name: 'Cancel NABIL buy 100 at 512.30' })).toBeTruthy();
    expect(within(screen.getByTestId('ol-o3')).queryByRole('button')).toBeNull();
    expect(text(screen.getByTestId('ol-o4'))).toContain('Above the upper circuit');
  });

  it('asks before cancelling and calls modify directly', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn<(order: TradingOrder) => void>();
    const onModify = vi.fn<(order: TradingOrder) => void>();
    render(<OrderList orders={ORDERS} onCancel={onCancel} onModify={onModify} testId="ol" />);
    await user.click(screen.getByTestId('ol-o2-modify'));
    expect(onModify).toHaveBeenCalledWith(ORDERS[1]);
    await user.click(screen.getByTestId('ol-o2-cancel'));
    expect(screen.getByText('Cancel this NTC order?')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(onCancel).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('ol-o2-cancel'));
    await user.click(screen.getByTestId('ol-o2-confirm'));
    expect(onCancel).toHaveBeenCalledWith(ORDERS[1]);
  });

  it('announces a change of status', () => {
    const { rerender } = render(<OrderList orders={ORDERS} />);
    const live = screen.getAllByRole('status').find((s) => s.classList.contains('kit-sr'))!;
    expect(live.textContent).toBe('');
    act(() => rerender(<OrderList orders={[{ ...ORDERS[0]!, filledQuantity: 100n, status: 'filled' }, ...ORDERS.slice(1)]} />));
    expect(live.textContent).toBe('NABIL buy 100: Filled');
  });

  it('shows an empty state and has no serious axe violations', async () => {
    const { container, rerender } = render(<OrderList orders={ORDERS} onCancel={vi.fn<(order: TradingOrder) => void>()} onModify={vi.fn<(order: TradingOrder) => void>()} />);
    expect(await seriousViolations(container)).toEqual([]);
    rerender(<OrderList orders={[]} />);
    expect(screen.getByText('No orders today.')).toBeTruthy();
  });
});

describe('TradeList', () => {
  it('lists fills with exact amounts and totals buys and sells apart', async () => {
    const { container } = render(<TradeList testId="tl" trades={[
      { id: 'c1', symbol: 'NABIL', side: 'buy', quantity: 60n, price: 51_220n, time: '11:03:01', counterpartyBroker: '58' },
      { id: 'c2', symbol: 'NTC', side: 'sell', quantity: 50n, price: 88_000n, time: '11:06:10' },
    ]} />);
    expect(text(screen.getByTestId('tl-c1'))).toMatch(/NPR 30,732\.00/);
    expect(text(screen.getByTestId('tl-c2'))).toContain('—');
    const foot = container.querySelector('tfoot')!;
    expect(text(foot)).toMatch(/Bought NPR 30,732\.00/);
    expect(text(foot)).toMatch(/Sold NPR 44,000\.00/);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('TradingHaltBanner', () => {
  it('alerts a circuit breaker with the move and the pause', () => {
    render(<TradingHaltBanner kind="circuit-breaker" changePercent={-4.12} />);
    const alert = screen.getByRole('alert');
    expect(text(alert)).toContain('NEPSE circuit breaker (down): trading paused');
    expect(text(alert)).toContain('The index is down 4.12%.');
    expect(text(alert)).toContain('Paused for 15 minutes.');
  });

  it('prefers the given resume time, closes for the day at the top tier, and reads resumed politely', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn<() => void>();
    const { rerender } = render(<TradingHaltBanner kind="halt" resumesAt="13:25" detail="Notice 2081/42" onDismiss={onDismiss} />);
    expect(text(screen.getByRole('alert'))).toContain('Trading resumes at 13:25.');
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalled();
    rerender(<TradingHaltBanner kind="circuit-breaker" changePercent={6.2} digits="deva" />);
    expect(text(screen.getByRole('alert'))).toContain('६.२०%');
    expect(text(screen.getByRole('alert'))).toContain('closed for the rest of the day');
    rerender(<TradingHaltBanner kind="resumed" />);
    expect(screen.getByRole('status').textContent).toContain('NEPSE trading has resumed');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<TradingHaltBanner kind="halt" onDismiss={vi.fn<() => void>()} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
