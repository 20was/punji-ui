import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ALERT_BAR_SCALE_PCT, alertCloseness, alertDistance, alertTarget, displayCompanyName, setReaderLang, shortCompanyName } from '../src/index.ts';
import { NUM_RUNS } from './fc.ts';

describe('alertDistance', () => {
  it('reads the gap to an above target in exact paisa', () => {
    const d = alertDistance('above', 50000n, 49000n)!;
    expect(d.diff).toBe(1000n);
    expect(d.pct).toBeCloseTo(2.0408, 3);
    expect(d.crossed).toBe(false);
    expect(d.closeness).toBeCloseTo(1 - 2.0408 / ALERT_BAR_SCALE_PCT, 3);
  });
  it('is crossed (and full) once the price is on the target side, for each direction', () => {
    expect(alertDistance('above', 50000n, 50000n)).toMatchObject({ diff: 0n, crossed: true, closeness: 1 });
    expect(alertDistance('above', 50000n, 51000n)).toMatchObject({ diff: -1000n, crossed: true, closeness: 1 });
    expect(alertDistance('below', 40000n, 39000n)).toMatchObject({ crossed: true, closeness: 1 });
    expect(alertDistance('below', 40000n, 41000n)?.crossed).toBe(false);
  });
  it('is null, never a 0%, when the target or the price is unknown or not above zero', () => {
    for (const [t, p] of [[null, 100n], [100n, null], [undefined, 100n], [0n, 100n], [100n, 0n], [-5n, 100n]] as const) expect(alertDistance('above', t, p)).toBeNull();
  });
  it('keeps the difference exact past 2^53 where a Number would round', () => {
    const price = 9_007_199_254_740_993n; // 2^53 + 1
    expect(Number(price)).toBe(Number(price - 1n)); // a Number cannot tell price and price - 1 apart
    expect(alertDistance('above', price + 1n, price)?.diff).toBe(1n);
    expect(alertDistance('below', price - 5n, price)?.diff).toBe(-5n);
  });
  it('closeness is linear: 1 at the target, 0 at 10% away or more, sign ignored', () => {
    expect(alertCloseness(0)).toBe(1);
    expect(alertCloseness(5)).toBeCloseTo(0.5);
    expect(alertCloseness(-5)).toBeCloseTo(0.5);
    expect(alertCloseness(10)).toBe(0);
    expect(alertCloseness(40)).toBe(0);
    expect(alertCloseness(Number.NaN)).toBe(0);
    expect(alertCloseness(null)).toBe(0);
    expect(alertCloseness(40, true)).toBe(1);
  });
  it('property: closeness is within 0..1 and the diff is target minus price', () => {
    fc.assert(
      fc.property(fc.constantFrom('above' as const, 'below' as const), fc.bigInt({ min: 1n, max: 10n ** 24n }), fc.bigInt({ min: 1n, max: 10n ** 24n }), (direction, target, price) => {
        const d = alertDistance(direction, target, price)!;
        expect(d.diff).toBe(target - price);
        expect(d.closeness).toBeGreaterThanOrEqual(0);
        expect(d.closeness).toBeLessThanOrEqual(1);
        expect(d.crossed).toBe(direction === 'above' ? price >= target : price <= target);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe('alertTarget', () => {
  it('prints whole rupees plain and paisa only when there are some', () => {
    expect(alertTarget(26300n)).toBe('Rs 263');
    expect(alertTarget(26350n)).toBe('Rs 263.50');
    expect(alertTarget(26305n)).toBe('Rs 263.05');
    expect(alertTarget(123456700n)).toBe('Rs 12,34,567');
  });
  it('prints an index in points, with no rupee mark', () => {
    expect(alertTarget(280000n, { index: true })).toBe('2,800');
    expect(alertTarget(280050n, { index: true })).toBe('2,800.50');
  });
  it('uses the Nepali mark when asked, and the language set by setReaderLang', () => {
    expect(alertTarget(26300n, { lang: 'ne' })).toBe('रु. 263');
    setReaderLang('ne');
    try {
      expect(alertTarget(26300n)).toBe('रु. 263');
    } finally {
      setReaderLang('en');
    }
  });
  it('is exact past 2^53', () => {
    expect(alertTarget(900719925474099312n)).toBe('Rs 9,00,71,99,25,47,40,993.12');
  });
});

describe('displayCompanyName', () => {
  it('writes an all-capitals name in normal case, keeping acronyms and small words', () => {
    expect(displayCompanyName('NEPAL LIFE INSURANCE COMPANY LIMITED')).toBe('Nepal Life Insurance Company Limited');
    expect(displayCompanyName('NIC ASIA BANK LIMITED')).toBe('NIC Asia Bank Limited');
    expect(displayCompanyName('GLOBAL IME BANK LIMITED')).toBe('Global IME Bank Limited');
    expect(displayCompanyName('BANK OF KATHMANDU LIMITED')).toBe('Bank of Kathmandu Limited');
    expect(displayCompanyName('API POWER COMPANY LIMITED')).toBe('API Power Company Limited');
  });
  it('leaves a mixed-case name and a name with no letters as written, and trims', () => {
    expect(displayCompanyName('Nabil Bank Limited')).toBe('Nabil Bank Limited');
    expect(displayCompanyName('  123 ')).toBe('123');
    expect(displayCompanyName('')).toBe('');
  });
  it('splits at hyphens and slashes, and composes with shortCompanyName', () => {
    expect(displayCompanyName('SANIMA-MAI HYDROPOWER LTD')).toBe('Sanima-Mai Hydropower Ltd');
    expect(shortCompanyName(displayCompanyName('NEPAL LIFE INSURANCE COMPANY LIMITED'))).toBe('Nepal Life Insurance');
  });
});
