'use client';

import { useEffect, useRef, useState } from 'react';

/** Throttled copy of `value`: the first change goes through at once, later changes update
 * at most once per `intervalMs`, and the latest value is delivered on the trailing edge.
 * The first render returns `value` unchanged.
 */
export function useThrottle<T>(value: T, intervalMs: number): T {
  const [throttled, setThrottled] = useState(value);
  const emitted = useRef(value);
  const lastEmit = useRef(Number.NEGATIVE_INFINITY);
  useEffect(() => {
    if (Object.is(value, emitted.current)) return;
    const emit = () => {
      emitted.current = value;
      lastEmit.current = Date.now();
      setThrottled(value);
    };
    const wait = lastEmit.current + intervalMs - Date.now();
    if (wait <= 0) {
      emit();
      return;
    }
    const id = setTimeout(emit, wait);
    return () => clearTimeout(id);
  }, [value, intervalMs]);
  return throttled;
}
