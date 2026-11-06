/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { Delta, Figure, addMoney, compactRs, createMoneyFormatter, isMoney, isSameCurrency, money, subtractMoney, type CurrencyCode, type Money, type MoneyFormatter } from '../src/index.ts';

describe('Money value type', () => {
  it('builds, compares and combines exactly', () => {
    const a = money(1050n, 'usd');
    expect(a).toEqual({ minor: 1050n, currency: 'USD' });
    expect(isMoney(a)).toBe(true);
    expect(isMoney(12)).toBe(false);
    expect(isSameCurrency(a, money(1n, 'USD'))).toBe(true);
    expect(addMoney(a, money(50n, 'USD')).minor).toBe(1100n);
    expect(subtractMoney(a, money(2000n, 'USD')).minor).toBe(-950n);
  });
  it('throws on mixed currencies', () => {
    expect(() => addMoney(money(1n, 'USD'), money(1n, 'NPR'))).toThrow(TypeError);
    expect(() => subtractMoney(money(1n, 'USD'), money(1n, 'EUR'))).toThrow(/convert first/);
  });
  it('rejects bad input at runtime', () => {
    expect(() => money(1n, 'DOLLARS')).toThrow(RangeError);
    expect(() => money(1.5 as unknown as bigint, 'USD')).toThrow(TypeError);
  });
  it('rejects numbers in the type system', () => {
    expectTypeOf(money).parameter(0).toEqualTypeOf<bigint>();
    expectTypeOf(addMoney).parameters.toEqualTypeOf<[Money, Money]>();
    expectTypeOf<Money['minor']>().toEqualTypeOf<bigint>();
    expectTypeOf<CurrencyCode>().toBeString();
    expectTypeOf<MoneyFormatter['format']>().parameter(0).toEqualTypeOf<bigint>();
    expect(() => {
      // @ts-expect-error a number is not Money
      addMoney(5, money(1n, 'USD'));
    }).toThrow(/minor|bigint|Cannot|undefined|convert/);
    expect(() => {
      // @ts-expect-error minor units are bigint, not number
      money(100, 'USD');
    }).toThrow(TypeError);
  });
});

describe('Figure and Delta money mode', () => {
  it('prints a Money through the default or a given formatter', () => {
    const nepal = createMoneyFormatter({ currency: 'NPR', locale: 'en-IN', display: 'code' });
    const { container } = render(<><Figure value={money(123456n, 'USD')} /><Figure value={money(123456789n, 'NPR')} formatter={nepal} /></>);
    const text = [...container.querySelectorAll('.kit-fig')].map((n) => n.textContent);
    expect(text[0]).toBe('$1,234.56');
    expect(text[1]?.replace(/\s/g, ' ')).toBe('NPR 12,34,567.89');
  });
  it('rejects a formatter of another currency', () => {
    expect(() => render(<Figure value={money(1n, 'USD')} formatter={createMoneyFormatter({ currency: 'EUR' })} />)).toThrow(/EUR/);
  });
  it('Delta signs, tones and prints money exactly', () => {
    const { container } = render(<><Delta value={money(-2500n, 'USD')} /><Delta value={money(0n, 'USD')} /><Delta value={money(2500n, 'USD')} /></>);
    const [dn, flat, up] = [...container.querySelectorAll('.kit-fig')];
    expect(dn!.className).toContain('kit-dn');
    expect(dn!.textContent).toContain('−$25.00');
    expect(flat!.className).toContain('kit-flat');
    expect(up!.textContent).toContain('+$25.00');
  });
  it('leaves number paths unchanged', () => {
    const { container } = render(<><Figure value={842610} kind="rs" /><Delta value={1.25} /></>);
    expect(container.textContent).toContain('Rs 8,42,610.00');
    expect(container.textContent).toContain('+1.25%');
    expect(compactRs(12_400_000, { lakh: 'L', crore: 'Cr', arba: 'Arba' }).short).toBe('Rs 1.24 Cr');
  });
});
