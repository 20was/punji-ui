import { useState } from 'react';
import { BeneficiarySelector } from '@punji/ui/beneficiary-selector';
import { beneficiaries } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

// Choosing a payee only calls onChange. Nothing is submitted; confirm the payee on your server.
export default function Example() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <Stack style={{ minHeight: 360 }}>
      <BeneficiarySelector label="Pay to" beneficiaries={beneficiaries} value={value} onChange={setValue} />
      <p aria-live="polite">Chosen id: {value ?? 'none'}</p>
    </Stack>
  );
}
