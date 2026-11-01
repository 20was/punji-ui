import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { SessionTimeoutWarning } from '@punji/ui/session-timeout';
import { Stack } from '@punji/ui/stack';

// A 30 second session that warns 20 seconds before the end (the WCAG minimum). Real sessions come from your server.
export default function Example() {
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [state, setState] = useState('Not started.');
  return (
    <Stack className="ex-narrow">
      <Button onClick={() => { setExpiresAt(Date.now() + 30_000); setState('Signed in. The warning opens in about 10 seconds.'); }}>Start a 30 second session</Button>
      <p>{state}</p>
      {expiresAt !== null && (
        <SessionTimeoutWarning
          expiresAt={expiresAt}
          warnBefore={20_000}
          onExtend={() => { setExpiresAt(Date.now() + 30_000); setState('Extended for another 30 seconds.'); }}
          onSignOut={() => { setExpiresAt(null); setState('Signed out.'); }}
          onExpire={() => { setExpiresAt(null); setState('Session ended: signed out.'); }}
        />
      )}
    </Stack>
  );
}
