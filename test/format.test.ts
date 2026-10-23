import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { formatFigure, parseNumber, searchSymbols, segmentTarget, shortCompanyName, toneOf } from '../src/index.ts';
import { NUM_RUNS } from './fc.ts';

describe('formatFigure', () => {
  it('formats each kind with lakh and crore grouping', () => {
    expect(formatFigure(842610, 'rs')).toBe('Rs 8,42,610.00');
    expect(formatFigure(1234567.4, 'int')).toBe('12,34,567');
    expect(formatFigure(-3.456, 'pct')).toBe('-3.46%');
    expect(formatFigure(1234.5)).toBe('1,234.50');
    expect(formatFigure(1.23456, 'num', 3)).toBe('1.235');
  });

  it('prints a dash for a missing or non-finite value, never 0', () => {
    for (const v of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) expect(formatFigure(v)).toBe('-');
  });
});

describe('toneOf', () => {
  it('reads the tone after rounding to what is printed', () => {
    expect(toneOf(0.004)).toBe('flat');
    expect(toneOf(0.005)).toBe('up');
    expect(toneOf(-0.006)).toBe('down');
    expect(toneOf(0.04, 1)).toBe('flat');
    expect(toneOf(null)).toBe('flat');
  });
});

describe('parseNumber', () => {
  it('accepts grouping commas, spaces and Devanagari digits', () => {
    expect(parseNumber('12,34,567.5')).toBe(1234567.5);
    expect(parseNumber(' 1 000 ')).toBe(1000);
    expect(parseNumber('१२३.४५')).toBe(123.45);
    expect(parseNumber('-.5')).toBe(-0.5);
    expect(parseNumber('7.')).toBe(7);
  });

  it('is NaN for empty or invalid input', () => {
    for (const s of ['', '-', 'abc', '1.2.3', '1e5', '--1']) expect(Number.isNaN(parseNumber(s))).toBe(true);
  });
});

describe('searchSymbols', () => {
  const all = [
    { symbol: 'NABIL', name: 'Nabil Bank Limited' },
    { symbol: 'NABBC', name: 'Narayani Development Bank' },
    { symbol: 'ADBL', name: 'Agricultural Development Bank' },
    { symbol: 'SANIMA', name: 'Sanima Bank' },
  ];

  it('ranks exact symbol, symbol prefix, name word, then symbol contains', () => {
    expect(searchSymbols(all, 'nabil').map((o) => o.symbol)).toEqual(['NABIL']);
    expect(searchSymbols(all, 'nab').map((o) => o.symbol)).toEqual(['NABBC', 'NABIL']);
    expect(searchSymbols(all, 'development').map((o) => o.symbol)).toEqual(['ADBL', 'NABBC']);
    expect(searchSymbols(all, 'ima').map((o) => o.symbol)).toEqual(['SANIMA']);
  });

  it('returns nothing for a blank query and respects the limit', () => {
    expect(searchSymbols(all, '  ')).toEqual([]);
    expect(searchSymbols(all, 'bank', 2)).toHaveLength(2);
  });
});

describe('segmentTarget', () => {
  it('wraps at both ends and handles Home and End', () => {
    const v = ['20', '60', '90'];
    expect(segmentTarget(v, '60', 'ArrowRight')).toBe('90');
    expect(segmentTarget(v, '90', 'ArrowRight')).toBe('20');
    expect(segmentTarget(v, '20', 'ArrowLeft')).toBe('90');
    expect(segmentTarget(v, '60', 'ArrowDown')).toBe('90');
    expect(segmentTarget(v, '60', 'ArrowUp')).toBe('20');
    expect(segmentTarget(v, '60', 'Home')).toBe('20');
    expect(segmentTarget(v, '20', 'End')).toBe('90');
    expect(segmentTarget(v, '20', 'Enter')).toBeNull();
    expect(segmentTarget([], '20', 'ArrowRight')).toBeNull();
  });
});


describe('shortCompanyName', () => {
  const suffixes = ['company limited', 'co ltd', 'co ltd.', 'co, ltd', 'co, ltd.', 'co. ltd', 'co. ltd.', 'co., ltd', 'co., ltd.', 'limited', 'ltd', 'ltd.'];

  it('removes only a terminal legal suffix with a preceding whitespace character', () => {
    expect(shortCompanyName('Alpha Company Limited')).toBe('Alpha');
    expect(shortCompanyName('  Alpha   LIMITED')).toBe('Alpha');
    expect(shortCompanyName('Alpha\tLtd.')).toBe('Alpha');
    expect(shortCompanyName('Limited')).toBe('Limited');
    expect(shortCompanyName('AlphaLimited')).toBe('AlphaLimited');
    expect(shortCompanyName('Alpha Limited Studio')).toBe('Alpha Limited Studio');
    expect(shortCompanyName(' Alpha Ltd. ')).toBe('Alpha Ltd.');
    expect(shortCompanyName('')).toBe('');
  });

  it('preserves suffix trimming across arbitrary prefixes, casing and whitespace runs', () => {
    fc.assert(fc.property(
      fc.string({ maxLength: 80 }),
      fc.constantFrom(...suffixes),
      fc.array(fc.constantFrom(' ', '\t', '\n', '\r', '\u00a0', '\u2003', '\ufeff'), { minLength: 1, maxLength: 100 }),
      fc.boolean(),
      (prefix, suffix, whitespace, upper) => {
        const name = `${prefix}!${whitespace.join('')}${upper ? suffix.toUpperCase() : suffix}`;
        expect(shortCompanyName(name)).toBe(`${prefix}!`.trim());
      },
    ), { numRuns: NUM_RUNS });
  });

  it('handles long matching and nonmatching whitespace inputs', () => {
    const spaces = ' '.repeat(1_000_000);
    expect(shortCompanyName(`${spaces}Studio`)).toBe('Studio');
    expect(shortCompanyName(`Alpha${spaces}Ltd.`)).toBe('Alpha');
    expect(shortCompanyName(spaces)).toBe('');
  });
});
