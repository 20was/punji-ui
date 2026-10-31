'use client';

import { useCallback, useState } from 'react';

/** Boolean state with stable setters. `toggle()` flips; `toggle(true)` sets. Non-boolean
 * arguments (such as a click event passed straight from onClick) flip.
 */
export function useToggle(initial = false): [boolean, (next?: unknown) => void, (value: boolean) => void] {
  const [on, setOn] = useState(initial);
  const toggle = useCallback((next?: unknown) => setOn(typeof next === 'boolean' ? next : (previous) => !previous), []);
  return [on, toggle, setOn];
}
