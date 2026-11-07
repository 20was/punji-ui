import { array, assert as fcAssert, bigInt, constantFrom, integer, property, record, type Arbitrary } from 'fast-check';
import { describe, expect, it } from 'vitest';

import { legPayoffAt, legUnits, payoffAt, payoffKnots, payoffSamples, payoffSlopeAbove, strategyBreakevens, strategyExtremes, type PayoffLeg } from '../src/chart-math/payoff.ts';

const call = (side: 'long' | 'short', strike: bigint, premium: bigint, quantity = 1): PayoffLeg => ({ kind: 'call', side, strike, premium, quantity });
const put = (side: 'long' | 'short', strike: bigint, premium: bigint, quantity = 1): PayoffLeg => ({ kind: 'put', side, strike, premium, quantity });
const stock = (side: 'long' | 'short', premium: bigint, quantity = 1): PayoffLeg => ({ kind: 'stock', side, premium, quantity });
const minors = (legs: readonly PayoffLeg[]) => strategyBreakevens(legs).map((b) => b.minor);

describe('payoffAt', () => {
  it('prices a long call: premium lost below the strike, gain above the breakeven', () => {
    const legs = [call('long', 10000n, 500n)];
    expect(payoffAt(legs, 0n)).toBe(-500n);
    expect(payoffAt(legs, 10000n)).toBe(-500n);
    expect(payoffAt(legs, 10500n)).toBe(0n);
    expect(payoffAt(legs, 12000n)).toBe(1500n);
  });

  it('mirrors a short put and applies quantity and multiplier', () => {
    const leg: PayoffLeg = { kind: 'put', side: 'short', strike: 10000n, premium: 300n, quantity: 2, multiplier: 100 };
    expect(legUnits(leg)).toBe(200n);
    expect(legPayoffAt(leg, 12000n)).toBe(60000n); // keeps the premium: 300 * 200
    expect(legPayoffAt(leg, 9000n)).toBe(-140000n); // (1000 - 300) * 200 lost
  });

  it('treats stock as spot minus entry, and short stock as the reverse', () => {
    expect(payoffAt([stock('long', 10000n, 10)], 11000n)).toBe(10000n);
    expect(payoffAt([stock('short', 10000n, 10)], 11000n)).toBe(-10000n);
  });

  it('stays exact past 2^53 minor units', () => {
    const big = 9_007_199_254_740_993n;
    expect(payoffAt([call('long', big, 1n)], big + 5n)).toBe(4n);
    expect(payoffAt([call('long', big, 1n)], big - 5n)).toBe(-1n);
  });

  it('rejects a negative spot, a missing strike and a bad quantity', () => {
    expect(() => payoffAt([stock('long', 1n)], -1n)).toThrow(RangeError);
    expect(() => payoffAt([{ kind: 'call', side: 'long', premium: 1n, quantity: 1 }], 5n)).toThrow(/strike/);
    expect(() => payoffAt([{ ...stock('long', 1n), quantity: 0 }], 5n)).toThrow(/quantity/);
    expect(() => payoffAt([{ ...stock('long', 1n), quantity: 1.5 }], 5n)).toThrow(/quantity/);
    expect(() => payoffAt([{ ...stock('long', 1n), multiplier: 0 }], 5n)).toThrow(/multiplier/);
    expect(payoffAt([], 5n)).toBe(0n);
  });
});

