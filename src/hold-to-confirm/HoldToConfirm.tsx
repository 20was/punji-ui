'use client';

/**
 * HoldToConfirm: friction for a high-risk action (a large transfer, closing an account, adding a new payee).
 * Two modes. 'hold': press and hold the button (pointer, or Space/Enter held down) until the fill completes; letting
 * go early cancels. 'cooling-off': the button stays unavailable for a few seconds after it appears, with the time
 * left in its label, so a rushed or coached person gets a moment to stop. Neither replaces your server's checks.
 *
 * Accessible by construction: a real <button>; holding Space or Enter works; the progress is announced once at the
 * start and once at the end (not every frame); `aria-disabled` (not `disabled`) keeps the cooling-off button
 * focusable so its countdown can be read. The fill is a CSS transform; with reduced motion it steps instead.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { useLocaleMessages } from '../locale/context.tsx';

export interface HoldToConfirmLabels {
  /** Added to the accessible name in hold mode. Default "Press and hold to confirm". */
  holdHint?: string;
  /** Announced while holding. Default "Keep holding". */
  holding?: string;
  /** Announced when the hold completes. Default "Confirmed". */
  done?: string;
  /** Announced when released early. Default "Released too early. Not confirmed." */
  cancelled?: string;
  /** Cooling-off text after the label. Default "available in {s} s". */
  wait?: (seconds: number) => string;
}

export interface HoldToConfirmProps {
  /** The action, as a verb phrase ("Send NPR 5,00,000"). */
  children: ReactNode;
  /** Called once when the hold completes, or on a press after the cooling-off period. */
  onConfirm: () => void;
  /** 'hold' (default) or 'cooling-off'. */
  mode?: 'hold' | 'cooling-off';
  /** Hold mode: how long to hold, in milliseconds, 500 to 10000. Default 1500. */
  holdMs?: number;
  /** Cooling-off mode: seconds before the button works, 1 to 120. Default 5. To restart it (for example after the amount changes), give the component a new React `key`. */
  delaySeconds?: number;
  /** 'danger' (default, a red fill) or 'primary'. */
  tone?: 'danger' | 'primary';
  /** Not available at all (for example while the form is invalid). */
  disabled?: boolean;
  /** Full width of its container. */
  block?: boolean;
  /** Words, in the reader's language. */
  labels?: HoldToConfirmLabels;
  /** Becomes data-testid on the button. */
  testId?: string;
}

const KEYS = new Set([' ', 'Enter']);

export function HoldToConfirm({
  children, onConfirm, mode = 'hold', holdMs = 1500, delaySeconds = 5, tone = 'danger', disabled = false, block, labels = {}, testId,
}: HoldToConfirmProps) {
  if (!Number.isFinite(holdMs) || holdMs < 500 || holdMs > 10000) throw new RangeError('holdMs must be 500 to 10000');
  if (!Number.isInteger(delaySeconds) || delaySeconds < 1 || delaySeconds > 120) throw new RangeError('delaySeconds must be a whole number from 1 to 120');
  const {
    holdHint = 'Press and hold to confirm', holding = 'Keep holding', done = 'Confirmed', cancelled = 'Released too early. Not confirmed.',
    wait = (s: number) => `available in ${s} s`,
  } = { ...useLocaleMessages().messages.holdToConfirm, ...labels };
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [active, setActive] = useState(false);
  const [left, setLeft] = useState(mode === 'cooling-off' ? delaySeconds : 0);
  const started = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmed = useRef(false);

  const stopTimer = () => { if (timer.current !== null) { clearInterval(timer.current); timer.current = null; } };
  useEffect(() => () => { if (timer.current !== null) clearInterval(timer.current); }, []);

  // The cooling-off clock. To start it (or a hold) again, remount with a new React `key`.
  useEffect(() => {
    if (mode !== 'cooling-off') return;
    const deadline = Date.now() + delaySeconds * 1000;
    const clock = setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(next);
      if (next === 0) clearInterval(clock);
    }, 250);
    return () => clearInterval(clock);
  }, [mode, delaySeconds]);

  const finish = () => {
    stopTimer();
    started.current = null;
    setActive(false);
    if (confirmed.current) return;
    confirmed.current = true;
    setProgress(1);
    setStatus(done);
    onConfirm();
  };

  const begin = () => {
    if (mode !== 'hold' || disabled || confirmed.current || started.current !== null) return;
    started.current = Date.now();
    setActive(true);
    setStatus(holding);
    timer.current = setInterval(() => {
      if (started.current === null) return;
      const fraction = Math.min(1, (Date.now() - started.current) / holdMs);
      if (fraction >= 1) finish();
      else setProgress(fraction);
    }, 50);
  };

  const end = () => {
    if (mode !== 'hold' || started.current === null) return;
    stopTimer();
    started.current = null;
    setActive(false);
    if (!confirmed.current) { setProgress(0); setStatus(cancelled); }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!KEYS.has(event.key)) return;
    event.preventDefault();
    if (mode === 'hold' && !event.repeat) begin();
    if (mode === 'cooling-off' && !event.repeat && left === 0 && !disabled) finish();
  };
  const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => { if (KEYS.has(event.key)) { event.preventDefault(); end(); } };

  const waiting = mode === 'cooling-off' && left > 0;
  const unavailable = disabled || waiting;
  const describe = mode === 'hold' ? holdHint : undefined;

  return (
    <span className={`pu-hold${block ? ' block' : ''}`}>
      <button
        type="button"
        className={`kit-btn lg pu-hold-btn ${tone === 'primary' ? 'primary' : 'danger'}${block ? ' block' : ''}`}
        aria-disabled={unavailable || undefined}
        data-holding={active ? 'true' : undefined}
        data-testid={testId}
        style={{ ['--hold-progress' as string]: String(progress) }}
        onPointerDown={(event) => { if (event.button === 0) { event.currentTarget.setPointerCapture?.(event.pointerId); begin(); } }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onContextMenu={(event) => { if (mode === 'hold') event.preventDefault(); }}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onClick={() => { if (mode === 'cooling-off' && !unavailable) finish(); }}
      >
        <span className="pu-hold-fill" aria-hidden="true" />
        <span className="pu-hold-label">
          {children}
          {describe && <span className="kit-sr">{`, ${describe}`}</span>}
          {waiting && <span className="pu-hold-wait">{` (${wait(left)})`}</span>}
        </span>
      </button>
      <span className="kit-sr" role="status">{status}</span>
    </span>
  );
}
