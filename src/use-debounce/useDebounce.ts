'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/** Trailing-edge debounced copy of `value`. The first render returns `value` unchanged. */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export interface DebouncedFunction<A extends unknown[]> {
  (...args: A): void;
  /** Drop the pending call. */
  cancel: () => void;
  /** Run the pending call now, if there is one. */
  flush: () => void;
}

export interface DebouncedCallbackOptions {
  /** Also call on the leading edge of a burst. Default false. */
  leading?: boolean;
}

/** Debounce a callback. The returned function keeps its identity while `delayMs` and
 * `leading` are unchanged, always calls the latest `callback`, and cancels on unmount.
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delayMs: number,
  options: DebouncedCallbackOptions = {},
): DebouncedFunction<A> {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });
  const leading = options.leading ?? false;
  const debounced = useMemo(() => {
    const slot: { timer?: ReturnType<typeof setTimeout>; pending?: A } = {};
    const run = () => {
      slot.timer = undefined;
      const args = slot.pending;
      slot.pending = undefined;
      if (args) latest.current(...args);
    };
    const fn = ((...args: A) => {
      const burst = slot.timer !== undefined;
      if (slot.timer !== undefined) clearTimeout(slot.timer);
      if (leading && !burst) {
        slot.pending = undefined;
        latest.current(...args);
      } else slot.pending = args;
      slot.timer = setTimeout(run, delayMs);
    }) as DebouncedFunction<A>;
    fn.cancel = () => {
      if (slot.timer !== undefined) clearTimeout(slot.timer);
      slot.timer = undefined;
      slot.pending = undefined;
    };
    fn.flush = () => {
      if (slot.timer === undefined) return;
      clearTimeout(slot.timer);
      run();
    };
    return fn;
  }, [delayMs, leading]);
  useEffect(() => debounced.cancel, [debounced]);
  return debounced;
}
