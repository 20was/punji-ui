// The invest and insure app's logic (site/src/apps/invest-insure): a seeded NAV history that is the same every run,
// allotments that agree with the portfolio, orders that allot units at NAV and move the portfolio and the tax view,
// premiums, claims and the cover gap.
import { describe, expect, it } from 'vitest';
import { unitsValue, xirr } from '@punji/ui/invest';
import { FUNDS, NAV_DATE, NAV_DATES, SEED_POLICIES, claimSteps, flowsOf, fundReturn, latestNav, navHistory, navOn, navText, seedTransactions } from './invest-insure/data.ts';
import { fiscalYear, initialState, instalmentDates, lifeCoverOf, portfolioOf, reducer, retirementThisYear, yearlyPremiums, type State } from './invest-insure/store.ts';

const RS = 100n;
const run = (s: State, ticks: number) => {
  for (let i = 0; i < ticks; i += 1) s = reducer(s, { type: 'tick' });
  return s;
};

describe('fund data', () => {
  it('draws the same weekly NAVs every time, ending on the session date', () => {
    expect(NAV_DATES).toHaveLength(261);
    expect(NAV_DATE).toBe('2026-11-01');
    for (const f of FUNDS) {
      const h = navHistory(f.id);
      expect(h).toHaveLength(261);
      expect(h.every((n) => n >= 10_000n)).toBe(true);
    }
    expect(navText(12_3456n)).toBe('12.3456');
    expect(navOn('koshi-liquid', '2026-10-31')).toBe(navHistory('koshi-liquid').at(-2));
  });

  it('gives returns from the NAV that match an XIRR of one unit', () => {
    const f = FUNDS[0]!;
    const h = navHistory(f.id);
    const expected = xirr([{ date: NAV_DATES[h.length - 157]!, amount: -h[h.length - 157]! }, { date: NAV_DATE, amount: h.at(-1)! }], { digits: 4 })!.percent;
    expect(fundReturn(f.id, 3)).toBe(expected);
    expect(fundReturn('koshi-liquid', 1)).toMatch(/^\d+\.\d{2}$/);
  });
});

describe('portfolio', () => {
  it('values every holding from its own allotments, and the totals are their sums', () => {
    const txs = seedTransactions();
    const p = portfolioOf(txs);
    expect(p.holdings.map((h) => h.fund.id)).toEqual(['himal-growth', 'koshi-balanced', 'trishuli-debt', 'koshi-retirement']);
    for (const h of p.holdings) {
      const mine = txs.filter((t) => t.fundId === h.fund.id);
      expect(h.units).toBe(mine.reduce((s, t) => s + t.units, 0n));
      expect(h.value).toBe(unitsValue(h.units, navText(latestNav(h.fund.id))));
      // Allotment never costs more than was paid.
      for (const t of mine) expect(t.remainder >= 0n).toBe(true);
    }
    expect(p.value).toBe(p.holdings.reduce((s, h) => s + h.value, 0n));
    expect(p.invested).toBe(p.holdings.reduce((s, h) => s + h.invested, 0n));
    expect(p.gain).toBe(p.value - p.invested);
    expect(p.xirr).toBe(xirr(flowsOf(txs, p.value), { digits: 4 })!.percent);
    // Rs 5,000 x 36 + Rs 3,000 x 30 + Rs 2,500 x 15 + Rs 1,00,000.
    expect(p.invested).toBe((5_000n * 36n + 3_000n * 30n + 2_500n * 15n + 1_00_000n) * RS);
  });

  it('allots an order at the latest NAV and moves the portfolio by its value', () => {
    let s = initialState();
    const before = portfolioOf(s.txs);
    s = reducer(s, { type: 'order', fundId: 'trishuli-index', kind: 'lumpsum', amount: 25_000n * RS });
    expect(s.orders[0]!.stage).toBe('placed');
    s = run(s, 3);
    const order = s.orders[0]!;
    expect(order.stage).toBe('allotted');
    const tx = s.txs.find((t) => t.id === order.txId)!;
    expect(tx.nav).toBe(latestNav('trishuli-index'));
    const after = portfolioOf(s.txs);
    expect(after.invested - before.invested).toBe(25_000n * RS);
    expect(after.value - before.value).toBe(unitsValue(tx.units, navText(tx.nav)));
    expect(25_000n * RS - (after.value - before.value)).toBeLessThanOrEqual(tx.remainder + 1n);
    expect(s.notice).toContain('allotted at NAV');
  });

  it('fails an order without touching the folio when the demo failure is on', () => {
    let s = reducer(initialState(), { type: 'fail', fail: true });
    s = run(reducer(s, { type: 'order', fundId: 'koshi-liquid', kind: 'lumpsum', amount: 5_000n * RS }), 3);
    expect(s.orders[0]!.stage).toBe('failed');
    expect(s.txs).toHaveLength(seedTransactions().length);
  });
});

describe('tax view', () => {
  it('counts the retirement fund paid this fiscal year and still to come, and a new SIP adds to it', () => {
    const fy = fiscalYear();
    expect(fy.label).toBe('2083/84');
    expect(fy.start).toBe('2026-07-17');
    let s = initialState();
    const r = retirementThisYear(s);
    // Instalments on the 5th: Aug, Sep, Oct paid; Nov to Jul still to come.
    expect(r.paid).toBe(3n * 2_500n * RS);
    expect(r.planned).toBe(9n * 2_500n * RS);
    s = run(reducer(s, { type: 'order', fundId: 'koshi-retirement', kind: 'sip', amount: 1_000n * RS, day: 15 }), 3);
    const after = retirementThisYear(s);
    expect(after.paid).toBe(r.paid + 1_000n * RS);
    expect(after.planned).toBe(r.planned + BigInt(instalmentDates(s.mandates.at(-1)!, '2026-11-01', fy.end).length) * 1_000n * RS);
    s = reducer(s, { type: 'mandate', id: 'm-retire', paused: true });
    expect(retirementThisYear(s).planned).toBe(after.planned - 9n * 2_500n * RS);
  });

  it('takes a year of premiums per policy and the life cover held', () => {
    const y = yearlyPremiums(SEED_POLICIES);
    expect(y.life).toBe((14_500n + 2n * 24_350n) * RS);
    expect(y.health).toBe(18_080n * RS);
    expect(lifeCoverOf(SEED_POLICIES)).toBe(60n * 1_00_000n * RS);
  });
});

describe('insurance', () => {
  it('pays a premium in its grace period and moves the due date on by its frequency', () => {
    const s = reducer(initialState(), { type: 'pay-premium', policyId: 'p-endow' });
    const p = s.policies.find((x) => x.id === 'p-endow')!;
    expect(p.status).toBe('active');
    expect(p.nextDue).toBe('2027-04-15');
    expect(s.payments[0]!.amount).toBe(24_350n * RS);
  });

  it('moves a claim through every step to paid, capped at the sum assured', () => {
    let s = reducer(initialState(), { type: 'claim', policyId: 'p-health', reason: 'Hospitalisation', eventDate: '2026-10-24', amount: 6_00_000n * RS, documents: ['Discharge summary'] });
    expect(s.claims[0]!.approved).toBe(5_00_000n * RS);
    s = run(s, 4);
    const c = s.claims[0]!;
    expect(c.stage).toBe('settled');
    expect(claimSteps(c).every((step) => step.state === 'complete')).toBe(true);
    expect(s.notice).toContain('5,00,000.00 to your bank');
  });
});
