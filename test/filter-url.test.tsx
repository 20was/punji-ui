import { act, render } from '@testing-library/react';
import * as fc from 'fast-check';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import {
  activeFilterKeys,
  filtersEqual,
  filtersToLink,
  filtersToQueryString,
  filtersToSearchParams,
  normalizeDecimal,
  normalizeFilters,
  searchParamsToFilters,
  useUrlFilters,
  type FilterSchema,
  type FilterValues,
  type UseUrlFiltersResult,
} from '../src/index.ts';
import { compareDecimals } from '../src/nepal/decimal.ts';

const schema = {
  pe: { kind: 'range', fractionDigits: 2 },
  price: { kind: 'range', fractionDigits: 2, min: '0', max: '100000' },
  sector: { kind: 'multi', options: ['banks', 'hydro', 'insurance', 'a,b'] },
  tags: { kind: 'multi' },
  breakout: { kind: 'boolean' },
} as const satisfies FilterSchema;

describe('normalizeDecimal', () => {
  it.each([
    ['7', '7'],
    ['007.50', '7.5'],
    ['-0', '0'],
    ['-0.00', '0'],
    ['-12.340', '-12.34'],
    ['१२.५', '12.5'],
    ['−5', '-5'],
    [' 3 ', '3'],
  ])('reads %s as %s', (input, out) => expect(normalizeDecimal(input)).toBe(out));

  it.each(['', '.', '-', '1e3', '0x10', '1,000', '+5', '1.2.3', 'NaN', 'Infinity', '1.23456', '9'.repeat(31)])('rejects %s', (input) => expect(normalizeDecimal(input)).toBeNull());

  it('keeps money exact where Number would not', () => {
    expect(normalizeDecimal('0.1')).toBe('0.1');
    expect(normalizeDecimal('9007199254740993')).toBe('9007199254740993');
    expect(normalizeDecimal('0.30000000000000004', 17)).toBe('0.30000000000000004');
  });
});

describe('filtersToSearchParams', () => {
  it('writes by key, alphabetically, whatever the object order', () => {
    const a = filtersToQueryString(schema, { sector: ['hydro', 'banks'], breakout: true, pe: { max: '12' } });
    const b = filtersToQueryString(schema, { pe: { max: '12' }, breakout: true, sector: ['banks', 'hydro'] });
    expect(a).toBe('breakout=1&pe=..12&sector=banks%2Chydro');
    expect(b).toBe(a);
  });

  it('writes a range with a negative end and exact decimals', () => {
    expect(filtersToQueryString(schema, { pe: { min: '-5.50', max: '-1' } })).toBe('pe=-5.5..-1');
    expect(filtersToQueryString(schema, { price: { min: '0.10' } })).toBe('price=0.1..');
  });

  it('percent-encodes each multi value on its own, so a comma inside one survives', () => {
    const query = filtersToQueryString(schema, { sector: ['a,b', 'banks'] });
    expect(searchParamsToFilters(schema, query).sector).toEqual(['banks', 'a,b']);
  });

  it('omits an off, empty or unknown filter', () => {
    expect(filtersToQueryString(schema, { breakout: false, sector: [], pe: {}, nope: true } as FilterValues<typeof schema>)).toBe('');
  });

  it('keeps other parameters and replaces the schema keys', () => {
    expect(filtersToSearchParams(schema, { pe: { max: '9' } }, 'sort=pe&pe=..1&page=2').toString()).toBe('sort=pe&page=2&pe=..9');
  });

  it('swaps crossed ends, clamps to the schema and drops a range with too many fraction digits', () => {
    expect(filtersToQueryString(schema, { pe: { min: '20', max: '5' } })).toBe('pe=5..20');
    expect(filtersToQueryString(schema, { price: { min: '-5', max: '999999' } })).toBe('price=0..100000');
    expect(filtersToQueryString(schema, { pe: { min: '1.239', max: '4' } })).toBe('');
  });

  it('refuses a key that cannot be a parameter name', () => {
    expect(() => filtersToQueryString({ 'a&b': { kind: 'boolean' } }, {})).toThrow(RangeError);
  });
});

describe('searchParamsToFilters', () => {
  it('reads a string, a URLSearchParams and a router object alike', () => {
    const want = { pe: { max: '12' }, breakout: true };
    expect(searchParamsToFilters(schema, '?pe=..12&breakout=1')).toEqual(want);
    expect(searchParamsToFilters(schema, new URLSearchParams('pe=..12&breakout=true'))).toEqual(want);
    expect(searchParamsToFilters(schema, { pe: '..12', breakout: ['0', '1'] })).toEqual(want);
  });

  it('skips what it cannot read and never throws', () => {
    const got = searchParamsToFilters(schema, 'pe=abc&price=1e3..5&sector=nope,banks,banks&unknown=1&breakout=maybe&tags=%E0%A4%A');
    expect(got).toEqual({ sector: ['banks'], tags: [expect.any(String)] });
  });

  it('takes the last of a repeated key', () => {
    expect(searchParamsToFilters(schema, 'pe=..1&pe=..2')).toEqual({ pe: { max: '2' } });
  });

  it('reads Devanagari digits and a Unicode minus', () => {
    expect(searchParamsToFilters(schema, 'pe=−१..१२')).toEqual({ pe: { min: '-1', max: '12' } });
  });
});

const digits = (n: number) => fc.string({ unit: fc.constantFrom(...'0123456789'), minLength: 1, maxLength: n });

