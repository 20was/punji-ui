import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import {
  adjustedPrice, boidMessage, boidParts, checkBoid, checkKitta, corporateTimeline, costBasisAfter, costBasisSteps, daysBetween, entitledUnits, entitlementFraction,
  formatBoid, issueAmount, issueStatus, kittaMessage, kittaRulesOf, nearestValidKitta, normalizeBoid, parseKitta, sortIssues, spokenBoid, wacc,
} from '../src/share-issues/share-issues.ts';
import * as root from '../src/index.ts';
import { corporateEvents, costHistory, issuesToday, shareIssues } from '../fixtures/share-issues-data.ts';
import { NUM_RUNS } from './fc.ts';

const rules = { min: 10n, max: 1000n, multiple: 10n };

describe('issue status and order', () => {
  it('is upcoming, open, closing today or closed on the given day', () => {
    const issue = { openDate: '2025-11-11', closeDate: '2025-11-17' };
    expect(issueStatus(issue, '2025-11-10')).toBe('upcoming');
    expect(issueStatus(issue, '2025-11-11')).toBe('open');
    expect(issueStatus(issue, '2025-11-17')).toBe('closing-today');
    expect(issueStatus(issue, '2025-11-18')).toBe('closed');
    expect(issueStatus({ openDate: '2025-11-14', closeDate: '2025-11-14' }, '2025-11-14')).toBe('closing-today');
  });
  it('refuses malformed and impossible dates and a close before the open', () => {
    expect(() => issueStatus({ openDate: '2025-11-11', closeDate: '2025-11-10' }, '2025-11-11')).toThrow(RangeError);
    expect(() => issueStatus({ openDate: '2025-02-30', closeDate: '2025-03-02' }, '2025-03-01')).toThrow(RangeError);
    expect(() => issueStatus({ openDate: '11/11/2025', closeDate: '2025-11-17' }, '2025-11-11')).toThrow(RangeError);
  });
  it('counts days across months and leap years without the host time zone', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
    expect(daysBetween('2025-11-17', '2025-11-14')).toBe(-3);
  });
  it('sorts open issues first (closing soonest), then upcoming, then closed', () => {
    expect(sortIssues(shareIssues, issuesToday).map((i) => i.id)).toEqual(['iss-right-today', 'iss-ipo-open', 'iss-mf-open', 'iss-fpo-up', 'iss-deb-up', 'iss-ipo-closed']);
    expect(shareIssues[0]!.id).toBe('iss-ipo-open');
  });
});

describe('kitta rules', () => {
  it('parses Devanagari digits and grouping, refuses fractions and signs', () => {
    expect(parseKitta('१००')).toBe(100n);
    expect(parseKitta('1,000')).toBe(1000n);
    expect(parseKitta('1.5')).toBeNull();
    expect(parseKitta('-10')).toBeNull();
    expect(parseKitta('')).toBeNull();
  });
  it('names the rule that is broken', () => {
    expect(checkKitta('', rules)).toEqual({ ok: false, problem: 'empty' });
    expect(checkKitta('ten', rules)).toEqual({ ok: false, problem: 'invalid' });
    expect(checkKitta('5', rules)).toEqual({ ok: false, problem: 'below-min' });
    expect(checkKitta('1010', rules)).toEqual({ ok: false, problem: 'above-max' });
    expect(checkKitta('15', rules)).toEqual({ ok: false, problem: 'not-multiple' });
    expect(checkKitta(50n, rules)).toEqual({ ok: true, kitta: 50n });
    expect(kittaMessage('not-multiple', rules)).toBe('Units must be a multiple of 10.');
    expect(kittaMessage('below-min', rules)).toBe('Apply for at least 10 units.');
  });
  it('defaults the multiple to 10 and allows 1 for no multiple rule', () => {
    expect(kittaRulesOf(shareIssues[0]!)).toEqual(rules);
    expect(checkKitta('7', kittaRulesOf(shareIssues[1]!))).toEqual({ ok: true, kitta: 7n });
    expect(checkKitta('15', { min: 10n, max: 100n })).toEqual({ ok: false, problem: 'not-multiple' });
    expect(() => checkKitta('10', { min: 10n, max: 5n })).toThrow(RangeError);
  });
  it('finds the nearest kitta that meets the rules', () => {
    expect(nearestValidKitta(15n, rules)).toBe(10n);
    expect(nearestValidKitta(17n, rules)).toBe(20n);
    expect(nearestValidKitta(3n, rules)).toBe(10n);
    expect(nearestValidKitta(5000n, rules)).toBe(1000n);
    expect(nearestValidKitta(1n, { min: 15n, max: 1000n, multiple: 10n })).toBe(20n);
    expect(nearestValidKitta(1n, { min: 11n, max: 19n, multiple: 10n })).toBeNull();
  });
  it('computes the amount exactly, past 2^53', () => {
    expect(issueAmount(1000n, 10_000n)).toBe(10_000_000n);
    expect(issueAmount(9_007_199_254_740_993n, 100n)).toBe(900_719_925_474_099_300n);
    expect(() => issueAmount(-1n, 1n)).toThrow(RangeError);
  });
  it('accepts only kitta inside the range and on the multiple (property)', () => {
    fc.assert(fc.property(fc.bigInt({ min: 0n, max: 20_000n }), fc.bigInt({ min: 1n, max: 500n }), fc.bigInt({ min: 1n, max: 50n }), (k, min, step) => {
      const r = { min, max: min + 5000n, multiple: step };
      const c = checkKitta(k, r);
      expect(c.ok).toBe(k >= r.min && k <= r.max && k % step === 0n);
      const near = nearestValidKitta(k, r);
      if (near !== null) expect(checkKitta(near, r).ok).toBe(true);
    }), { numRuns: NUM_RUNS });
  });
});

