'use client';

import { useState } from 'react';

/** The value `value` had before its latest change (not before the latest render),
 * or `initial` until the first change. Uses render-phase state, no ref reads.
 */
export function usePrevious<T>(value: T): T | undefined;
export function usePrevious<T, I>(value: T, initial: I): T | I;
export function usePrevious<T, I>(value: T, initial?: I): T | I | undefined {
  const start: { current: T; previous: T | I | undefined } = { current: value, previous: initial };
  const [state, setState] = useState(start);
  if (!Object.is(state.current, value)) setState({ current: value, previous: state.current });
  return state.previous;
}
