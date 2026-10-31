import { useState } from 'react';
import { ChoiceGroup } from '@punji/ui/choice-group';
import { Stack } from '@punji/ui/stack';

type Kind = 'all' | 'buy' | 'sell' | 'bonus';

// Native radios: the browser provides arrow keys, one tab stop and disabled handling.
export default function Example() {
  const [kind, setKind] = useState<Kind>('all');
  return (
    <Stack>
      <ChoiceGroup<Kind>
        label="Transaction type"
        testId="choice-kind"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'all', label: 'All' },
          { value: 'buy', label: 'Buy' },
          { value: 'sell', label: 'Sell' },
          { value: 'bonus', label: 'Bonus', disabled: true },
        ]}
      />
      <ChoiceGroup<Kind>
        label="Transaction type, compact"
        testId="choice-kind-compact"
        appearance="compact"
        size="md"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'all', label: 'All' },
          { value: 'buy', label: 'Buy' },
          { value: 'sell', label: 'Sell' },
        ]}
      />
    </Stack>
  );
}
