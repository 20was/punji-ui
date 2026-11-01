'use client';

/**
 * The 3-column key grid shared by AmountKeypad and PinPad. One Tab stop: the arrow keys, Home and End move focus
 * between keys, Enter or Space presses. The Tab stop is always the first key, never the last one pressed, so the
 * markup does not record which digit of a PIN was entered last. Digit and Backspace keys on a physical keyboard work anywhere
 * inside the pad (the parent handles them through `onKeyInput`).
 */
import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { fromDevanagari, showDigits } from './digits.ts';

export interface KeypadKey {
  /** Stable key ('7', 'backspace'), also the data-key attribute. */
  id: string;
  /** What the key shows. */
  face: ReactNode;
  /** Accessible name when the face is an icon or a Devanagari digit. */
  name?: string;
  onPress: () => void;
  disabled?: boolean;
  /** 'action' keys (backspace, decimal) get a quieter style. */
  kind?: 'digit' | 'action';
}


/** A Devanagari or ASCII digit from a keyboard event, or null. */
export function digitOfKey(key: string): string | null {
  if (/^\d$/.test(key)) return key;
  const ascii = fromDevanagari(key);
  return /^[0-9]$/.test(ascii) ? ascii : null;
}

export function digitFace(digit: string, digits: 'latn' | 'deva'): string {
  return showDigits(digit, digits);
}

export function BackspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z" />
      <path d="m17 9-6 6M11 9l6 6" />
    </svg>
  );
}

export interface KeypadGridProps {
  /** Twelve cells: a key or null for an empty cell. */
  keys: readonly (KeypadKey | null)[];
  label: string;
  /** Physical keyboard input inside the pad. Return true when handled. */
  onKeyInput?: (event: KeyboardEvent<HTMLDivElement>) => boolean;
  disabled?: boolean;
  testId?: string;
  describedBy?: string;
}

export function KeypadGrid({ keys, label, onKeyInput, disabled, testId, describedBy }: KeypadGridProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const firstEnabled = keys.findIndex((k) => k && !k.disabled);

  const move = (from: number, step: number) => {
    for (let i = from + step, n = 0; n < keys.length; i += step, n++) {
      const at = (i + keys.length) % keys.length;
      if (keys[at] && !keys[at]!.disabled) return at;
    }
    return from;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (onKeyInput?.(event)) { event.preventDefault(); return; }
    const focused = refs.current.indexOf(event.target as HTMLButtonElement);
    const current = focused >= 0 ? focused : firstEnabled;
    const target = { ArrowRight: move(current, 1), ArrowLeft: move(current, -1), ArrowDown: move(current, 3), ArrowUp: move(current, -3), Home: move(-1, 1), End: move(keys.length, -1) }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    refs.current[target]?.focus();
  };

  return (
    // A group of buttons with one Tab stop: the key handler moves focus between the buttons inside (roving tabindex).
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div className="pu-keypad" role="group" aria-label={label} aria-describedby={describedBy} onKeyDown={onKeyDown} data-testid={testId}>
      {keys.map((key, i) => key ? (
        <button
          key={key.id}
          ref={(node) => { refs.current[i] = node; }}
          type="button"
          className={`pu-keypad-key${key.kind === 'action' ? ' action' : ''}`}
          data-key={key.id}
          aria-label={key.name}
          tabIndex={i === firstEnabled ? 0 : -1}
          disabled={disabled || key.disabled}
          onClick={key.onPress}
        >
          {key.face}
        </button>
      ) : <span key={`empty-${i}`} className="pu-keypad-gap" aria-hidden="true" />)}
    </div>
  );
}
