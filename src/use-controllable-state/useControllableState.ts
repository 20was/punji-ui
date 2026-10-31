'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { devWarn } from '../internal/devWarn.ts';

export interface ControllableStateOptions<T> {
  /** Controlled value. `undefined` means uncontrolled. */
  value?: T | undefined;
  defaultValue: T;
  onChange?: ((value: T) => void) | undefined;
  /** Name used in the development warning. */
  name?: string;
}

/** One state for components that can be controlled (`value`) or uncontrolled
 * (`defaultValue`). `onChange` fires for every request in both modes. The setter
 * accepts a value or an updater, and keeps its identity for the component lifetime.
 * Switching between controlled and uncontrolled warns in development.
 */
export function useControllableState<T>({ value, defaultValue, onChange, name = 'state' }: ControllableStateOptions<T>): [T, (next: T | ((previous: T) => T)) => void] {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const current = controlled ? value : inner;
  const latest = useRef({ current, controlled, onChange });
  const initiallyControlled = useRef(controlled);
  useEffect(() => {
    latest.current = { current, controlled, onChange };
    if (initiallyControlled.current !== controlled) {
      initiallyControlled.current = controlled;
      devWarn(`${name} changed from ${controlled ? 'uncontrolled to controlled' : 'controlled to uncontrolled'}. Choose one mode for the component lifetime.`);
    }
  });
  const set = useCallback((next: T | ((previous: T) => T)) => {
    const state = latest.current;
    const resolved = typeof next === 'function' ? (next as (previous: T) => T)(state.current) : next;
    if (Object.is(resolved, state.current)) return;
    latest.current = { ...state, current: resolved };
    if (!state.controlled) setInner(resolved);
    state.onChange?.(resolved);
  }, []);
  return [current, set];
}
