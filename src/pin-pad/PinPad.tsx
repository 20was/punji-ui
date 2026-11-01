'use client';

/**
 * PinPad: an on-screen pad for a wallet's transaction PIN (MPIN). Each entered digit shows as a filled dot; the
 * digits themselves are never written to the page (no text, no value attribute, no hidden input), so they are not in
 * the DOM, the accessibility tree or a screen recording of it. A screen reader hears "2 of 4 digits entered".
 * `shuffle` places the digits in a random order (crypto-random, re-drawn on mount and whenever `shuffleKey` changes)
 * against shoulder surfing and smudge marks. The PIN is checked on your server, never here.
 */
import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from 'react';

import { BackspaceIcon, KeypadGrid, digitFace, digitOfKey, type KeypadKey } from '../internal/KeypadGrid.tsx';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';

export interface PinPadLabels {
  /** The backspace key. Default "Delete last digit". */
  backspace?: string;
  /** The progress announcement. Default "{entered} of {length} digits entered". */
  progress?: (entered: number, length: number) => string;
}

export interface PinPadProps {
  /** The visible heading of the pad ("Enter your 4-digit PIN"); also the keypad's group name. */
  label: string;
  /** Number of digits, 4 to 8. Default 4. */
  length?: number;
  /** Controlled PIN so far. Keep it in memory only; clear it after use. */
  value?: string;
  /** Initial PIN when uncontrolled (usually ''). */
  defaultValue?: string;
  /** Called with the PIN so far after every key. */
  onChange?: (pin: string) => void;
  /** Called once with the full PIN when the last digit is entered. Further keys are ignored until the value shrinks. */
  onComplete?: (pin: string) => void;
  /** Random key order. Default false. */
  shuffle?: boolean;
  /** Change it (for example the attempt number) to draw a new order. */
  shuffleKey?: string | number;
  /** Random source in [0, 1) for the shuffle. Default: `crypto.getRandomValues`. Inject only in tests. */
  random?: () => number;
  /** Key faces in Devanagari (०-९). Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** A quiet line under the dots ("Forgot PIN?" lives in your layout). Replaced by `error`. */
  hint?: ReactNode;
  /** What went wrong ("Wrong PIN. 2 attempts left."), announced as an alert. Clear the value yourself. */
  error?: ReactNode;
  /** An extra key in the bottom-left cell, such as a fingerprint button. Rendered as given; give it a name. */
  extraKey?: ReactNode;
  /** Disable every key (while the PIN is being checked). */
  disabled?: boolean;
  /** Words for the backspace key and the progress announcement; English by default. */
  labels?: PinPadLabels;
  /** Extra class on the root (layout only). */
  className?: string;
  /** Becomes data-testid on the root. */
  testId?: string;
}

const ORDERED = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

function cryptoRandom(): number {
  const buffer = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buffer);
  return buffer[0]! / 2 ** 32;
}

/** Fisher-Yates over the ten digits. */
export function shuffleDigits(random: () => number = cryptoRandom): string[] {
  const out = [...ORDERED];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function PinPad({
  label, length = 4, value, defaultValue = '', onChange, onComplete, shuffle = false, shuffleKey, random, digits = 'latn',
  hint, error, extraKey, disabled, labels = {}, className, testId,
}: PinPadProps) {
  if (!Number.isInteger(length) || length < 4 || length > 8) throw new RangeError('PinPad length must be a whole number from 4 to 8');
  const id = useId();
  const [pin, setPin] = useControllableState<string>({ value, defaultValue, onChange, name: 'PinPad value' });
  const text = pin.replace(/\D/g, '').slice(0, length);
  // The shuffled order is drawn after mount so server and client markup agree; keys stay disabled until then.
  const [order, setOrder] = useState<string[] | null>(shuffle ? null : ORDERED);
  useEffect(() => {
    setOrder(shuffle ? shuffleDigits(random) : ORDERED);
    // `random` is a test seam; a new function identity must not reshuffle.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffle, shuffleKey]);
  const { backspace = 'Delete last digit', progress = (n: number, total: number) => `${n} of ${total} digits entered` } = labels;

  const press = (key: string) => {
    if (disabled) return;
    if (key === 'backspace') { if (text) setPin(text.slice(0, -1)); return; }
    if (text.length >= length) return;
    const next = text + key;
    setPin(next);
    if (next.length === length) onComplete?.(next);
  };

  const keyInput = (event: KeyboardEvent<HTMLDivElement>): boolean => {
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    const digit = digitOfKey(event.key);
    if (digit) { press(digit); return true; }
    if (event.key === 'Backspace') { press('backspace'); return true; }
    if (event.key === 'Delete' || event.key === 'Escape') { if (text) setPin(''); return true; }
    return false;
  };

  const faces = order ?? ORDERED;
  const digitKey = (d: string): KeypadKey => ({ id: d, face: digitFace(d, digits), name: digits === 'deva' ? d : undefined, disabled: order === null, onPress: () => press(d) });
  const cells: (KeypadKey | null)[] = faces.slice(0, 9).map(digitKey);
  cells.push(null, digitKey(faces[9]!), { id: 'backspace', face: <BackspaceIcon />, name: backspace, kind: 'action', disabled: text === '', onPress: () => press('backspace') });
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className ? `pu-pin-pad ${className}` : 'pu-pin-pad'} data-invalid={error ? 'true' : undefined} data-testid={testId}>
      <span className="pu-pin-pad-label" id={`${id}-label`}>{label}</span>
      <div className="pu-pin-pad-dots" aria-hidden="true">
        {Array.from({ length }, (_, i) => <span key={i} className="pu-pin-pad-dot" data-filled={i < text.length ? 'true' : undefined} />)}
      </div>
      <span className="kit-sr" role="status">{progress(text.length, length)}</span>
      {error ? <span className="pu-pin-pad-note err" id={`${id}-err`} role="alert">{error}</span> : hint ? <span className="pu-pin-pad-note" id={`${id}-hint`}>{hint}</span> : null}
      <div className="pu-pin-pad-keys">
        <KeypadGrid keys={cells} label={label} onKeyInput={keyInput} disabled={disabled} describedBy={describedBy} />
        {extraKey && <div className="pu-pin-pad-extra">{extraKey}</div>}
      </div>
    </div>
  );
}