describe('BOID', () => {
  it('splits a valid BOID into DP ID, DP code and client ID', () => {
    const check = checkBoid('1301 3700-0001 2345');
    expect(check).toEqual({ ok: true, parts: { boid: '1301370000012345', dpId: '13013700', dpCode: '13700', clientId: '00012345' } });
    expect(checkBoid('१३०१३७०००००१२३४५').ok).toBe(true);
  });
  it('says what is wrong, with the digit count', () => {
    expect(checkBoid('')).toEqual({ ok: false, problem: 'empty', digits: 0 });
    expect(checkBoid('130137000001234')).toEqual({ ok: false, problem: 'too-short', digits: 15 });
    expect(checkBoid('13013700000123456')).toEqual({ ok: false, problem: 'too-long', digits: 17 });
    expect(checkBoid('13013700000123a5')).toMatchObject({ ok: false, problem: 'invalid-character' });
    expect(checkBoid('2301370000012345')).toMatchObject({ ok: false, problem: 'prefix' });
    expect(checkBoid('2301370000012345', { prefix: null }).ok).toBe(true);
    expect(boidMessage('too-short', 15)).toBe('A BOID has 16 digits; this has 15.');
    expect(boidMessage('prefix')).toBe('A BOID starts with 130.');
  });
  it('formats split, in groups, plain and masked', () => {
    expect(formatBoid('1301370000012345')).toBe('13013700 00012345');
    expect(formatBoid('1301370000012345', { style: 'groups' })).toBe('1301 3700 0001 2345');
    expect(formatBoid('1301-3700-0001-2345', { style: 'plain' })).toBe('1301370000012345');
    expect(formatBoid('1301370000012345', { mask: true, style: 'plain' })).toBe('••••••••••••2345');
    expect(formatBoid('1301370000012345', { mask: true, visible: 20 })).toBe('•••••••• 00012345');
    expect(formatBoid('12 34')).toBe('1234');
    expect(spokenBoid('1301370000012345')).toBe('1 3 0 1, 3 7 0 0, 0 0 0 1, 2 3 4 5');
    expect(normalizeBoid('١٣٠١')).toBe('1301');
    expect(() => boidParts('123')).toThrow(RangeError);
  });
});

describe('entitlements and the adjusted price', () => {
  it('reads percents and ratios as exact fractions', () => {
    expect(entitlementFraction('12.5')).toEqual({ numerator: 125n, denominator: 1000n });
    expect(entitlementFraction({ offered: 1n, held: 2n })).toEqual({ numerator: 1n, denominator: 2n });
    expect(() => entitlementFraction('1e2')).toThrow(RangeError);
    expect(() => entitlementFraction({ offered: 1n, held: 0n })).toThrow(RangeError);
  });
  it('does not issue fractional units unless asked to round otherwise', () => {
    expect(entitledUnits(110n, '10')).toBe(11n);
    expect(entitledUnits(105n, '10')).toBe(10n);
    expect(entitledUnits(105n, '10', 'half-up')).toBe(11n);
    expect(entitledUnits(7n, { offered: 1n, held: 2n })).toBe(3n);
  });
  it('adjusts for bonus, right, both, and an optional cash deduction', () => {
    expect(adjustedPrice({ price: 50_000n, bonus: '10' })).toBe(45_455n);
    expect(adjustedPrice({ price: 50_000n, right: '50' })).toBe(36_667n);
    expect(adjustedPrice({ price: 50_000n, right: { offered: 1n, held: 2n } })).toBe(36_667n);
    expect(adjustedPrice({ price: 50_000n, bonus: '10', right: '50' })).toBe(34_375n);
    expect(adjustedPrice({ price: 50_000n, bonus: '10', cashDividend: 2_500n })).toBe(43_182n);
    expect(adjustedPrice({ price: 50_000n, bonus: '10', rounding: 'floor' })).toBe(45_454n);
    expect(adjustedPrice({ price: 50_000n })).toBe(50_000n);
    expect(() => adjustedPrice({ price: -1n })).toThrow(RangeError);
  });
  it('never raises the price for a bonus (property)', () => {
    fc.assert(fc.property(fc.bigInt({ min: 0n, max: 10n ** 12n }), fc.integer({ min: 0, max: 1000 }), (price, pct) => {
      const adjusted = adjustedPrice({ price, bonus: String(pct), rounding: 'floor' });
      expect(adjusted <= price).toBe(true);
      expect(adjusted * BigInt(100 + pct) <= price * 100n).toBe(true);
    }), { numRuns: NUM_RUNS });
  });
});

