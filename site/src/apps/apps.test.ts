// The docs apps' simulation and account logic (site/src/apps): determinism, the band, and that an order's fill, the
// cash and the position move together to the paisa.
import { describe, expect, it } from 'vitest';
import { bandOf, createMarket, indexOf, shockMarket, stepMarket, TICK } from './shared/sim.ts';
import { derive, initialState, reducer, type TerminalState } from './trading-terminal/store.ts';
import { derive as deriveWealth, initialState as wealthState, reducer as wealthReducer } from './wealth-dashboard/store.ts';
import { estimateNepseTrade } from '@punji/ui/nepse-fees';

const run = (n: number) => {
  let m = createMarket();
  for (let i = 0; i < n; i += 1) m = stepMarket(m);
  return m;
};

describe('simulated market', () => {
  it('is deterministic for a seed', () => {
    expect(run(50)).toEqual(run(50));
  });

  it('keeps every price on the tick grid and inside its band', () => {
    for (const q of run(400).quotes) {
      expect(q.ltp % TICK).toBe(0n);
      expect(q.ltp >= q.lowerLimit && q.ltp <= q.upperLimit).toBe(true);
      expect(q.lowerLimit % TICK).toBe(0n);
      expect(q.upperLimit % TICK).toBe(0n);
    }
    expect(bandOf(51_230n)).toEqual({ lower: 46_110n, upper: 56_350n });
  });

  it('trips the first breaker stage on a shock and freezes prices until the halt lifts', () => {
    const shocked = shockMarket(run(10), 3);
    expect(shocked.halt?.kind).toBe('circuit-breaker');
    expect(indexOf(shocked.quotes).changePercent).toBeLessThan(-4);
    const next = stepMarket(shocked);
    expect(next.quotes).toEqual(shocked.quotes);
    expect(stepMarket(stepMarket(next)).halt?.kind).toBe('resumed');
  });
});

describe('trading terminal account', () => {
  it('fills a marketable buy and moves cash by exactly the estimate', () => {
    let s: TerminalState = initialState();
    const q = s.market.quotes.find((x) => x.symbol === 'NABIL')!;
    const price = q.upperLimit; // marketable: fills at the next ticks' LTP
    s = reducer(s, { type: 'place', order: { symbol: 'NABIL', side: 'buy', quantity: 10n, price, estimate: estimateNepseTrade({ side: 'buy', quantity: 10n, price }) } });
    expect(s.orders[0]!.status).toBe('pending');
    const cashBefore = s.cash;
    for (let i = 0; i < 4; i += 1) s = reducer(s, { type: 'tick' });
    const order = s.orders[0]!;
    expect(order.status).toBe('filled');
    const fill = s.fills[0]!;
    expect(cashBefore - s.cash).toBe(estimateNepseTrade({ side: 'buy', quantity: 10n, price: fill.price }).total);
    const holding = derive(s).summary.holdings.find((h) => h.symbol === 'NABIL')!;
    expect(holding.quantity).toBe(210n);
  });

  it('rejects a sell larger than the holding and a buy beyond buying power', () => {
    let s = initialState();
    s = reducer(s, { type: 'place', order: { symbol: 'NTC', side: 'sell', quantity: 10n, price: 84_200n, estimate: estimateNepseTrade({ side: 'sell', quantity: 10n, price: 84_200n }) } });
    expect(s.orders[0]!.status).toBe('rejected');
    const big = estimateNepseTrade({ side: 'buy', quantity: 100_000n, price: 84_200n });
    s = reducer(s, { type: 'place', order: { symbol: 'NTC', side: 'buy', quantity: 100_000n, price: 84_200n, estimate: big } });
    expect(s.orders[0]!.status).toBe('rejected');
    expect(s.orders[0]!.reason).toMatch(/collateral/);
  });
});

describe('wealth dashboard', () => {
  it('blocks an application and settles an allotment into holdings and the bank', () => {
    let s = wealthState();
    const before = deriveWealth(s).netWorth;
    s = wealthReducer(s, { type: 'result', issueId: 'iss-mlb', units: 10n });
    expect(s.applications[0]!.status).toBe('allotted');
    expect(s.bank).toBe(42_500_000n + 500_000n - 100_000n);
    expect(deriveWealth(s).summary.holdings.some((h) => h.symbol === 'MLBS' && h.quantity === 10n)).toBe(true);
    // Allotted shares count at cost until they list, so net worth is unchanged by the allotment itself.
    expect(deriveWealth(s).netWorth).toBe(before);
  });
});
