import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { HoldToConfirm } from '@punji/ui/hold-to-confirm';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  return (
    <Stack className="ex-narrow">
      <HoldToConfirm key={round} mode="cooling-off" delaySeconds={5} tone="primary" onConfirm={() => setDone(true)}>Add new payee</HoldToConfirm>
      <p>{done ? 'Payee added.' : 'Take a moment: is this someone you know?'}</p>
      <Button variant="secondary" size="sm" onClick={() => { setRound((n) => n + 1); setDone(false); }}>Restart</Button>
    </Stack>
  );
}
