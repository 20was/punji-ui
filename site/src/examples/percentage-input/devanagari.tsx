import { useState } from 'react';
import { PercentageInput } from '@punji/ui/percentage-input';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  const [rate, setRate] = useState('11.25');
  return (
    <Stack style={{ width: 'min(100%, 440px)', marginInline: 'auto' }}>
      <PercentageInput
        label="मुद्दती निक्षेप ब्याजदर"
        hint="वार्षिक दर"
        value={rate}
        digits="deva"
        maxFractionDigits={2}
        min="0"
        max="20"
        unitLabel="प्रतिशत"
        onValueChange={(change) => setRate(change.value)}
      />
      <p className="doc-muted">Exact value: <code>{rate === '' ? '(empty)' : rate}</code></p>
    </Stack>
  );
}
