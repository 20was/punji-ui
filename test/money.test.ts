import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { createMoneyFormatter, currencyExponent, formatCompactMoney, formatMoney, getMoneyFormatter, nepalMoneyConfig, nepalMoneyPreset, parseMoney, type MoneyFormatConfig } from '../src/money/money.ts';

const nbsp = (s: string) => s.replace(/[  ]/g, ' ');

describe('currencyExponent', () => {
  it('reads the exponent from Intl', () => {
    expect([currencyExponent('JPY'), currencyExponent('usd'), currencyExponent('KWD'), currencyExponent('NPR')]).toEqual([0, 2, 3, 2]);
  });
  it('rejects a malformed code', () => {
    expect(() => currencyExponent('US')).toThrow(RangeError);
  });
});

describe('formatMoney', () => {
  it('prints JPY without a fraction and KWD with three digits', () => {
    expect(formatMoney(1234567n, { currency: 'JPY', locale: 'en-US' })).toBe('¥1,234,567');
    expect(nbsp(formatMoney(1234567n, { currency: 'KWD', locale: 'en-US' }))).toBe('KWD 1,234.567');
    expect(formatMoney(5n, { currency: 'KWD', locale: 'en-US', display: 'none' })).toBe('0.005');
  });
  it('places the symbol by locale', () => {
    expect(nbsp(formatMoney(123456n, { currency: 'EUR', locale: 'de-DE' }))).toBe('1.234,56 €');
    expect(formatMoney(123456n, { currency: 'USD', locale: 'en-US' })).toBe('$1,234.56');
    expect(nbsp(formatMoney(123456n, { currency: 'EUR', locale: 'fr-FR', display: 'code' }))).toBe('1 234,56 EUR');
  });
  it('groups NPR in lakh and crore for en-IN', () => {
    expect(nbsp(formatMoney(123456789n, nepalMoneyPreset as MoneyFormatConfig))).toBe('NPR 12,34,567.89');
  });
  it('prints Devanagari digits for ne', () => {
    expect(nbsp(formatMoney(123456789n, nepalMoneyConfig({ language: 'ne' })))).toBe('रू 12,34,567.89');
    expect(nbsp(formatMoney(123456789n, nepalMoneyConfig({ language: 'ne', digits: 'deva' })))).toBe('रू १२,३४,५६७.८९');
    expect(nbsp(formatMoney(123456789n, nepalMoneyConfig({ language: 'en', digits: 'deva' })))).toBe('NPR १२,३४,५६७.८९');
    expect(nbsp(formatMoney(5n, nepalMoneyConfig({ language: 'ne', digits: 'latn' })))).toBe('रू 0.05');
  });
  it('handles negative, accounting and sign display', () => {
    expect(formatMoney(-123n, { currency: 'USD' })).toBe('-$1.23');
    expect(formatMoney(-123n, { currency: 'USD', accounting: true })).toBe('($1.23)');
    expect(formatMoney(-123n, { currency: 'USD', accounting: true, display: 'none' })).toBe('(1.23)');
    expect(formatMoney(123n, { currency: 'USD', signDisplay: 'always' })).toBe('+$1.23');
    expect(formatMoney(0n, { currency: 'USD', signDisplay: 'exceptZero' })).toBe('$0.00');
    expect(formatMoney(-123n, { currency: 'USD', signDisplay: 'never' })).toBe('$1.23');
  });
  it('supports code, name and narrow symbol', () => {
    expect(nbsp(formatMoney(100n, { currency: 'USD', display: 'code' }))).toBe('USD 1.00');
    expect(formatMoney(200n, { currency: 'USD', display: 'name' })).toBe('2.00 US dollars');
    expect(formatMoney(100n, { currency: 'AUD', display: 'narrowSymbol' })).toBe('$1.00');
    expect(formatMoney(100n, { currency: 'AUD' })).toBe('A$1.00');
  });
  it('is exact for a huge bigint', () => {
    const huge = 123456789012345678901234567890123n;
    expect(formatMoney(huge, { currency: 'USD', display: 'none' })).toBe('1,234,567,890,123,456,789,012,345,678,901.23');
    expect(formatMoney(-huge, { currency: 'JPY', display: 'none' })).toBe('-123,456,789,012,345,678,901,234,567,890,123');
  });
  it('rejects a non-bigint amount', () => {
    expect(() => formatMoney(1 as unknown as bigint, { currency: 'USD' })).toThrow(TypeError);
  });
});

