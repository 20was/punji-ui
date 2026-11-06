import { cleanup, render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vitest';

import { PunjiLocaleProvider, convertMoney, formatFxRate, invertFxRate, invertRate, isValidFxRate, money, parseFxRate, FxRateDisplay, type FxRate } from '../src/index.ts';
import { seriousViolations } from './axe.ts';
import { NUM_RUNS } from './fc.ts';

afterEach(cleanup);

const usdNpr: FxRate = { base: 'USD', quote: 'NPR', rate: '133.40', asOf: '2026-11-07T04:00:00Z', source: 'Nepal Rastra Bank' };

describe('parseFxRate and isValidFxRate', () => {
  it('accepts exact positive decimals and rejects floats, signs, exponents, grouping and zero', () => {
    for (const ok of ['133.40', '1', '0.0075', '0.000000000000000001']) expect(isValidFxRate(ok)).toBe(true);
    for (const bad of ['', '0', '0.00', '-1.5', '+1', '1e3', '1,334.5', '1.', '.5', ' 1', '1.0000000000000000001', 'abc']) expect(isValidFxRate(bad)).toBe(false);
    expect(() => parseFxRate(133.4 as unknown as string)).toThrow(TypeError);
    expect(() => parseFxRate('0')).toThrow(RangeError);
  });
});

describe('convertMoney', () => {
  it('converts USD 100.00 at 133.40 to NPR 13,340.00', () => {
    expect(convertMoney(money(10000n, 'USD'), usdNpr, 'half-even')).toEqual(money(1334000n, 'NPR'));
  });

  it('honours different minor-unit exponents (JPY 0, KWD 3)', () => {
    const jpy: FxRate = { base: 'USD', quote: 'JPY', rate: '150.5', asOf: '2026-11-07' };
    expect(convertMoney(money(100n, 'USD'), jpy, 'half-up').minor).toBe(151n);
    expect(convertMoney(money(100n, 'USD'), jpy, 'half-even').minor).toBe(150n);
    expect(convertMoney(money(100n, 'USD'), jpy, 'floor').minor).toBe(150n);
    expect(convertMoney(money(100n, 'USD'), jpy, 'ceil').minor).toBe(151n);
    const kwd: FxRate = { base: 'USD', quote: 'KWD', rate: '0.307', asOf: '2026-11-07' };
    expect(convertMoney(money(10000n, 'USD'), kwd, 'half-even')).toEqual(money(30700n, 'KWD'));
  });

  it('is exact beyond float precision', () => {
    const big = money(12345678901234567890123n, 'USD');
    const out = convertMoney(big, { base: 'USD', quote: 'NPR', rate: '133.123456789012345678', asOf: '2026-11-07' }, 'trunc');
    expect(out.minor).toBe((12345678901234567890123n * 133123456789012345678n) / 10n ** 18n);
  });

  it('rejects a money in the wrong currency', () => {
    expect(() => convertMoney(money(1n, 'EUR'), usdNpr, 'half-even')).toThrow(TypeError);
  });

  const rate = fc.tuple(fc.integer({ min: 1, max: 999_999 }), fc.integer({ min: 0, max: 6 })).map(([n, dp]) => (dp === 0 ? `${n}` : `${Math.floor(n / 10 ** dp)}.${String(n % 10 ** dp).padStart(dp, '0')}`)).filter(isValidFxRate);

  it('property: sign-preserving, floor <= half-even <= ceil, and within half a quote unit of the exact value', () => {
    fc.assert(fc.property(fc.bigInt({ min: -(10n ** 15n), max: 10n ** 15n }), rate, (minor, r) => {
      const fx: FxRate = { base: 'USD', quote: 'NPR', rate: r, asOf: '2026-11-07' };
      const { numerator, denominator } = parseFxRate(r);
      const out = convertMoney(money(minor, 'USD'), fx, 'half-even').minor;
      expect(typeof out).toBe('bigint');
      const diff = 2n * out * denominator - 2n * minor * numerator;
      expect((diff < 0n ? -diff : diff) <= denominator).toBe(true);
      expect(convertMoney(money(minor, 'USD'), fx, 'floor').minor <= out).toBe(true);
      expect(convertMoney(money(minor, 'USD'), fx, 'ceil').minor >= out).toBe(true);
      expect(minor !== 0n || out === 0n).toBe(true);
    }), { numRuns: NUM_RUNS });
  });

  it('property: converting there and back stays within the rounding bounds', () => {
    fc.assert(fc.property(fc.bigInt({ min: 0n, max: 10n ** 12n }), rate, (minor, r) => {
      const fx: FxRate = { base: 'USD', quote: 'NPR', rate: r, asOf: '2026-11-07' };
      const there = convertMoney(money(minor, 'USD'), fx, 'half-even');
      const back = convertMoney(there, invertFxRate(fx, 18, 'half-even'), 'half-even');
      const { numerator, denominator } = parseFxRate(r);
      const slack = denominator / numerator + 2n;
      const delta = back.minor - minor;
      expect((delta < 0n ? -delta : delta) <= slack).toBe(true);
    }), { numRuns: NUM_RUNS });
  });

  it('property: summing converted parts drifts at most one unit per part from converting the sum', () => {
    fc.assert(fc.property(fc.array(fc.bigInt({ min: 0n, max: 10n ** 9n }), { minLength: 1, maxLength: 8 }), rate, (parts, r) => {
      const fx: FxRate = { base: 'USD', quote: 'NPR', rate: r, asOf: '2026-11-07' };
      const sum = parts.reduce((a, b) => a + b, 0n);
      const each = parts.reduce((a, p) => a + convertMoney(money(p, 'USD'), fx, 'half-even').minor, 0n);
      const whole = convertMoney(money(sum, 'USD'), fx, 'half-even').minor;
      const drift = each - whole;
      expect((drift < 0n ? -drift : drift) <= BigInt(parts.length)).toBe(true);
    }), { numRuns: NUM_RUNS });
  });
});

describe('invertRate and formatFxRate', () => {
  it('inverts exactly to a fixed number of places', () => {
    expect(invertRate('4', 4)).toBe('0.2500');
    expect(invertRate('133.40', 6)).toBe('0.007496');
    expect(invertRate('0.5', 0)).toBe('2');
    expect(() => invertRate('1000000', 3)).toThrow(RangeError);
  });

  it('swaps base, quote and buy/sell when inverting a rate', () => {
    const inverted = invertFxRate({ ...usdNpr, kind: 'buy' });
    expect(inverted).toMatchObject({ base: 'NPR', quote: 'USD', rate: '0.007496', kind: 'sell', source: 'Nepal Rastra Bank' });
  });

  it('formats at least two fraction digits, drops extra zeros, groups and localises', () => {
    expect(formatFxRate('133.4')).toBe('133.40');
    expect(formatFxRate('133.400000')).toBe('133.40');
    expect(formatFxRate('0.0075')).toBe('0.0075');
    expect(formatFxRate('1234.5')).toBe('1,234.50');
    expect(formatFxRate('133.4', 'ne-NP-u-nu-deva')).toBe('१३३.४०');
  });
});

describe('FxRateDisplay', () => {
  it('renders the sentence, a machine-readable time and the source, and speaks currency names', () => {
    render(<FxRateDisplay rate={usdNpr} timeZone="UTC" testId="fx" />);
    const root = screen.getByTestId('fx');
    expect(root.textContent).toContain('1 USD = NPR 133.40');
    expect(root.textContent).toContain('Source: Nepal Rastra Bank');
    expect(root.querySelector('time')?.getAttribute('datetime')).toBe('2026-11-07T04:00:00.000Z');
    expect(root.textContent).toMatch(/As of Nov 7, 2026/);
    expect(screen.getByText(/equals 133\.40/).textContent).toBe('1 US Dollar equals 133.40 Nepalese Rupee');
    expect(root.querySelector('[aria-hidden="true"].pu-fx-text')?.textContent).toBe('1 USD = NPR 133.40');
  });

  it('shows the inverse and a relative age when `now` is given', () => {
    render(<FxRateDisplay rate={usdNpr} inverse now={Date.parse('2026-11-07T04:02:00Z')} testId="fx" />);
    expect(screen.getByTestId('fx').textContent).toContain('1 NPR = USD 0.007496');
    expect(screen.getByTestId('fx').textContent).toMatch(/2 min\. ago/);
  });

  it('renders a buy and sell pair with one shared timestamp', () => {
    render(<FxRateDisplay buy={{ ...usdNpr, rate: '133.10' }} sell={{ ...usdNpr, rate: '133.70' }} testId="fx" />);
    expect(screen.getByTestId('fx-buy').textContent).toContain('1 USD = NPR 133.10');
    expect(screen.getByTestId('fx-sell').textContent).toContain('1 USD = NPR 133.70');
    expect(screen.getAllByText(/Source: Nepal Rastra Bank/)).toHaveLength(1);
    expect(screen.getByText(/equals 133\.10/).textContent).toContain('Buy');
  });

  it('takes its words from the locale provider and from labels', () => {
    render(
      <PunjiLocaleProvider messages={{ fxRate: { asOf: (t) => `Hisab ${t}`, source: (s) => `Srot ${s}` } }}>
        <FxRateDisplay rate={usdNpr} labels={{ source: (s) => `From ${s}` }} testId="fx" />
      </PunjiLocaleProvider>,
    );
    expect(screen.getByTestId('fx').textContent).toMatch(/Hisab .*From Nepal Rastra Bank/);
  });

  it('omits the timestamp and source on request, and survives an unparseable time', () => {
    const { rerender } = render(<FxRateDisplay rate={usdNpr} hideTime hideSource testId="fx" />);
    expect(screen.getByTestId('fx').querySelector('.pu-fx-meta')).toBeNull();
    rerender(<FxRateDisplay rate={{ ...usdNpr, asOf: 'nonsense' }} testId="fx" />);
    expect(screen.getByTestId('fx').querySelector('time')).toBeNull();
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<><FxRateDisplay rate={usdNpr} /><FxRateDisplay buy={usdNpr} sell={usdNpr} /></>);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
