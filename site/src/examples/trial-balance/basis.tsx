import { useState } from 'react';
import { TrialBalance } from '@punji/ui/trial-balance';
import { SegmentedControl } from '@punji/ui/controls';
import { journals } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

type Basis = 'net' | 'totals';

export default function Example() {
  const [basis, setBasis] = useState<Basis>('net');
  return (
    <Stack>
      <SegmentedControl<Basis>
        label="Basis"
        prefix="tb-basis"
        size="sm"
        value={basis}
        onChange={setBasis}
        options={[{ value: 'net', label: 'Net' }, { value: 'totals', label: 'Gross totals' }]}
      />
      <TrialBalance caption="Trial balance, Shrawan 2081 (NPR)" data={journals} basis={basis} />
    </Stack>
  );
}