describe('strategyBreakevens and strategyExtremes', () => {
  it('long call: one breakeven, loss capped at the premium, profit unlimited', () => {
    const legs = [call('long', 10000n, 500n)];
    expect(strategyBreakevens(legs)).toEqual([{ numerator: 10500n, denominator: 1n, minor: 10500n, exact: true }]);
    const { maxProfit, maxLoss } = strategyExtremes(legs);
    expect(maxProfit).toEqual({ unlimited: true, value: null, at: [] });
    expect(maxLoss).toEqual({ unlimited: false, value: -500n, at: [0n, 10000n] });
  });

  it('bull call spread: both ends capped', () => {
    const legs = [call('long', 10000n, 500n), call('short', 11000n, 200n)];
    expect(minors(legs)).toEqual([10300n]);
    const { maxProfit, maxLoss } = strategyExtremes(legs);
    expect(maxProfit).toEqual({ unlimited: false, value: 700n, at: [11000n] });
    expect(maxLoss).toEqual({ unlimited: false, value: -300n, at: [0n, 10000n] });
    expect(payoffSlopeAbove(legs)).toBe(0n);
  });

  it('long straddle: two breakevens either side of the strike', () => {
    const legs = [call('long', 10000n, 400n), put('long', 10000n, 300n)];
    expect(minors(legs)).toEqual([9300n, 10700n]);
    expect(strategyExtremes(legs).maxLoss).toEqual({ unlimited: false, value: -700n, at: [10000n] });
    expect(strategyExtremes(legs).maxProfit.unlimited).toBe(true);
  });

  it('iron condor: a credit with two breakevens and capped loss', () => {
    const legs = [put('long', 9000n, 50n), put('short', 9500n, 150n), call('short', 10500n, 140n), call('long', 11000n, 40n)];
    // credit 200; breakevens 9500 - 200 = 9300 and 10500 + 200 = 10700
    expect(minors(legs)).toEqual([9300n, 10700n]);
    const { maxProfit, maxLoss } = strategyExtremes(legs);
    expect(maxProfit).toEqual({ unlimited: false, value: 200n, at: [9500n, 10500n] });
    expect(maxLoss).toEqual({ unlimited: false, value: -300n, at: [0n, 9000n, 11000n] });
  });

  it('naked short call: loss is unlimited, profit capped at the premium', () => {
    const { maxProfit, maxLoss } = strategyExtremes([call('short', 10000n, 400n)]);
    expect(maxLoss.unlimited).toBe(true);
    expect(maxProfit).toEqual({ unlimited: false, value: 400n, at: [0n, 10000n] });
  });

  it('covered call: stock plus short call', () => {
    const legs = [stock('long', 10000n), call('short', 11000n, 300n)];
    expect(minors(legs)).toEqual([9700n]);
    const { maxProfit, maxLoss } = strategyExtremes(legs);
    expect(maxProfit).toEqual({ unlimited: false, value: 1300n, at: [11000n] });
    expect(maxLoss).toEqual({ unlimited: false, value: -9700n, at: [0n] });
  });

  it('a breakeven between whole minor units is an exact ratio, rounded for display', () => {
    // 3S - 30100 between the strikes: zero at 30100/3 = 10033.33...
    const legs = [call('long', 10000n, 100n, 3), call('short', 11000n, 100n, 2)];
    expect(strategyBreakevens(legs)).toEqual([{ numerator: 30100n, denominator: 3n, minor: 10033n, exact: false }]);
  });

  it('a breakeven beyond the highest strike comes from the slope', () => {
    // long 1 call 10000 @1000, short 3 calls 11000 @100: above 11000 the payoff is 22300 - 2S, zero at 11150
    const legs = [call('long', 10000n, 1000n), call('short', 11000n, 100n, 3)];
    expect(minors(legs)).toEqual([10700n, 11150n]);
    expect(strategyExtremes(legs).maxLoss.unlimited).toBe(true);
  });

  it('a strategy that cannot reach zero has no breakeven', () => {
    expect(strategyBreakevens([put('long', 10000n, 20000n)])).toEqual([]); // the put costs more than it can ever return
    expect(strategyBreakevens([])).toEqual([]);
  });

  it('names only the start of an everywhere-zero payoff', () => {
    // Long and short the same strikes at the same price: zero everywhere from 0 up, so only the ends are named.
    const legs = [call('long', 10000n, 0n), call('short', 10000n, 0n), call('long', 11000n, 0n), call('short', 11000n, 0n), call('long', 12000n, 0n), call('short', 12000n, 0n)];
    expect(minors(legs)).toEqual([0n]);
  });

  it('knots are zero and every strike, once, ascending', () => {
    expect(payoffKnots([call('long', 11000n, 1n), put('long', 9000n, 1n), call('short', 11000n, 1n), stock('long', 5n)])).toEqual([0n, 9000n, 11000n]);
  });
});

describe('payoffSamples', () => {
  it('includes the range ends and every strike inside it, ascending', () => {
    const legs = [call('long', 10333n, 1n), put('long', 9777n, 1n)];
    expect(payoffSamples(legs, 9000n, 11000n, 4)).toEqual([9000n, 9500n, 9777n, 10000n, 10333n, 10500n, 11000n]);
  });

  it('drops repeats when the range is narrower than the steps', () => {
    expect(payoffSamples([], 5n, 7n, 40)).toEqual([5n, 6n, 7n]);
    expect(payoffSamples([], 5n, 5n, 3)).toEqual([5n]);
  });

  it('rejects a backwards range and bad steps', () => {
    expect(() => payoffSamples([], 5n, 4n)).toThrow(RangeError);
    expect(() => payoffSamples([], 0n, 4n, 0)).toThrow(RangeError);
  });
});

describe('properties', () => {
  const legArb = record({
    kind: constantFrom('call', 'put', 'stock'),
    side: constantFrom('long', 'short'),
    quantity: integer({ min: 1, max: 5 }),
    strike: bigInt({ min: 1n, max: 200n }),
    premium: bigInt({ min: 0n, max: 80n }),
  }) as Arbitrary<PayoffLeg>;
  const legsArb = array(legArb, { minLength: 1, maxLength: 4 });

  it('the payoff is the sum of its legs and the reported extremes bound every sampled spot', () => {
    expect(() =>
      fcAssert(
      property(legsArb, (legs) => {
        const { maxProfit, maxLoss } = strategyExtremes(legs);
        for (let spot = 0n; spot <= 400n; spot += 1n) {
          const v = payoffAt(legs, spot);
          if (v !== legs.reduce((sum, leg) => sum + legPayoffAt(leg, spot), 0n)) return false;
          if (!maxProfit.unlimited && v > maxProfit.value) return false;
          if (!maxLoss.unlimited && v < maxLoss.value) return false;
        }
        return true;
      }),
      { numRuns: 60 },
    )).not.toThrow();
  });

  it('every breakeven sits on a zero crossing or touch of the exact payoff', () => {
    expect(() =>
      fcAssert(
      property(legsArb, (legs) =>
        strategyBreakevens(legs).every((b) => {
          const floor = b.numerator / b.denominator;
          const lo = payoffAt(legs, floor);
          const hi = payoffAt(legs, floor + 1n);
          return b.exact ? lo === 0n : (lo < 0n && hi > 0n) || (lo > 0n && hi < 0n);
        }),
      ),
      { numRuns: 80 },
    )).not.toThrow();
  });
});
