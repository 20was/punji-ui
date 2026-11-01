import { useState } from 'react';
import { Field } from '@punji/ui/fields';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  const [name, setName] = useState('Sita Sharma');
  const [email, setEmail] = useState('sita@');
  const [search, setSearch] = useState('');
  const invalid = !/^\S+@\S+\.\S+$/.test(email);
  return (
    <Stack style={{ width: 'min(100%, 440px)', marginInline: 'auto' }}>
      <Field label="Account name" value={name} onChange={setName} hint="Shown on statements" autoComplete="name" />
      <Field label="Email" type="email" value={email} onChange={setEmail} error={invalid ? 'Enter a full address, such as sita@example.com' : undefined} autoComplete="email" />
      {/* size="md" is the 36px toolbar height; hideLabel keeps the label for screen readers only. */}
      <Field label="Filter transactions" size="md" hideLabel placeholder="Filter transactions" value={search} onChange={setSearch} />
    </Stack>
  );
}
