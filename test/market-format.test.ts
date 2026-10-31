import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { NUM_RUNS } from './fc.ts';
import { formatChange, formatBasisPoints, formatPrice, formatQuantity } from '../src/nepal/market-format.ts';
describe('financial display units', () => {
  it('keeps signs aligned with rounded output, including negative zero', () => {
    expect(formatChange(1.255)).toBe('+1.26');
    expect(formatChange(-1.255,{unit:'percent'})).toBe('−1.26%');
    for(const value of [0,-0,0.004,-0.004]) expect(formatChange(value)).toBe('0.00');
    expect(formatChange(0.005)).toBe('+0.01');
    expect(formatChange(-0.005)).toBe('−0.01');
    expect(formatChange(1.25,{unit:'percent'})).toBe('+1.25%');
    expect(formatChange(-0.004,{digits:'deva',unit:'percent'})).toBe('०.००%');
  });
  it('does not confuse basis points with ratios or percentage points', () => {
    expect(formatBasisPoints(25)).toBe('25 bps');
    expect(formatBasisPoints(25,{signed:true})).toBe('+25 bps');
    expect(formatBasisPoints(-0.4,{signed:true})).toBe('0 bps');
    expect(formatBasisPoints(1.25,{fractionDigits:2})).toBe('1.25 bps');
    expect(formatBasisPoints(-25,{digits:'deva'})).toBe('−२५ bps');
  });
  it('supports explicit quantity and price precision and huge whole-unit bigint values', () => {
    expect(formatQuantity(1234567)).toBe('12,34,567');
    expect(formatQuantity(12.345,{fractionDigits:3})).toBe('12.345');
    expect(formatQuantity(-12)).toBe('−12');
    expect(formatQuantity(9007199254740993n)).toBe('9,00,71,99,25,47,40,993');
    expect(formatPrice(1234.5,{currency:'NPR'})).toBe('NPR 1,234.50');
    expect(formatPrice(0.125,{fractionDigits:3})).toBe('0.125');
    expect(formatPrice(-0.004)).toBe('0.00');
    expect(formatPrice(1234567.5,{digits:'deva',currency:'रु'})).toBe('रु १२,३४,५६७.५०');
  });
  it('distinguishes missing data from zero and rejects invalid precision', () => {
    for(const value of [null,undefined,NaN,Infinity,-Infinity]) {
      expect(formatChange(value,{unit:'percent'})).toBe('—');
      expect(formatBasisPoints(value)).toBe('—');
      expect(formatPrice(value,{currency:'NPR',missing:'Unavailable'})).toBe('Unavailable');
      expect(formatQuantity(value)).toBe('—');
    }
    expect(formatPrice(0)).toBe('0.00');
    for(const fractionDigits of [-1,21,1.5,NaN]) {
      expect(()=>formatPrice(1,{fractionDigits})).toThrow('fractionDigits must be an integer from 0 to 20');
    }
  });
  it('makes opposite finite changes symmetric after rounding', () => {
    fc.assert(fc.property(fc.integer({min:1,max:10000000}),fc.integer({min:0,max:6}),(value,fractionDigits)=>{
      const options={fractionDigits};
      const decimal=value/1000000;
      expect(formatChange(-decimal,options)).toBe(formatChange(decimal,options).replace('+','−'));
    }),{numRuns:NUM_RUNS});
  });
});
