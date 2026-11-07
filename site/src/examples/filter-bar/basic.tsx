import { useState } from 'react';
import { FilterBar, type FilterBarField, type FilterBarGroup, type FilterBarValues } from '@punji/ui/filter-bar';
import { Stack } from '@punji/ui/stack';

const FIELDS: FilterBarField[] = [
  { kind: 'multi', id: 'sector', label: 'Sector', group: 'market', pinned: true, options: [{ value: 'banks', label: 'Commercial Banks', count: 20 }, { value: 'hydro', label: 'Hydro Power', count: 35 }, { value: 'life', label: 'Life Insurance', count: 12 }] },
  { kind: 'range', id: 'pe', label: 'Price to earnings', chipLabel: 'P/E', group: 'valuation', why: 'Price over earnings per share.', track: { min: '0', max: '60', step: '1' } },
  { kind: 'range', id: 'price', label: 'Last price', chipLabel: 'Price', group: 'valuation', fractionDigits: 2, formatValue: (v) => `Rs ${v}` },
  { kind: 'range', id: 'npl', label: 'Non-performing loans', chipLabel: 'NPL', group: 'bank', disabled: true },
  { kind: 'boolean', id: 'breakout', label: 'Breakout', group: 'flags' },
];
const GROUPS: FilterBarGroup[] = [
  { id: 'market', title: 'Market' },
  { id: 'valuation', title: 'Valuation' },
  { id: 'bank', title: 'Bank health', column: 2, note: 'Choose only banks under Sector first.' },
  { id: 'flags', title: 'Flags', column: 2 },
];

// The bar owns no state: values in, the next values out. Here they sit in useState; the screener example keeps them in the address.
export default function Example() {
  const [values, setValues] = useState<FilterBarValues>({ pe: { max: '12' } });
  return (
    <Stack>
      <FilterBar fields={FIELDS} groups={GROUPS} values={values} onChange={setValues} testId="bar" />
      <pre style={{ margin: 0, fontSize: 'var(--pu-text-xs)', color: 'var(--pu-color-text-muted)', overflowX: 'auto' }}>{JSON.stringify(values)}</pre>
    </Stack>
  );
}
