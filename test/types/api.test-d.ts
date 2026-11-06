import { describe, expectTypeOf, it } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import {
  createMoneyFormatter,
  parseMoney,
  type MoneyDisplay,
  StockTable,
  type MoneyFormatConfig,
  type MoneyFormatter,
  type MoneyParseResult,
  type Quote,
  type SelectOption,
  type SelectProps,
  type StockTableProps,
} from '../../src/index.ts';

describe('money API types', () => {
  it('createMoneyFormatter takes a config and returns a formatter', () => {
    expectTypeOf(createMoneyFormatter).parameter(0).toEqualTypeOf<MoneyFormatConfig>();
    expectTypeOf(createMoneyFormatter).returns.toEqualTypeOf<MoneyFormatter>();
  });

  it('formatter methods take bigint minor units, never number', () => {
    const fmt = createMoneyFormatter({ currency: 'NPR' });
    expectTypeOf(fmt.format).parameter(0).toEqualTypeOf<bigint>();
    expectTypeOf(fmt.format).returns.toBeString();
    expectTypeOf(fmt.toDecimal).parameter(0).toEqualTypeOf<bigint>();
    // @ts-expect-error a number is not minor units
    void (() => fmt.format(100));
  });

  it('parse result is a discriminated union that narrows to minor: bigint', () => {
    expectTypeOf(parseMoney).returns.toEqualTypeOf<MoneyParseResult>();
    const result = parseMoney('1,234.50', { currency: 'NPR' });
    expectTypeOf(result.state).toEqualTypeOf<'empty' | 'partial' | 'invalid' | 'valid'>();
    if (result.state === 'valid') {
      expectTypeOf(result.minor).toEqualTypeOf<bigint>();
      expectTypeOf(result.value).toBeString();
    } else if (result.state === 'invalid') {
      expectTypeOf(result.reason).toEqualTypeOf<'syntax' | 'grouping' | 'precision' | 'length'>();
      // @ts-expect-error minor exists only on the valid state
      void result.minor;
    } else {
      // @ts-expect-error minor exists only on the valid state
      void result.minor;
    }
  });

  it('money props take bigint or an exact decimal string, and reject number', () => {
    type Props = ComponentProps<typeof MoneyDisplay>;
    expectTypeOf<Props['value']>().toEqualTypeOf<bigint | string | null | undefined>();
    expectTypeOf<number>().not.toExtend<NonNullable<Props['value']>>();
    // @ts-expect-error number is not accepted as a money value
    const bad: Props = { currency: 'NPR', value: 100 };
    void bad;
  });
});

describe('table generics', () => {
  interface Row extends Quote { broker: string }

  it('StockTable keeps the caller row type through quotes and renderSymbol', () => {
    expectTypeOf<StockTableProps<Row>['quotes']>().toEqualTypeOf<readonly Row[]>();
    expectTypeOf<StockTableProps<Row>['renderSymbol']>().toEqualTypeOf<((quote: Row) => ReactNode) | undefined>();
    expectTypeOf<StockTableProps>().toEqualTypeOf<StockTableProps<Quote>>();
    expectTypeOf(StockTable<Row>).parameter(0).toEqualTypeOf<StockTableProps<Row>>();
  });

  it('StockTable rejects rows that are not quotes', () => {
    // @ts-expect-error string does not extend Quote
    type Bad = StockTableProps<string>;
    expectTypeOf<Bad>().not.toBeNever();
  });
});

describe('Select generics', () => {
  it('SelectOption infers the literal union as value', () => {
    type Sector = 'bank' | 'hydro';
    expectTypeOf<SelectOption<Sector>['value']>().toEqualTypeOf<Sector>();
    expectTypeOf<SelectOption>().toEqualTypeOf<SelectOption<string>>();
    const options = [{ value: 'bank', label: 'Banks' }, { value: 'hydro', label: 'Hydro' }] as const satisfies readonly SelectOption<Sector>[];
    expectTypeOf(options[0].value).toEqualTypeOf<'bank'>();
  });

  it('SelectProps ties value, onChange and options to one type parameter', () => {
    type P = SelectProps<'a' | 'b'>;
    expectTypeOf<P['value']>().toEqualTypeOf<'a' | 'b'>();
    expectTypeOf<P['onChange']>().toEqualTypeOf<(v: 'a' | 'b') => void>();
    expectTypeOf<P['options']>().toEqualTypeOf<readonly SelectOption<'a' | 'b'>[]>();
    // @ts-expect-error T must extend string
    type Bad = SelectOption<number>;
    expectTypeOf<Bad>().not.toBeNever();
  });
});
