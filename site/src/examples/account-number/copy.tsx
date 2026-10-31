import { useState } from 'react';
import { AccountNumber } from '@punji/ui/account-number';
import { sampleAccountNumber } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

// copyable puts the FULL number on the clipboard when the reader presses the copy button, and never otherwise.
// onRevealedChange is the place to write an audit event: it receives true or false, never the number.
export default function Example() {
  const [log, setLog] = useState<string[]>([]);
  return (
    <Stack>
      <AccountNumber
        value={sampleAccountNumber}
        copyable
        autoHideMs={10000}
        onRevealedChange={(revealed) => setLog((entries) => [...entries.slice(-2), revealed ? 'revealed' : 'hidden'])}
      />
      <p aria-live="polite">Audit events: {log.length ? log.join(', ') : 'none yet'}</p>
    </Stack>
  );
}
