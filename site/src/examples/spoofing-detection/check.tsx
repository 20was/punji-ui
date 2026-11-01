import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Field } from '@punji/ui/fields';
import { DataRow, DataRows } from '@punji/ui/rows';
import { Cluster, Stack } from '@punji/ui/stack';
import { detectSpoofing } from '@punji/ui/trust';

const ch = (cp: number) => String.fromCodePoint(cp);
const KNOWN = ['Nabil Bank', 'Paypal'];
const SAMPLES: { label: string; value: string }[] = [
  { label: 'Plain', value: 'Ram Bahadur Thapa' },
  { label: 'Devanagari', value: 'राम बहादुर थापा' },
  { label: 'Cyrillic a', value: `N${ch(0x430)}bil Bank` },
  { label: 'Digit 1', value: 'Paypa1' },
  { label: 'Bidi override', value: `Sita${ch(0x202e)}amrahs` },
  { label: 'Zero width', value: `Pay${ch(0x200b)}pal` },
];

export default function Example() {
  const [name, setName] = useState(SAMPLES[2]!.value);
  const check = detectSpoofing(name, { known: KNOWN });
  return (
    <Stack className="ex-narrow">
      <Field label="Payee name" value={name} onChange={setName} hint={`Known payees: ${KNOWN.join(', ')}`} />
      <Cluster gap={2}>
        {SAMPLES.map((s) => <Button key={s.label} size="sm" variant="secondary" onClick={() => setName(s.value)}>{s.label}</Button>)}
      </Cluster>
      <DataRows label="Result">
        <DataRow label="Risk" value={check.risk} />
        <DataRow label="Scripts" value={check.scripts.join(', ') || '—'} />
        <DataRow label="Shown as" value={<bdi>{check.display}</bdi>} />
        <DataRow label="Looks like" value={check.lookalikeOf ?? '—'} />
      </DataRows>
      {check.issues.length > 0 && <ul>{check.issues.map((i) => <li key={i.kind}>{i.message}{i.codePoints ? ` (${i.codePoints.join(', ')})` : ''}</li>)}</ul>}
    </Stack>
  );
}
