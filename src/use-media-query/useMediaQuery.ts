'use client';

// Adapted from MUI's useMediaQueryNew external-store pattern (MIT).
// See THIRD_PARTY_NOTICES.md for the source revision and licence.
import { useMemo, useSyncExternalStore } from 'react';

/** SSR and hydration use serverMatch; client renders follow the actual query.
 * Supply the same serverMatch on server and client. Prefer CSS for visual layout.
 */
export function useMediaQuery(query: string, serverMatch = false): boolean {
  const store = useMemo(() => {
    const media = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query) : null;
    return {
      getSnapshot: () => media?.matches ?? serverMatch,
      getServerSnapshot: () => serverMatch,
      subscribe: (notify: () => void) => {
        media?.addEventListener('change', notify);
        return () => media?.removeEventListener('change', notify);
      },
    };
  }, [query, serverMatch]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
