'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

export type StorageError = 'unavailable' | 'quota' | 'serialize' | 'invalid';

export interface StorageOptions<T> {
  defaultValue: T;
  /** Required. Stored data is untrusted: only values this accepts are returned. */
  validate: (value: unknown) => value is T;
  /** Default JSON.stringify. */
  serialize?: (value: T) => string;
  /** Default JSON.parse. Throwing marks the stored value invalid. */
  deserialize?: (raw: string) => unknown;
}

export interface StorageState<T> {
  value: T;
  set: (next: T | ((previous: T) => T)) => void;
  remove: () => void;
  /** Last read/write problem; cleared by the next successful write or remove. Never thrown during render. */
  error: StorageError | null;
}

type Kind = 'localStorage' | 'sessionStorage';
const local = new Map<string, Set<() => void>>();
const bucket = (kind: Kind, key: string) => {
  const id = `${kind}:${key}`;
  let set = local.get(id);
  if (!set) local.set(id, (set = new Set()));
  return set;
};
const area = (kind: Kind): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window[kind];
  } catch {
    return null;
  }
};
const readRaw = (kind: Kind, key: string): string | null => {
  try {
    return area(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
};
const serverRaw = () => null;
const nameOf = (cause: unknown) => (typeof cause === 'object' && cause !== null && 'name' in cause ? String(cause.name) : '');

function useStorage<T>(kind: Kind, key: string, options: StorageOptions<T>): StorageState<T> {
  const { defaultValue, validate } = options;
  const subscribe = useCallback((notify: () => void) => {
    const listeners = bucket(kind, key);
    listeners.add(notify);
    const onStorage = (event: StorageEvent) => {
      if ((event.key === key || event.key === null) && (event.storageArea === null || event.storageArea === area(kind))) notify();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(notify);
      window.removeEventListener('storage', onStorage);
    };
  }, [kind, key]);
  const raw = useSyncExternalStore(subscribe, () => readRaw(kind, key), serverRaw);
  const deserialize = options.deserialize;
  const parsed = useMemo((): { value: T; invalid: boolean } => {
    if (raw === null) return { value: defaultValue, invalid: false };
    try {
      const candidate: unknown = deserialize ? deserialize(raw) : JSON.parse(raw);
      if (validate(candidate)) return { value: candidate, invalid: false };
    } catch {
      // unparseable data is treated like invalid data
    }
    return { value: defaultValue, invalid: true };
  }, [raw, defaultValue, validate, deserialize]);
  const [writeError, setWriteError] = useState<StorageError | null>(null);
  const latest = useRef({ value: parsed.value, options });
  useEffect(() => {
    latest.current = { value: parsed.value, options };
  });
  const set = useCallback((next: T | ((previous: T) => T)) => {
    const { value, options: o } = latest.current;
    const store = area(kind);
    if (!store) return setWriteError('unavailable');
    let text: string;
    try {
      const resolved = typeof next === 'function' ? (next as (previous: T) => T)(value) : next;
      const serialized: unknown = o.serialize ? o.serialize(resolved) : JSON.stringify(resolved);
      if (typeof serialized !== 'string') throw new TypeError('not serialisable');
      text = serialized;
    } catch {
      return setWriteError('serialize');
    }
    try {
      store.setItem(key, text);
    } catch (cause) {
      return setWriteError(['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].includes(nameOf(cause)) ? 'quota' : 'unavailable');
    }
    setWriteError(null);
    for (const notify of bucket(kind, key)) notify();
  }, [kind, key]);
  const remove = useCallback(() => {
    try {
      area(kind)?.removeItem(key);
    } catch {
      return setWriteError('unavailable');
    }
    setWriteError(null);
    for (const notify of bucket(kind, key)) notify();
  }, [kind, key]);
  return { value: parsed.value, set, remove, error: writeError ?? (parsed.invalid ? 'invalid' : null) };
}

/** JSON state in localStorage, shared across components and tabs. Do not store secrets,
 * tokens or account data: any script on the origin can read this. `defaultValue` and
 * `validate` should be stable references (module constants).
 */
export function useLocalStorage<T>(key: string, options: StorageOptions<T>): StorageState<T> {
  return useStorage('localStorage', key, options);
}

/** As useLocalStorage, scoped to the tab's sessionStorage. */
export function useSessionStorage<T>(key: string, options: StorageOptions<T>): StorageState<T> {
  return useStorage('sessionStorage', key, options);
}
