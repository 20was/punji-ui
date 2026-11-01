import { useState } from 'react';
import { EdisConfirmation } from '@punji/ui/edis-confirmation';
import { InlineState } from '@punji/ui/inline-state';
import { edisTransfers } from '../../sample.ts';

export default function Example() {
  const [done, setDone] = useState<bigint | null>(null);
  if (done !== null) return <InlineState icon="check" title="Transfer sent" body={`${done.toString()} units are on their way to the broker.`} />;
  return <EdisConfirmation transfers={edisTransfers} onConfirm={({ units }) => setDone(units)} />;
}
