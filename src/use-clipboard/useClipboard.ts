'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

export type ClipboardError = 'unsupported' | 'denied' | 'failed';

export interface ClipboardOptions {
  /** How long `copied` stays true. Default 2000 ms. */
  timeoutMs?: number;
}

export interface ClipboardState {
  /** Copy text. Resolves true on success; never rejects. */
  copy: (text: string) => Promise<boolean>;
  copied: boolean;
  /** Null after success or reset. The copied text is never stored or logged. */
  error: ClipboardError | null;
  /** False on the server and during hydration, then reflects the browser API. */
  supported: boolean;
  reset: () => void;
}

const subscribe = () => () => {};
const clipboardSupported = () => typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
const never = () => false;

/** Copy to the clipboard through the async Clipboard API. It does not fall back to
 * execCommand. Treat `copied` as a short-lived confirmation, not proof of content.
 */
export function useClipboard({ timeoutMs = 2000 }: ClipboardOptions = {}): ClipboardState {
  const supported = useSyncExternalStore(subscribe, clipboardSupported, never);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<ClipboardError | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const attempt = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, []);
  const reset = useCallback(() => {
    attempt.current++;
    clearTimeout(timer.current);
    setCopied(false);
    setError(null);
  }, []);
  const copy = useCallback(async (text: string) => {
    const id = ++attempt.current;
    clearTimeout(timer.current);
    let failure: ClipboardError | null = null;
    if (!clipboardSupported()) failure = 'unsupported';
    else {
      try {
        await navigator.clipboard.writeText(text);
      } catch (cause) {
        failure = typeof cause === 'object' && cause !== null && 'name' in cause && cause.name === 'NotAllowedError' ? 'denied' : 'failed';
      }
    }
    if (!alive.current || id !== attempt.current) return failure === null;
    setError(failure);
    setCopied(failure === null);
    if (failure === null) timer.current = setTimeout(() => setCopied(false), timeoutMs);
    return failure === null;
  }, [timeoutMs]);
  return { copy, copied, error, supported, reset };
}
