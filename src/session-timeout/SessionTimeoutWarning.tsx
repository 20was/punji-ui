'use client';

/**
 * SessionTimeoutWarning: the "you are about to be signed out" dialog that WCAG 2.2.1 (Timing Adjustable) asks for:
 * a warning at least 20 seconds before the session ends and one simple action to extend it. The countdown is visible
 * every second but announced only at a few moments (when the dialog opens, at one minute, 30 and 10 seconds, and at
 * the end), so a screen reader is not flooded. Focus moves to "Stay signed in" and returns where it was; Esc also
 * stays signed in. When time runs out `onExpire` is called once.
 *
 * Pass the session's real expiry from your server (`expiresAt`, epoch milliseconds). The component keeps no session
 * itself; `onExtend` should refresh it on the server and give you a new `expiresAt`.
 */
import { useEffect, useId, useRef, useState } from 'react';

export interface SessionTimeoutLabels {
  /** Dialog heading. Default "Your session is about to end". */
  title?: string;
  /** The sentence with the time left. Default "For your security, you will be signed out in {time}." */
  body?: (time: string) => string;
  /** Default "Stay signed in". */
  extend?: string;
  /** Default "Sign out now". */
  signOut?: string;
  /** Spoken time: default "1 minute 5 seconds". */
  spokenTime?: (minutes: number, seconds: number) => string;
  /** Announced when time is up. Default "You have been signed out." */
  expired?: string;
}

export interface SessionTimeoutWarningProps {
  /** When the session ends, epoch milliseconds, from your server. */
  expiresAt: number;
  /** How long before the end to warn, in milliseconds. At least 20000 (WCAG 2.2.1); default 120000. */
  warnBefore?: number;
  /** "Stay signed in": refresh the session and pass the new `expiresAt`. */
  onExtend: () => void;
  /** "Sign out now". */
  onSignOut: () => void;
  /** Called once when the time is up. Sign the person out here. */
  onExpire: () => void;
  /** Clock source, epoch milliseconds. Default `Date.now`. Inject only in tests. */
  now?: () => number;
  /** Words, in the reader's language. */
  labels?: SessionTimeoutLabels;
  /** Extra class on the root element (layout only). */
  className?: string;
  /** Becomes data-testid on the dialog. */
  testId?: string;
}

const ANNOUNCE_AT = [60, 30, 10];

const defaultSpoken = (m: number, s: number) =>
  [m ? `${m} minute${m === 1 ? '' : 's'}` : '', s || !m ? `${s} second${s === 1 ? '' : 's'}` : ''].filter(Boolean).join(' ');

export function SessionTimeoutWarning({
  expiresAt, warnBefore = 120_000, onExtend, onSignOut, onExpire, now = Date.now, labels = {}, className, testId,
}: SessionTimeoutWarningProps) {
  const warnMs = Math.max(20_000, warnBefore);
  const {
    title = 'Your session is about to end', body = (t: string) => `For your security, you will be signed out in ${t}.`, extend = 'Stay signed in',
    signOut = 'Sign out now', spokenTime = defaultSpoken, expired = 'You have been signed out.',
  } = labels;
  const id = useId();
  const [time, setTime] = useState(() => now());
  const [announcement, setAnnouncement] = useState('');
  const expiredFor = useRef<number | null>(null);
  const announced = useRef<{ key: number; marks: Set<number> }>({ key: expiresAt, marks: new Set() });
  const extendRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // One tick a second is enough for a seconds display; the effect restarts when the expiry moves.
  useEffect(() => {
    setTime(now());
    const interval = setInterval(() => setTime(now()), 1000);
    return () => clearInterval(interval);
    // `now` is a test seam; a new identity must not restart the clock.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const remaining = Math.max(0, expiresAt - time);
  const open = remaining > 0 && remaining <= warnMs;
  const seconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  useEffect(() => {
    if (remaining > 0 || expiredFor.current === expiresAt) return;
    expiredFor.current = expiresAt;
    setAnnouncement(expired);
    onExpire();
  }, [remaining, expiresAt, expired, onExpire]);

  // Announce on opening and at a few marks, never every second.
  useEffect(() => {
    if (announced.current.key !== expiresAt) announced.current = { key: expiresAt, marks: new Set() };
    if (!open) return;
    const marks = announced.current.marks;
    const mark = marks.size === 0 ? -1 : ANNOUNCE_AT.find((m) => seconds <= m && !marks.has(m));
    if (mark === undefined) return;
    if (mark === -1) for (const m of ANNOUNCE_AT) if (seconds <= m) marks.add(m);
    marks.add(mark);
    setAnnouncement(body(spokenTime(minutes, rest)));
  }, [open, seconds, expiresAt, body, spokenTime, minutes, rest]);

  // Focus "Stay signed in" on open, give it back on close; keep Tab inside; Esc stays signed in.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    extendRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onExtend(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const buttons = [...dialogRef.current.querySelectorAll<HTMLButtonElement>('button')];
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, [open, onExtend]);

  const clock = `${minutes}:${String(rest).padStart(2, '0')}`;
  return (
    <>
      <span className="kit-sr" aria-live="assertive" aria-atomic="true">{announcement}</span>
      {open && (
        <div className="kit-sheet-back pu-session-back">
          <div className={`kit-sheet pu-session${className ? ` ${className}` : ''}`} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} ref={dialogRef} data-testid={testId}>
            <h2 id={`${id}-t`}>{title}</h2>
            <p className="pu-session-clock" aria-hidden="true">
              <time dateTime={`PT${minutes}M${rest}S`}>{clock}</time>
            </p>
            <p id={`${id}-d`}>{body(spokenTime(minutes, rest))}</p>
            <div className="pu-session-actions">
              <button type="button" className="kit-btn primary lg" ref={extendRef} onClick={onExtend}>{extend}</button>
              <button type="button" className="kit-btn secondary lg" onClick={onSignOut}>{signOut}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