describe('round trip', () => {
  const decimal = fc.tuple(fc.boolean(), digits(8), fc.option(digits(4), { nil: undefined })).map(([neg, whole, frac]) => `${neg ? '-' : ''}${whole}${frac === undefined ? '' : `.${frac}`}`);
  const end = fc.option(decimal, { nil: undefined });
  const values = fc.record(
    {
      pe: fc.record({ min: end, max: end }, { requiredKeys: [] }),
      price: fc.record({ min: end, max: end }, { requiredKeys: [] }),
      sector: fc.array(fc.constantFrom('banks', 'hydro', 'insurance', 'a,b', 'zzz'), { maxLength: 6 }),
      tags: fc.array(fc.string({ maxLength: 12 }), { maxLength: 6 }),
      breakout: fc.boolean(),
    },
    { requiredKeys: [] },
  );

  it('parse(serialize(v)) equals normalize(v)', () => {
    fc.assert(
      fc.property(values, (v) => {
        const typed = v as FilterValues<typeof schema>;
        expect(searchParamsToFilters(schema, filtersToSearchParams(schema, typed))).toEqual(normalizeFilters(schema, typed));
      }),
    );
  });

  it('normalising twice changes nothing, and equal filters write equal links', () => {
    fc.assert(
      fc.property(values, (v) => {
        const once = normalizeFilters(schema, v as FilterValues<typeof schema>);
        expect(normalizeFilters(schema, once)).toEqual(once);
        expect(filtersEqual(schema, v as FilterValues<typeof schema>, once)).toBe(true);
      }),
    );
  });

  it('any query string decodes without throwing and settles after one trip', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (raw) => {
        const first = searchParamsToFilters(schema, raw);
        const query = filtersToQueryString(schema, first);
        expect(searchParamsToFilters(schema, query)).toEqual(first);
        expect(filtersToQueryString(schema, searchParamsToFilters(schema, query))).toBe(query);
      }),
    );
  });

  it('a range never crosses and every end is a canonical decimal', () => {
    fc.assert(
      fc.property(values, (v) => {
        const r = normalizeFilters(schema, v as FilterValues<typeof schema>).pe;
        const ends = [r?.min, r?.max].filter((e): e is string => e !== undefined);
        expect(ends.every((e) => normalizeDecimal(e) === e)).toBe(true);
        expect(r?.min === undefined || r.max === undefined || compareDecimals(r.min, r.max) <= 0).toBe(true);
      }),
    );
  });
});

describe('filtersToLink', () => {
  it('puts the filters in a path or absolute link, keeping its other parameters and hash', () => {
    const f = { pe: { max: '12' }, breakout: true } as const;
    expect(filtersToLink('/screener', schema, f)).toBe('/screener?breakout=1&pe=..12');
    expect(filtersToLink('https://example.com/s?sort=pe&pe=..1#top', schema, f)).toBe('https://example.com/s?sort=pe&breakout=1&pe=..12#top');
    expect(filtersToLink('/screener?pe=..1', schema, {})).toBe('/screener');
  });
});

describe('activeFilterKeys', () => {
  it('lists the set filters in written order', () => {
    expect(activeFilterKeys(schema, { sector: ['banks'], breakout: true, pe: {} })).toEqual(['breakout', 'sector']);
  });
});

function Harness({ initial, onResult }: { initial: string; onResult: (r: UseUrlFiltersResult<typeof schema>, writes: string[]) => void }) {
  const [search, setSearch] = useState(initial);
  const [writes] = useState<string[]>([]);
  const result = useUrlFilters({
    schema,
    get: () => search,
    set: (next) => {
      writes.push(next);
      setSearch(next);
    },
  });
  onResult(result, writes);
  return <output data-testid="q">{search}</output>;
}

describe('useUrlFilters', () => {
  it('reads the address, writes changes through `set` and keeps other parameters', () => {
    let latest!: UseUrlFiltersResult<typeof schema>;
    let writes: string[] = [];
    const { getByTestId } = render(<Harness initial="?sort=pe&pe=..12" onResult={(r, w) => ((latest = r), (writes = w))} />);
    expect(latest.filters).toEqual({ pe: { max: '12' } });
    expect(latest.active).toEqual(['pe']);
    act(() => latest.setField('breakout', true));
    expect(getByTestId('q').textContent).toBe('sort=pe&breakout=1&pe=..12');
    act(() => latest.setField('sector', ['banks', 'hydro']));
    expect(latest.filters).toEqual({ pe: { max: '12' }, breakout: true, sector: ['banks', 'hydro'] });
    expect(latest.shareLink('/screener')).toBe('/screener?breakout=1&pe=..12&sector=banks%2Chydro');
    act(() => latest.clearField('pe'));
    expect(latest.search).toBe('breakout=1&sector=banks%2Chydro');
    act(() => latest.clear());
    expect(getByTestId('q').textContent).toBe('sort=pe');
    expect(writes).toHaveLength(4);
  });

  it('does not drop a change made in the same event as another', () => {
    let latest!: UseUrlFiltersResult<typeof schema>;
    render(<Harness initial="" onResult={(r) => (latest = r)} />);
    act(() => {
      latest.setField('breakout', true);
      latest.setField('pe', { min: '1' });
    });
    expect(latest.filters).toEqual({ breakout: true, pe: { min: '1' } });
  });

  it('replaces by default and pushes when asked', () => {
    const seen: boolean[] = [];
    function Probe({ replace }: { replace?: boolean }) {
      const r = useUrlFilters({ schema, get: () => '', set: (_s, o) => void seen.push(o.replace), ...(replace === undefined ? {} : { replace }) });
      return <button onClick={() => r.setField('breakout', true)}>go</button>;
    }
    const { getByText, rerender } = render(<Probe />);
    act(() => getByText('go').click());
    rerender(<Probe replace={false} />);
    act(() => getByText('go').click());
    expect(seen).toEqual([true, false]);
  });
});
