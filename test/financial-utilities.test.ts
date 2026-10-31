import * as fc from 'fast-check';
import { NUM_RUNS } from './fc.ts';
import { describe, it, expect } from 'vitest';
import { formatMinorUnits, createFinancialFormatters } from '../src/nepal/financial-format.ts';
import { parseLocalizedDecimal } from '../src/nepal/decimal.ts';
import { parseMinorUnits } from '../src/nepal/money.ts';
describe('exact financial formatting', () => {
  it('preserves huge amounts and fractional leading zeroes', () => {
    expect(formatMinorUnits(900719925474099399n)).toBe('NPR 9,00,71,99,25,47,40,993.99');
    expect(formatMinorUnits(1n)).toBe('NPR 0.01');
    expect(formatMinorUnits(-1n, { accounting: true })).toBe('(NPR 0.01)');
    expect(formatMinorUnits(123456789n, { language:'ne', digits:'deva' })).toBe('रु १२,३४,५६७.८९');
    expect(formatMinorUnits(123n, {scale:0})).toBe('NPR 123');
    expect(() => createFinancialFormatters({scale:10})).toThrow('scale must be 0–9');
  });
  it('preserves arbitrary signed minor units across supported scales', () => {
    fc.assert(fc.property(fc.bigInt({min: -(10n ** 30n), max: 10n ** 30n}), fc.integer({min:0,max:9}), (value, scale) => {
      const text = formatMinorUnits(value, {currency:'',scale,digits:'deva'}).replace(/^−/, '-');
      const parsed = parseLocalizedDecimal(text, {maxFractionDigits:scale});
      if (parsed.state !== 'valid') throw new Error('Formatted numeric text must parse');
      expect(parseMinorUnits(parsed.value,scale)).toBe(value);
    }), {numRuns: NUM_RUNS});
  });
  it('round trips signed exact values through Nepal display normalization', () => {
    const format = createFinancialFormatters({currency:'',digits:'deva'}).formatMinorUnits;
    for (const value of [0n, 1n, 99n, 100n, 123456789n, 900719925474099399n]) {
      const parsed = parseLocalizedDecimal(format(value).trim());
      expect(parsed.state).toBe('valid');
      if (parsed.state !== 'valid') throw new Error('Expected valid decimal');
      expect(parseMinorUnits(parsed.value)).toBe(value);
    }
  });
});
describe('localized decimal validation', () => {
  it('recognizes editing states and canonical exact values', () => {
    expect(parseLocalizedDecimal(' ')).toEqual({state:'empty'});
    for (const text of ['-', '.', '-.', '12.']) expect(parseLocalizedDecimal(text)).toEqual({state:'partial'});
    expect(parseLocalizedDecimal('−12')).toEqual({state:'invalid',reason:'syntax'});
    expect(parseLocalizedDecimal(' -१२,३४५.६७ ')).toEqual({state:'valid',value:'-12345.67'});
    expect(parseLocalizedDecimal('-.5')).toEqual({state:'valid',value:'-0.5'});
    expect(parseLocalizedDecimal('-०.००')).toEqual({state:'valid',value:'0.00'});
  });
  it('rejects malformed grouping, excess precision and unexpected syntax', () => {
    for (const text of ['1,234,567','12,34','1,,234']) expect(parseLocalizedDecimal(text)).toEqual({state:'invalid',reason:'grouping'});
    expect(parseLocalizedDecimal('123,456')).toEqual({state:'valid',value:'123456'});
    expect(parseLocalizedDecimal('1,234,567',{grouping:'western'})).toEqual({state:'valid',value:'1234567'});
    expect(parseLocalizedDecimal('1.001')).toEqual({state:'invalid',reason:'precision'});
    for (const text of ['1e3','1 234','NPR 12','+2','1.2.3']) expect(parseLocalizedDecimal(text)).toEqual({state:'invalid',reason:'syntax'});
  });
});