describe('cost basis through corporate actions', () => {
  it('walks buy, bonus, right and sale with exact WACC at each step', () => {
    const steps = costBasisSteps({ quantity: 0n, cost: 0n }, costHistory);
    expect(steps.map((s) => [s.units, s.cost, s.quantity, s.totalCost, s.wacc])).toEqual([
      [100n, 5_015_000n, 100n, 5_015_000n, 50_150n],
      [10n, 0n, 110n, 5_015_000n, 45_591n],
      [55n, 550_000n, 165n, 5_565_000n, 33_727n],
      [-40n, -1_349_091n, 125n, 4_215_909n, 33_727n],
    ]);
    expect(costBasisAfter({ quantity: 0n, cost: 0n }, costHistory)).toEqual({ quantity: 125n, cost: 4_215_909n, wacc: 33_727n });
  });
  it('can cost bonus units at par, honours a partial right subscription, and empties fully on a full sale', () => {
    const start = { quantity: 100n, cost: 5_000_000n };
    expect(costBasisAfter(start, [{ kind: 'bonus', entitlement: '10', unitCost: 10_000n }]).cost).toBe(5_100_000n);
    expect(costBasisAfter(start, [{ kind: 'right', entitlement: '50', price: 10_000n, subscribed: 20n }])).toMatchObject({ quantity: 120n, cost: 5_200_000n });
    expect(costBasisAfter(start, [{ kind: 'sell', quantity: 100n }])).toEqual({ quantity: 0n, cost: 0n, wacc: null });
    expect(costBasisAfter(start, [])).toEqual({ quantity: 100n, cost: 5_000_000n, wacc: 50_000n });
  });
  it('refuses a sale larger than the holding', () => {
    expect(() => costBasisSteps({ quantity: 10n, cost: 1000n }, [{ kind: 'sell', quantity: 11n }])).toThrow(RangeError);
    expect(wacc(100n, 0n)).toBeNull();
  });
  it('keeps total cost equal to the sum of step costs (property)', () => {
    const action = fc.oneof(
      fc.record({ kind: fc.constant('buy' as const), quantity: fc.bigInt({ min: 1n, max: 10_000n }), amount: fc.bigInt({ min: 0n, max: 10n ** 10n }) }),
      fc.record({ kind: fc.constant('bonus' as const), entitlement: fc.integer({ min: 0, max: 100 }).map(String) }),
      fc.record({ kind: fc.constant('right' as const), entitlement: fc.integer({ min: 0, max: 100 }).map(String), price: fc.bigInt({ min: 0n, max: 100_000n }) }),
    );
    fc.assert(fc.property(fc.array(action, { maxLength: 12 }), (actions) => {
      const steps = costBasisSteps({ quantity: 0n, cost: 0n }, actions);
      const last = steps.at(-1);
      expect(last?.totalCost ?? 0n).toBe(steps.reduce((s, x) => s + x.cost, 0n));
      expect(last?.quantity ?? 0n).toBe(steps.reduce((s, x) => s + x.units, 0n));
    }), { numRuns: NUM_RUNS });
  });
});

describe('corporate timeline', () => {
  it('orders events, gives each a phase and marks the next one', () => {
    const rows = corporateTimeline([...corporateEvents].reverse(), issuesToday);
    expect(rows.map((r) => [r.id, r.phase, r.days, r.next])).toEqual([
      ['ev-ann', 'past', -25, false],
      ['ev-bc', 'upcoming', 7, true],
      ['ev-agm', 'upcoming', 8, false],
      ['ev-credit', 'upcoming', 36, false],
    ]);
    expect(corporateTimeline([{ id: 'a', kind: 'agm', date: issuesToday }], issuesToday)[0]).toMatchObject({ phase: 'today', next: true });
  });
  it('refuses duplicate ids and malformed dates', () => {
    expect(() => corporateTimeline([{ id: 'a', kind: 'agm', date: '2025-11-01' }, { id: 'a', kind: 'agm', date: '2025-11-02' }], issuesToday)).toThrow(RangeError);
    expect(() => corporateTimeline([{ id: 'a', kind: 'agm', date: '2025-13-01' }], issuesToday)).toThrow(RangeError);
  });
});

describe('root barrel', () => {
  it('re-exports the same helpers', () => {
    expect(root.adjustedPrice).toBe(adjustedPrice);
    expect(root.checkBoid).toBe(checkBoid);
    expect(root.costBasisSteps).toBe(costBasisSteps);
  });
});
