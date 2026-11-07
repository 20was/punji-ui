import { InstrumentHeader } from '@punji/ui/instrument-header';
import { Stack } from '@punji/ui/stack';

// An index is not money: pass the value and the published move as text. The direction is an arrow and a word.
export default function Example() {
  return (
    <Stack gap={4}>
      <InstrumentHeader symbol="NEPSE" tag="Index" name="Nepal Stock Exchange index" figure="2,641.18" figureChange={{ text: '+12.40 · +0.47%', direction: 'up' }} />
      <InstrumentHeader symbol="Sensitive" tag="Index" name="Sensitive index" figure="528.77" figureChange={{ text: '−1.02 · −0.19%', direction: 'down' }} />
    </Stack>
  );
}
