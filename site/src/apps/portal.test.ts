// The market portal's data: determinism, a floorsheet that sums to every quote's volume and turnover, prices inside
// the band, fundamentals that follow the live price, and alerts that fire on the tick the price crosses.
import { describe, expect, it } from 'vitest';
import { TICK } from './shared/sim.ts';
import { COMPANIES, CLOSE_TICK, ISSUES, WARM_UP, allEvents, companyEvents, companyOf, createPortal, fundamentalsOf, indexHistory, stepPortal } from './market-portal/market.ts';
import { MAX_COMPARE, derive, initialState, parsePrice, reducer, type PortalState } from './market-portal/store.ts';

const run = (n: number) => {
  let m = createPortal();
  for (let i = 0; i < n; i += 1) m = stepPortal(m);
  return m;
};

describe('market portal data', () => {
  it('is deterministic and opens with 10,000+ contracts after the warm-up', () => {
    const a = createPortal();
    expect(a.tick).toBe(WARM_UP);
    expect(a.trades.length).toBeGreaterThan(10_000);
    expect(run(30)).toEqual(run(30));
    expect(new Set(COMPANIES.map((c) => c.symbol)).size).toBe(COMPANIES.length);
    // Issues not yet listed do not borrow a listed symbol, except the rights issue of a listed company.
    expect(ISSUES.filter((i) => i.symbol && companyOf(i.symbol) && i.kind !== 'right')).toEqual([]);
  });

  it('sums the floorsheet to every quote: volume, turnover and contracts agree exactly', () => {
    const m = run(40);
    for (const q of m.quotes) {
      const mine = m.trades.filter((t) => t.symbol === q.symbol);
      expect(mine.reduce((s, t) => s + t.quantity, 0)).toBe(q.volume);
      expect(mine.reduce((s, t) => s + t.amount, 0n)).toBe(q.turnover);
      expect(mine.length).toBe(q.trades);
      for (const t of mine) {
        expect(t.amount).toBe(BigInt(t.quantity) * t.rate);
        expect(t.buyer).not.toBe(t.seller);
      }
      expect(q.ltp % TICK).toBe(0n);
      expect(q.ltp >= q.lowerLimit && q.ltp <= q.upperLimit).toBe(true);
      expect(q.low <= q.ltp && q.ltp <= q.high).toBe(true);
    }
    expect(new Set(m.trades.map((t) => t.id)).size).toBe(m.trades.length);
  });

  it('stops trading at the close', () => {
    const m = { ...createPortal(), tick: CLOSE_TICK };
    expect(stepPortal(m)).toBe(m);
  });

  it('derives P/E, P/B and market cap from the live price; the index history ends at the previous close', () => {
    const c = companyOf('NABIL')!;
    const f = fundamentalsOf(c, 60_000n);
    expect(f.marketCap).toBe(60_000n * BigInt(c.listedShares));
    expect(f.pe).toBeCloseTo(600 / (Number(c.eps) / 100), 1);
    expect(indexHistory().at(-1)!.value).toBe(2_684.37);
    expect(companyEvents(c).every((e) => allEvents().some((x) => x.id === e.id))).toBe(true);
  });
});

describe('market portal store', () => {
  it('fires an alert once when the price crosses, and the watchlist follows', () => {
    let s: PortalState = initialState();
    const q = derive(s).bySymbol.get('SBL')!;
    s = reducer(s, { type: 'alert-add', symbol: 'SBL', condition: 'below', price: q.ltp + 10_000n });
    expect(s.watchlist).toContain('SBL');
    s = reducer(s, { type: 'tick' });
    const alert = s.alerts.find((a) => a.symbol === 'SBL')!;
    expect(alert.status).toBe('triggered');
    expect(alert.firedPrice).toBe(derive(s).bySymbol.get('SBL')!.ltp);
    expect(s.notice).toMatch(/Price alert: SBL/);
  });

  it('holds at most five symbols in the comparison and freezes prices while the feed is down', () => {
    let s = initialState();
    for (const sym of ['NICA', 'GBIME', 'SBL', 'API']) s = reducer(s, { type: 'compare-add', symbol: sym });
    expect(s.compare.length).toBe(MAX_COMPARE);
    expect(s.notice).toMatch(/holds 5/);
    s = reducer(s, { type: 'feed', down: true });
    expect(reducer(s, { type: 'tick' })).toBe(s);
  });

  it('parses alert prices to paisa', () => {
    expect(parsePrice('512.3')).toBe(51_230n);
    expect(parsePrice('1,024')).toBe(102_400n);
    expect(parsePrice('5.123')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
  });
});
