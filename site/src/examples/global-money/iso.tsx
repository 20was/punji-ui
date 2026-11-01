import { useEffect, useState } from 'react';
import { Field } from '@punji/ui/fields';
import { DataRow, DataRows } from '@punji/ui/rows';
import { Stack } from '@punji/ui/stack';
import type * as IsoModule from '@punji/ui/money/iso4217';

type Iso = typeof IsoModule;

export default function Example() {
  const [iso, setIso] = useState<Iso | null>(null);
  const [query, setQuery] = useState('KWD');
  // The table loads only when a page needs it.
  useEffect(() => { void import('@punji/ui/money/iso4217').then(setIso); }, []);
  const entry = iso ? (/^\d+$/.test(query) ? iso.getIso4217ByNumeric(query) : iso.getIso4217(query)) : undefined;
  return (
    <Stack className="ex-narrow">
      <Field label="Currency code or number" value={query} onChange={setQuery} maxLength={3} />
      {!iso ? <p>Loading…</p> : entry ? (
        <DataRows label="ISO 4217">
          <DataRow label="Code" value={entry.code} />
          <DataRow label="Numeric" value={entry.numeric} />
          <DataRow label="Minor units" value={String(entry.minorUnits)} />
          <DataRow label="Name" value={iso.currencyName(entry.code)} />
        </DataRows>
      ) : <p>Not an active ISO 4217 currency ({iso.listIso4217().length} known).</p>}
    </Stack>
  );
}
