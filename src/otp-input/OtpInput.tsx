'use client';

/**
 * OtpInput: a one-time code as one box per character (a bank or broker SMS code, a TOTP code). One group with
 * one label; each box also has its own name ("Digit 3 of 6"). Typing moves forward, Backspace moves back, the
 * arrow keys, Home and End move between boxes, and a paste or an SMS autofill spreads across the boxes. Devanagari and
 * Arabic-Indic digits are converted to ASCII. The boxes are always laid out left to right, even on a right-to-left
 * page, because a code is read in the order it was sent. Long codes keep their tap size: a code of 7 or more boxes that cannot
 * fit in one row at full size wraps into two balanced rows (reading order unchanged) instead of shrinking the boxes under 44px. The code is checked on your server, never here.
 */
import { useEffect, useId, useRef, type ClipboardEvent, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

import { useControllableState } from '../use-controllable-state/useControllableState.ts';

export interface OtpInputProps {
  /** The visible label of the whole code ("Verification code"). It names the group; each box is named separately. */
  label: ReactNode;
  /** A quiet line under the boxes ("Sent to 98XXXXXX12"). Replaced by `error`. */
  hint?: ReactNode;
  /** What is wrong ("That code has expired. Request a new one."). Announced as an alert; marks every box invalid. */
  error?: ReactNode;
  /** Number of boxes, 2 to 12. Default 6. */
  length?: number;
  /** Controlled code: the characters entered so far, left to right with no gaps. */
  value?: string;
  /** Initial code when uncontrolled. */
  defaultValue?: string;
  /** Called with the code so far on every change. */
  onChange?: (value: string) => void;
  /** Called once with the full code when the last box is filled. */
  onComplete?: (value: string) => void;
  /** 'numeric' (default, digits only, numeric keypad) or 'alphanumeric' (letters and digits). */
  type?: 'numeric' | 'alphanumeric';
  /** Hide the characters as they are typed (password boxes), for a PIN. Default false. */
  mask?: boolean;
  /** Disable every box. */
  disabled?: boolean;
  /** Focus the first empty box on mount. */
  autoFocus?: boolean;
  /** Form field name: the code is submitted in one hidden input. */
  name?: string;
  /** Id prefix; generated when omitted. */
  id?: string;
  /** Becomes data-testid on the group. */
  testId?: string;
  /** Box size: 'lg' (44, default) or 'md' (36). */
  size?: 'md' | 'lg';
  /** The accessible name of one box. Default "Digit 3 of 6" (or "Character" when alphanumeric). */
  cellLabel?: (position: number, total: number) => string;
}

const DEVANAGARI = '०१२३४५६७८९';
const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

function clean(text: string, type: 'numeric' | 'alphanumeric'): string {
  const ascii = text
    .replace(/[०-९]/g, (d) => String(DEVANAGARI.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)));
  return ascii.replace(type === 'numeric' ? /[^0-9]/g : /[^A-Za-z0-9]/g, '');
}

export function OtpInput({
  label, hint, error, length = 6, value, defaultValue = '', onChange, onComplete, type = 'numeric', mask = false,
  disabled = false, autoFocus = false, name, id: idProp, testId, size = 'lg', cellLabel,
}: OtpInputProps) {
  if (!Number.isInteger(length) || length < 2 || length > 12) throw new RangeError('OtpInput length must be a whole number from 2 to 12');
  const auto = useId();
  const id = idProp ?? auto;
  const cells = useRef<(HTMLInputElement | null)[]>([]);
  const [code, setCode] = useControllableState<string>({ value, defaultValue: clean(defaultValue, type).slice(0, length), onChange, name: 'OtpInput value' });
  const text = clean(code, type).slice(0, length);
  // The filled length as of the latest edit, readable by a focus handler that runs before React re-renders.
  const filled = useRef(text.length);
  filled.current = text.length;

  useEffect(() => {
    if (autoFocus) cells.current[Math.min(text.length, length - 1)]?.focus();
    // Only on mount.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusCell = (index: number) => cells.current[Math.max(0, Math.min(index, length - 1))]?.focus();
  const update = (next: string, focusAt: number) => {
    filled.current = next.length;
    if (next !== text) {
      setCode(next);
      if (next.length === length) onComplete?.(next);
    }
    focusCell(focusAt);
  };
  const put = (index: number, incoming: string) => {
    const chars = clean(incoming, type);
    if (!chars) return;
    const at = Math.min(index, text.length);
    const next = (text.slice(0, at) + chars + text.slice(at + chars.length)).slice(0, length);
    update(next, at + chars.length);
  };
  const remove = (index: number) => {
    if (index < text.length) update(text.slice(0, index) + text.slice(index + 1), index);
    else if (index > 0) update(text.slice(0, index - 1), index - 1);
  };

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    switch (event.key) {
      case 'Backspace': event.preventDefault(); remove(index); break;
      case 'Delete': event.preventDefault(); if (index < text.length) remove(index); break;
      case 'ArrowLeft': event.preventDefault(); focusCell(index - 1); break;
      case 'ArrowRight': event.preventDefault(); focusCell(Math.min(index + 1, text.length)); break;
      case 'Home': event.preventDefault(); focusCell(0); break;
      case 'End': event.preventDefault(); focusCell(Math.min(text.length, length - 1)); break;
    }
  };
  const onPaste = (index: number) => (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text');
    // A whole code replaces what is there; a fragment goes in from the box it was pasted into.
    put(clean(pasted, type).length >= length ? 0 : index, pasted);
  };

  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const nameOf = cellLabel ?? ((position: number, total: number) => `${type === 'numeric' ? 'Digit' : 'Character'} ${position} of ${total}`);
  return (
    <div className={`pu-otp${size === 'md' ? ' md' : ''}`} data-invalid={error ? 'true' : undefined}>
      <span className="pu-otp-label" id={`${id}-label`}>{label}</span>
      <div className="pu-otp-cells" role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy} dir="ltr" data-testid={testId} data-fit={length > 10 ? 'xl' : length > 8 ? 'l' : length > 6 ? 'm' : undefined} style={{ '--otp-length': length, '--otp-cols': Math.ceil(length / 2) } as CSSProperties}>
        {Array.from({ length }, (_, index) => (
          <input
            key={index}
            ref={(node) => { cells.current[index] = node; }}
            className="pu-otp-cell"
            type={mask ? 'password' : 'text'}
            inputMode={type === 'numeric' ? 'numeric' : 'text'}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label={nameOf(index + 1, length)}
            aria-invalid={error ? true : undefined}
            disabled={disabled}
            value={text[index] ?? ''}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === '') { remove(index); return; }
              // The box still holds its old character when the caret was placed rather than selected: keep only the new one.
              const old = text[index];
              put(index, old !== undefined && raw.length === 2 ? (raw[0] === old ? raw[1]! : raw[0]!) : raw);
            }}
            onFocus={(event) => {
              if (index > filled.current) cells.current[filled.current]?.focus();
              else event.currentTarget.select();
            }}
            onKeyDown={onKeyDown(index)}
            onPaste={onPaste(index)}
          />
        ))}
      </div>
      {error ? <span className="pu-otp-note err" id={`${id}-err`} role="alert">{error}</span> : hint ? <span className="pu-otp-note hint" id={`${id}-hint`}>{hint}</span> : null}
      {name && <input type="hidden" name={name} value={text} disabled={disabled} />}
    </div>
  );
}
