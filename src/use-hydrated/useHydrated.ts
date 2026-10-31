'use client';

import { useSyncExternalStore } from 'react';
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
/** False on the server and initial hydration pass; true after hydration.
 * Client-only rendering returns true immediately. No timers or global flag.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
