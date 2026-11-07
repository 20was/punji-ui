// The treasury desk: a deterministic fixture, exact dollar conversion at a shocked rate, a forecast whose weeks chain
// and whose totals equal the items, a policy that is breached only under stress and cured by deferring a payment, the
// exposure that follows the rate, and the reducer's refusals.
import { describe, expect, it } from 'vitest';
import { reconcileTotals } from '@punji/ui/table-core';
import { ACCOUNTS, FORECAST_WEEKS, ITEMS, POLICY, SHOCKS, exposure, forecast, liquidNow, minor, place, shockedRate, toNpr } from './treasury-desk/treasury.ts';
import { derive, initialState, reducer, type TreasuryState } from './treasury-desk/store.ts';
import { nprMoney } from './shared/moneyCells.tsx';

const run = (state: TreasuryState, ...actions: Parameters<typeof reducer>[1][]) => actions.reduce(reducer, state);
const base = { stress: false, deferred: [], fxBps: 0 } as const;

describe('treasury fixture', () => {
  it('has unique items, all inside 13 weeks, and exact minor-unit parsing', () => {
    expect(ITEMS.length).toBe(42);
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    expect(place(base).every((p) => p.week !== null)).toBe(true);
    expect(minor('-1,234.5')).toBe(-123_450n);
    expect(() => minor('12.345')).toThrow('Not an amount');
  });

  it('converts dollars exactly at a shocked rate, rounded once', () => {
    expect(shockedRate(0)).toBe('133.4000');
    expect(shockedRate(500)).toBe('140.0700');
    expect(shockedRate(-500)).toBe('126.7300');
    expect(shockedRate(-200)).toBe('130.7320');
    expect(toNpr(minor('148,500.00'), '133.4000')).toBe(minor('19,809,900.00'));
    expect(toNpr(1n, '133.4000')).toBe(133n);
    expect(toNpr(minor('42,000.00'), '126.7300')).toBe(minor('5,322,660.00'));
  });
});

describe('treasury position and forecast', () => {
  it('counts only liquid accounts, the dollar account at the rate', () => {
    const rupees = ACCOUNTS.filter((a) => a.liquid && a.currency === 'NPR').reduce((n, a) => n + a.balance, 0n);
    expect(liquidNow(base)).toBe(rupees + minor('19,809,900.00'));
    expect(liquidNow({ ...base, fxBps: -500 })).toBe(rupees + toNpr(minor('148,500.00'), '126.7300'));
  });

  it('chains the weeks and adds up to the items', () => {
    const weeks = forecast(base);
    expect(weeks.length).toBe(FORECAST_WEEKS);
    expect(weeks[0]!.opening).toBe(liquidNow(base));
    for (let i = 1; i < weeks.length; i++) expect(weeks[i]!.opening).toBe(weeks[i - 1]!.closing);
    const net = place(base).reduce((n, p) => n + p.npr, 0n);
    expect(weeks.at(-1)!.closing).toBe(liquidNow(base) + net);
    expect(weeks.reduce((n, w) => n + w.net, 0n)).toBe(net);
    const totals = { in: nprMoney(weeks.reduce((n, w) => n + w.moneyIn, 0n)) };
    const itemsIn = nprMoney(place(base).filter((p) => p.npr > 0n).reduce((n, p) => n + p.npr, 0n));
    expect(reconcileTotals(totals, { in: itemsIn }).in!.status).toBe('ok');
    expect(reconcileTotals(totals, { in: nprMoney(itemsIn.minor + 1n) }).in!.status).toBe('mismatch');
  });

  it('stays above the minimum in the base case but under the target', () => {
    const d = derive({ ...initialState() });
    expect(d.breaches.length).toBe(0);
    expect(d.level).toBe('below-target');
    expect(d.alerts.map((a) => a.tone)).toEqual(['warn']);
    expect(d.lowest.closing).toBeGreaterThanOrEqual(POLICY.minimum);
  });
});

describe('treasury scenarios', () => {
  it('breaches the buffer when customers pay late, and says which week', () => {
    const s = run(initialState(), { type: 'stress', on: true });
    const d = derive(s);
    expect(d.breaches.map((w) => w.index)).toEqual([7]);
    expect(d.alerts[0]!.tone).toBe('danger');
    expect(d.alerts[0]!.body).toContain('week 8');
    expect(s.notice).toContain('two weeks late');
  });

  it('cures the breach by deferring the Sagarmatha Logistics payment, and undoes it', () => {
    const stressed = run(initialState(), { type: 'stress', on: true });
    const cured = run(stressed, { type: 'defer', id: 'P-14' });
    expect(derive(cured).breaches.length).toBe(0);
    expect(derive(cured).level).toBe('below-target');
    const back = run(cured, { type: 'undefer', id: 'P-14' });
    expect(derive(back).breaches.length).toBe(1);
  });

  it('refuses to defer what cannot be deferred, or twice', () => {
    const payroll = ITEMS.find((i) => i.category === 'Payroll')!;
    expect(run(initialState(), { type: 'defer', id: payroll.id }).deferred).toEqual([]);
    expect(run(initialState(), { type: 'defer', id: 'R-01' }).notice).toContain('only supplier');
    const once = run(initialState(), { type: 'defer', id: 'P-14' });
    expect(run(once, { type: 'defer', id: 'P-14' }).deferred).toEqual(['P-14']);
  });

  it('follows the dollar rate into the position, the forecast and the exposure', () => {
    for (const bps of SHOCKS) {
      const s = { ...base, fxBps: bps };
      const e = exposure(s);
      expect(e.net).toBe(minor('148,500.00') + minor('125,500.00') - minor('40,500.00'));
      expect(e.netNpr).toBe(toNpr(e.net, shockedRate(bps)));
    }
    expect(derive({ ...base, fxBps: 500 }).alerts.some((a) => a.title.startsWith('Dollar exposure'))).toBe(true);
    expect(derive(base).alerts.some((a) => a.title.startsWith('Dollar exposure'))).toBe(false);
    expect(run(initialState(), { type: 'shock', bps: 123 }).fxBps).toBe(0);
  });
});