describe('formatCompactMoney (display-rounded)', () => {
  const np = { currency: 'NPR', locale: 'en-IN', display: 'none' } as const;
  it('uses lakh and crore for en-IN', () => {
    expect(formatCompactMoney(12345678900n, np)).toBe('12.35 Cr');
    expect(formatCompactMoney(123456789n, np)).toBe('12.35 L');
    expect(formatCompactMoney(-250000000n, np, { fractionDigits: 0 })).toBe('-25 L');
  });
  it('rolls 99.999 lakh over to 1 crore and is exact below one lakh', () => {
    expect(formatCompactMoney(999999500n, np)).toBe('1 Cr');
    expect(formatCompactMoney(5000n, np)).toBe('50.00');
  });
  it('uses Devanagari words for ne', () => {
    expect(nbsp(formatCompactMoney(12345678900n, nepalMoneyConfig({ language: 'ne', digits: 'deva' })))).toBe('रू १२.३५ करोड');
  });
  it('uses K/M/B otherwise', () => {
    expect(formatCompactMoney(123456789n, { currency: 'USD', locale: 'en-US' })).toBe('$1.23M');
    expect(formatCompactMoney(-123456789012n, { currency: 'USD', locale: 'en-US' }, { fractionDigits: 0 })).toBe('-$1B');
    expect(formatCompactMoney(12345n, { currency: 'USD', locale: 'en-US' })).toBe('$123.45');
  });
});

describe('parseMoney', () => {
  it('parses exactly and reports the minor units', () => {
    expect(parseMoney('1,234.50', { currency: 'USD', display: 'none' })).toEqual({ state: 'valid', value: '1234.50', minor: 123450n });
    expect(parseMoney('१२,३४,५६७.८९', nepalMoneyConfig())).toEqual({ state: 'valid', value: '1234567.89', minor: 123456789n });
    expect(parseMoney('1.234,56', { currency: 'EUR', locale: 'de-DE' })).toEqual({ state: 'valid', value: '1234.56', minor: 123456n });
    expect(parseMoney('1234', { currency: 'JPY' })).toEqual({ state: 'valid', value: '1234', minor: 1234n });
    expect(parseMoney('(1.00)', { currency: 'USD', accounting: true })).toEqual({ state: 'valid', value: '-1.00', minor: -100n });
  });
  it('rejects excess precision instead of rounding', () => {
    expect(parseMoney('1.234', { currency: 'USD' })).toEqual({ state: 'invalid', reason: 'precision' });
    expect(parseMoney('1.5', { currency: 'JPY' })).toEqual({ state: 'invalid', reason: 'precision' });
  });
  it('reports empty, partial and bad grouping', () => {
    expect(parseMoney('', { currency: 'USD' }).state).toBe('empty');
    expect(parseMoney('-', { currency: 'USD' }).state).toBe('partial');
    expect(parseMoney('12,34', { currency: 'USD' })).toEqual({ state: 'invalid', reason: 'grouping' });
    expect(parseMoney('USD 5', { currency: 'USD' }).state).toBe('invalid');
  });
});

describe('round trip', () => {
  const configs: MoneyFormatConfig[] = [
    { currency: 'USD', locale: 'en-US', display: 'none' },
    { currency: 'EUR', locale: 'de-DE', display: 'none' },
    { currency: 'EUR', locale: 'fr-FR', display: 'none' },
    { currency: 'CHF', locale: 'de-CH', display: 'none' },
    { currency: 'JPY', locale: 'ja-JP', display: 'none' },
    { currency: 'KWD', locale: 'en-US', display: 'none' },
    { currency: 'NPR', locale: 'en-IN', display: 'none' },
    { currency: 'NPR', locale: 'ne-NP', display: 'none', numberingSystem: 'deva' },
    { currency: 'NPR', locale: 'en-IN', display: 'none', numberingSystem: 'deva', accounting: true },
    { currency: 'USD', locale: 'en-US', display: 'none', accounting: true },
  ];
  it.each(configs)('format then parse is the identity for %o', config => {
    const f = createMoneyFormatter(config);
    fc.assert(fc.property(fc.bigInt({ min: -(10n ** 30n), max: 10n ** 30n }), minor => {
      const r = f.parse(f.format(minor));
      expect(r).toEqual({ state: 'valid', minor, value: f.toDecimal(minor) });
    }));
  });
  it('formatDecimalInput keeps typing states', () => {
    const f = getMoneyFormatter({ currency: 'USD', locale: 'en-US' });
    expect(['', '-', '.', '12.', '1234567.5', '-0.05', '007'].map(v => f.formatDecimalInput(v))).toEqual(['', '-', '0.', '12.', '1,234,567.5', '-0.05', '7']);
  });
});

describe('formatSpoken', () => {
  it('spells out an ambiguous symbol and drops accounting parentheses', () => {
    expect(getMoneyFormatter({ currency: 'AUD', locale: 'en-AU' }).formatSpoken(-150n)).toBe('-1.50 Australian dollars');
    expect(getMoneyFormatter({ currency: 'EUR', locale: 'en', accounting: true }).formatSpoken(-150n)).toBe('-€1.50');
    expect(nbsp(getMoneyFormatter({ currency: 'NPR', locale: 'en-IN', display: 'code' }).formatSpoken(150n))).toBe('NPR 1.50');
  });
});
