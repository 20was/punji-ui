// The personal finance app: a deterministic net worth series that the chart's own rows agree with, goals that are
// on track or behind by exact arithmetic, a budget that bills spend from, and bills whose dates move on payment.
import { describe, expect, it } from 'vitest';
import { money } from '@punji/ui/money';
import { netWorthRows } from '@punji/ui/net-worth-chart';
import { BILLS, CATEGORIES, GOALS, NOW, WORTH, inRange, addMonths, assetsOf, monthlyNeeded, monthsBetween, monthsNeeded, netOf, percentOf, rupees } from './personal-finance/finance.ts';
import { initialState, reducer, type FinanceState } from './personal-finance/store.ts';

const run = (state: FinanceState, ...actions: Parameters<typeof reducer>[1][]) => actions.reduce(reducer, state);

describe('personal finance data', () => {
  it('has 24 months, December 2024 to November 2026, with unique keys', () => {
    expect(WORTH.length).toBe(24);
    expect(WORTH[0]!.label).toBe('Dec 2024');
    expect(WORTH.at(-1)!.label).toBe('Nov 2026');
    expect(new Set(WORTH.map((m) => m.key)).size).toBe(24);
    expect(WORTH.every((m) => netOf(m) === assetsOf(m) - m.loan)).toBe(true);
    expect(WORTH.at(-1)!.loan).toBe(rupees(4_600_000 - 42_000 * 23));
  });

  it('agrees with the chart: its rows are assets less liabilities, to the paisa', () => {
    const rows = netWorthRows(WORTH.map((m) => ({ key: m.key, label: m.label, assets: money(assetsOf(m), 'NPR'), liabilities: money(m.loan, 'NPR') })));
    expect(rows.map((r) => r.net)).toEqual(WORTH.map(netOf));
  });

  it('cuts the ranges: 12 months, this year so far, all', () => {
    expect(inRange('1Y').length).toBe(12);
    expect(inRange('YTD').map((m) => m.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(inRange('All').length).toBe(24);
  });
});

describe('goals', () => {
  it('count months with a bigint ceiling and name the monthly amount that catches up', () => {
    const emergency = GOALS.find((g) => g.id === 'emergency')!;
    expect(monthsNeeded(emergency, emergency.saved)).toBe(13);
    expect(monthsBetween(NOW, emergency.due)).toBe(7);
    expect(monthlyNeeded(emergency, emergency.saved)).toBe(2_685_715n);
    const study = GOALS.find((g) => g.id === 'study')!;
    expect(monthsNeeded(study, study.saved)).toBe(44);
    expect(monthsNeeded(GOALS.find((g) => g.id === 'bike')!, rupees(450_000))).toBe(0);
    expect(monthsNeeded({ ...emergency, monthly: 0n }, 0n)).toBe(Infinity);
    expect(percentOf(rupees(412_000), rupees(600_000))).toBe(68.6);
  });

  it('adds a contribution and refuses zero', () => {
    const s = run(initialState(), { type: 'contribute', goalId: 'emergency', amount: rupees(10_000) });
    expect(s.saved.emergency).toBe(rupees(422_000));
    expect(run(s, { type: 'contribute', goalId: 'emergency', amount: 0n }).saved.emergency).toBe(rupees(422_000));
  });
});

describe('budget and bills', () => {
  it('starts with one category over budget', () => {
    expect(CATEGORIES.filter((c) => c.actual > c.budget).map((c) => c.id)).toEqual(['eating']);
  });

  it('spends from the bill category on payment and moves the next date', () => {
    const s = run(initialState(), { type: 'pay', billId: 'power' });
    expect(s.spent.utilities).toBe(rupees(2_150 + 3_840));
    expect(s.bills.power!.due).toEqual({ year: 2026, month: 12, day: 18 });
    const all = run(s, { type: 'pay', billId: 'internet' }, { type: 'pay', billId: 'mobile' });
    expect(all.spent.utilities).toBe(rupees(8_484));
    expect(all.spent.utilities!).toBeGreaterThan(CATEGORIES.find((c) => c.id === 'utilities')!.budget);
  });

  it('clamps month ends and steps quarterly and yearly bills by their own period', () => {
    expect(addMonths({ year: 2026, month: 1, day: 31 }, 1)).toEqual({ year: 2026, month: 2, day: 28 });
    expect(addMonths({ year: 2026, month: 11, day: 30 }, 3)).toEqual({ year: 2027, month: 2, day: 28 });
    const s = run(initialState(), { type: 'pay', billId: 'life' }, { type: 'pay', billId: 'vehicle' });
    expect(s.bills.life!.due).toEqual({ year: 2027, month: 3, day: 1 });
    expect(s.bills.vehicle!.due).toEqual({ year: 2028, month: 1, day: 15 });
  });

  it('records spending and toggles autopay', () => {
    const s = run(initialState(), { type: 'spend', categoryId: 'groceries', amount: rupees(1_000) }, { type: 'autopay', billId: 'power', on: true });
    expect(s.spent.groceries).toBe(rupees(14_420));
    expect(s.bills.power!.autopay).toBe(true);
    expect(run(s, { type: 'spend', categoryId: 'nope', amount: 5n }).spent.groceries).toBe(rupees(14_420));
    expect(BILLS.length).toBe(8);
  });
});
