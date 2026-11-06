'use client';
/**
 * DataFreshness (design.punji.app/components/data-freshness): how old the figures on a screen are, said in words
 * and an icon, never colour alone: Live, Delayed 15 min, End of day, Stale or Offline, with "Updated 2 min. ago".
 * The relative time re-renders on a slow timer (30 s by default) that stops while the tab is hidden. A hidden
 * `role="status"` region speaks only when the state changes, never on a tick.
 *
 * @stability beta
 * @remarks Display only. It reports the state you pass; it does not measure staleness, and a "Live" label is not a guarantee the figure is current. Order and price validation belongs on the server.
 */
import { useEffect, useRef, useState } from 'react';

import { formatAge, toTime } from '../internal/relativeTime.ts';
import { useLocaleMessages } from '../locale/context.tsx';

/** The freshness of the data. */
export type DataFreshnessState = 'live' | 'delayed' | 'end-of-day' | 'stale' | 'offline';

/** DataFreshness's words. Also settable for every instance under `dataFreshness` in the locale messages. */
export interface DataFreshnessLabels {
  /** Default "Live". */
  live?: string;
  /** Default "Delayed 15 min". */
  delayed?: (minutes: number | undefined) => string;
  /** Default "End of day". */
  endOfDay?: string;
  /** Default "Stale". */
  stale?: string;
  /** Default "Offline". */
  offline?: string;
  /** The timestamp, given a relative age ("2 min. ago"). Default "Updated 2 min. ago". */
  updated?: (age: string) => string;
  /** What the status region says when the state changes, given the state's label. Default "Data status: Live". */
  announce?: (label: string) => string;
}

export interface DataFreshnessProps {
  /** live, delayed (with `delayMinutes`), end-of-day, stale or offline. */
  state: DataFreshnessState;
  /** How many minutes behind, for `delayed` ("Delayed 15 min"). */
  delayMinutes?: number;
  /** When the data was as of (Date, ISO string or ms). Without it only the state is shown. */
  asOf?: Date | string | number;
  /** Milliseconds between re-renders of the relative time. Default 30000; the timer is paused while the document is hidden. */
  refreshMs?: number;
  /** Clock seam for tests and servers. Default `Date.now`. */
  now?: () => number;
  /** BCP 47 tag for the relative time. Default: the locale provider's, else 'en'. */
  locale?: string;
  /** Your words; they win over the locale provider's `dataFreshness`. */
  labels?: DataFreshnessLabels;
  /** Sets `data-testid` on the root. */
  testId?: string;
  /** Layout only. */
  className?: string;
}

function Icon({ state }: { state: DataFreshnessState }) {
  return (
    <svg className="pu-fresh-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {state === 'live' && (<><circle cx="12" cy="12" r="3" fill="currentColor" /><path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9" /></>)}
      {state === 'delayed' && (<><circle cx="12" cy="12" r="9.5" /><path d="M12 7v5l3 2" /></>)}
      {state === 'end-of-day' && <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />}
      {state === 'stale' && (<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>)}
      {state === 'offline' && <path d="M2 12a15 15 0 0 1 4-2.6M22 12a15 15 0 0 0-8-3.9M5.5 15.5a9 9 0 0 1 3-2M16 15a9 9 0 0 0-2-1.4M12 19h.01M3 3l18 18" />}
    </svg>
  );
}

/** @stability beta */
export function DataFreshness({ state, delayMinutes, asOf, refreshMs = 30_000, now = Date.now, locale: localeProp, labels, testId, className }: DataFreshnessProps) {
  const { locale: contextLocale, messages } = useLocaleMessages();
  const locale = localeProp ?? contextLocale;
  const words = { ...messages.dataFreshness, ...labels };
  const {
    live = 'Live', delayed = (m: number | undefined) => (m === undefined ? 'Delayed' : `Delayed ${m} min`), endOfDay = 'End of day',
    stale = 'Stale', offline = 'Offline', updated = (age: string) => `Updated ${age}`, announce = (label: string) => `Data status: ${label}`,
  } = words;
  const label = state === 'live' ? live : state === 'delayed' ? delayed(delayMinutes) : state === 'end-of-day' ? endOfDay : state === 'stale' ? stale : offline;

  // One slow timer; it stops while the tab is hidden and catches up the moment it is visible again.
  const nowRef = useRef(now);
  nowRef.current = now;
  const [time, setTime] = useState(() => now());
  useEffect(() => {
    if (asOf === undefined || !(refreshMs > 0)) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      setTime(nowRef.current());
      timer = setInterval(() => setTime(nowRef.current()), refreshMs);
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [asOf, refreshMs]);

  // The status region changes text only when the state changes (not on mount, not on a tick).
  const [spoken, setSpoken] = useState('');
  const previous = useRef(state);
  useEffect(() => {
    if (previous.current === state) return;
    previous.current = state;
    setSpoken(announce(label));
    // `label` follows `state`; a re-created label function must not re-announce.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const at = asOf === undefined ? NaN : toTime(asOf);
  const showTime = Number.isFinite(at);
  return (
    <span className={`pu-fresh ${state}${className ? ` ${className}` : ''}`} data-state={state} data-testid={testId}>
      <Icon state={state} />
      <span className="pu-fresh-label">{label}</span>
      {showTime && (
        <time className="pu-fresh-time" dateTime={new Date(at).toISOString()} suppressHydrationWarning>
          {updated(formatAge(time - at, locale))}
        </time>
      )}
      <span role="status" className="kit-sr">{spoken}</span>
    </span>
  );
}
