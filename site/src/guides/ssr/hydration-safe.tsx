'use client';

import { useHydrated, useMediaQuery } from '@punji/ui/hooks';

/**
 * Anything that differs between the server and the browser (the clock, the viewport, localStorage) must
 * render the same thing on the first client pass as the server did, then change after hydration.
 */
export function SessionClock({ now }: { now: Date }) {
  const hydrated = useHydrated();
  // Second argument: what the server (and the first client pass) assumes. Use the same value on both sides.
  const wide = useMediaQuery('(min-width: 900px)', true);
  return (
    <p>
      {hydrated ? now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kathmandu' }) : '--:--:--'}
      {wide ? ' (Kathmandu time)' : ''}
    </p>
  );
}
