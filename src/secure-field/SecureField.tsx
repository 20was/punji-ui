'use client';

/**
 * SecureField: a text field for secrets and card data with the browser attributes set correctly for each kind, so
 * password managers fill the right thing, one-time codes autofill from SMS, and nothing is spell-checked, autocorrected,
 * capitalised or sent to a cloud dictionary. The value lives only in your state and the input's `value` property: it
 * is never written to the `value` attribute (React writes that for controlled inputs, and CSS attribute selectors can
 * read it out character by character), a data attribute, a title, an ARIA label or the console, and the reveal toggle hides again on blur and after
 * `revealSeconds`. Paste stays allowed (blocking it breaks password managers and WCAG 3.3.8).
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';

import { useLocaleMessages } from '../locale/context.tsx';

export type SecureFieldKind =
  | 'current-password'
  | 'new-password'
  | 'one-time-code'
  | 'pin'
  | 'cc-number'
  | 'cc-csc'
  | 'cc-exp'
  | 'account-number'
  | 'secret-answer';

export interface SecureInputAttributes {
  /** The input type: 'password' for masked kinds. */
  type: 'password' | 'text';
  /** The HTML autofill token, or 'off'. */
  autoComplete: string;
  /** The on-screen keyboard: numeric for digits-only kinds. */
  inputMode?: 'numeric' | 'text';
  /** Always false: no spellcheck, no cloud dictionary. */
  spellCheck: false;
  /** Always 'off'. */
  autoCorrect: 'off';
  /** Always 'none'. */
  autoCapitalize: 'none';
  /** Characters the field accepts when it is digits-only (a hint for `pattern`). */
  pattern?: string;
  /** Hidden by default (password-type), so it can be revealed. */
  masked: boolean;
}

/**
 * The attributes a secure input of each kind should carry. Pure, for your own inputs too.
 * `autoComplete` uses the HTML autofill tokens: 'current-password', 'new-password', 'one-time-code', 'cc-number',
 * 'cc-csc', 'cc-exp'; an account number and a secret answer get 'off' (no autofill token exists, and saving them in
 * form history is unwanted).
 */
export function secureFieldAttributes(kind: SecureFieldKind): SecureInputAttributes {
  const base = { spellCheck: false as const, autoCorrect: 'off' as const, autoCapitalize: 'none' as const };
  switch (kind) {
    case 'current-password':
    case 'new-password':
      return { ...base, type: 'password', autoComplete: kind, masked: true };
    case 'one-time-code':
      return { ...base, type: 'text', autoComplete: 'one-time-code', inputMode: 'numeric', pattern: '[0-9]*', masked: false };
    case 'pin':
      return { ...base, type: 'password', autoComplete: 'off', inputMode: 'numeric', pattern: '[0-9]*', masked: true };
    case 'cc-number':
      return { ...base, type: 'text', autoComplete: 'cc-number', inputMode: 'numeric', masked: false };
    case 'cc-csc':
      return { ...base, type: 'password', autoComplete: 'cc-csc', inputMode: 'numeric', pattern: '[0-9]*', masked: true };
    case 'cc-exp':
      return { ...base, type: 'text', autoComplete: 'cc-exp', inputMode: 'numeric', masked: false };
    case 'account-number':
      return { ...base, type: 'text', autoComplete: 'off', inputMode: 'numeric', masked: false };
    case 'secret-answer':
      return { ...base, type: 'password', autoComplete: 'off', inputMode: 'text', masked: true };
    default:
      throw new RangeError(`Unknown SecureField kind: ${String(kind)}`);
  }
}

export interface SecureFieldLabels {
  /** The reveal button while hidden. Default "Show". */
  show?: string;
  /** The reveal button while shown. Default "Hide". */
  hide?: string;
}

export interface SecureFieldProps {
  /** The visible label, a real <label>. */
  label: ReactNode;
  /** What the field holds; sets type, autocomplete, inputmode and the reveal toggle. */
  kind: SecureFieldKind;
  /** The current value. Controlled; keep it in memory and clear it after use. */
  value: string;
  /** Called with the new text (not the event). Do not log it. */
  onChange: (value: string) => void;
  /** The form field name. Default: the kind. */
  name?: string;
  /** A quiet line under the field. Replaced by `error`. */
  hint?: ReactNode;
  /** What is wrong, announced as an alert. Never echo the value in it. */
  error?: ReactNode;
  /** Maximum length in characters. */
  maxLength?: number;
  /** Required for the form. */
  required?: boolean;
  /** Not editable. */
  disabled?: boolean;
  /** Offer the show/hide toggle on masked kinds. Default true. */
  revealable?: boolean;
  /** Seconds before a revealed value hides again, 5 to 300. Default 30. It also hides on blur. */
  revealSeconds?: number;
  /** Words for the toggle. */
  labels?: SecureFieldLabels;
  /** The input element. */
  ref?: Ref<HTMLInputElement>;
  /** Becomes data-testid on the input. */
  testId?: string;
}

export function SecureField({
  label, kind, value, onChange, name, hint, error, maxLength, required, disabled, revealable = true, revealSeconds = 30, labels = {}, ref, testId,
}: SecureFieldProps) {
  if (!Number.isFinite(revealSeconds) || revealSeconds < 5 || revealSeconds > 300) throw new RangeError('revealSeconds must be 5 to 300');
  const id = useId();
  const attrs = secureFieldAttributes(kind);
  const [revealed, setRevealed] = useState(false);
  const { show = 'Show', hide = 'Hide' } = { ...useLocaleMessages().messages.secureField, ...labels };
  useEffect(() => {
    if (!revealed) return;
    const timeout = setTimeout(() => setRevealed(false), revealSeconds * 1000);
    return () => clearTimeout(timeout);
  }, [revealed, revealSeconds]);
  const canReveal = attrs.masked && revealable;
  // The input is uncontrolled in React terms: the value is pushed into the DOM property, never the attribute.
  const inputRef = useRef<HTMLInputElement | null>(null);
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input && input.value !== value) input.value = value;
  }, [value]);
  const setRefs = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: HTMLInputElement | null }).current = node;
  }, [ref]);
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;

  return (
    <div className="kit-field pu-secure-field" data-invalid={error ? 'true' : undefined}>
      <label htmlFor={id}>{label}</label>
      <div className="kit-field-control">
        <input
          ref={setRefs}
          id={id}
          name={name ?? kind}
          type={attrs.masked && !revealed ? 'password' : 'text'}
          autoComplete={attrs.autoComplete}
          inputMode={attrs.inputMode}
          pattern={attrs.pattern}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="none"
          data-1p-ignore={kind === 'account-number' || kind === 'secret-answer' ? 'true' : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => setRevealed(false)}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          data-testid={testId}
        />
        {canReveal && (
          <span className="kit-field-action">
            <button
              type="button"
              className="kit-btn ghost pu-secure-reveal"
              aria-controls={id}
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setRevealed((r) => !r)}
            >
              {revealed ? hide : show}
            </button>
          </span>
        )}
      </div>
      {error ? <span className="err" id={`${id}-err`} role="alert">{error}</span> : hint ? <span className="hint" id={`${id}-hint`}>{hint}</span> : null}
    </div>
  );
}
