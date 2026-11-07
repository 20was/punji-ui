import { useState } from 'react';
import { Field } from '@punji/ui/fields';
import { filtersToQueryString, searchParamsToFilters, type FilterSchema } from '@punji/ui/filter-url';
import { Stack } from '@punji/ui/stack';

const SCHEMA = {
  pe: { kind: 'range', fractionDigits: 2 },
  price: { kind: 'range', fractionDigits: 2, min: '0' },
  sector: { kind: 'multi', options: ['banks', 'hydro', 'life'] },
  breakout: { kind: 'boolean' },
} as const satisfies FilterSchema;

// Type or paste any query. It is read against the schema (unknown keys, mangled values and extra decimals are
// skipped, never thrown on) and written back in one stable order. Reading what was written changes nothing.
export default function Example() {
  const [query, setQuery] = useState('?breakout=true&sector=life,banks&price=0050.50..&pe=-2..12&utm_source=x');
  const filters = searchParamsToFilters(SCHEMA, query);
  const written = filtersToQueryString(SCHEMA, filters);
  const again = filtersToQueryString(SCHEMA, searchParamsToFilters(SCHEMA, written));
  return (
    <Stack>
      <Field label="Query string" value={query} onChange={setQuery} hint="Try pe=1e3..5 or price=1.239.." testId="query" />
      <dl style={{ margin: 0, display: 'grid', gap: 'var(--pu-space-1)', fontSize: 'var(--pu-text-sm)' }}>
        <div>
          <dt style={{ color: 'var(--pu-color-text-muted)' }}>Read as</dt>
          <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>
            <code>{JSON.stringify(filters)}</code>
          </dd>
        </div>
        <div>
          <dt style={{ color: 'var(--pu-color-text-muted)' }}>Written back</dt>
          <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>
            <code>{written || '(no filters)'}</code>
          </dd>
        </div>
        <div>
          <dt style={{ color: 'var(--pu-color-text-muted)' }}>Written after reading it again</dt>
          <dd style={{ margin: 0 }}>{again === written ? 'The same.' : 'Different (this never happens).'}</dd>
        </div>
      </dl>
    </Stack>
  );
}
