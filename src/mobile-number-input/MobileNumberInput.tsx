'use client';

/**
 * MobileNumberInput: a Nepal mobile number field for top-ups, wallet sign-up and "send to mobile". It shows +977 as a
 * fixed prefix, accepts a pasted +977 or 00977 number, spaces, dashes and Devanagari digits, groups the digits as
 * 984-1234567, and names the operator (NTC, Ncell, SmartCell) as soon as three digits are typed. The prefix table
 * comes from `@punji/ui/nepal/mobile` and can be replaced. An invalid number is explained once the field is left.
 */
import { useCallback, useId, useRef, useState, type FocusEvent, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

import { formatNepalMobile, parseNepalMobile, type MobileOperator, type NepalMobileOptions, type NepalMobileResult } from '../nepal/mobile.ts';

export interface MobileNumberInputProps extends NepalMobileOptions, Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size' | 'type' | 'defaultValue' | 'prefix'> {
  /** The visible label, a real <label> tied to the input. */
  label: ReactNode;
  /** Controlled value: the national digits from `onValueChange` (`result.national`), '' for none. */
  value: string;
  /** Called on every accepted edit with the parsed result: state, national digits, E.164 and operator. */
  onValueChange: (result: NepalMobileResult) => void;
  /** A quiet line under the field. Replaced by an error. */
  hint?: ReactNode;
  /** Your own error. It replaces the built-in message. */
  error?: ReactNode;
  /** Built-in message for an invalid number, shown after the field is left. Pass your own for Nepali. */
  invalidMessage?: (result: NepalMobileResult) => ReactNode;
  /** Shown beside the input once the operator is known. Default: the operator's short name. Return null to hide. */
  renderOperator?: (operator: MobileOperator) => ReactNode;
  /** Spoken when the operator changes. Default "Operator: {name}". */
  operatorAnnouncement?: (operator: MobileOperator) => string;
  /** Show the digits in Devanagari. The value stays ASCII. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** The fixed country code. Default '+977'. Set null to hide it. */
  countryCode?: string | null;
  /** The box: 'lg' 44 (default) or 'md' 36. */
  size?: 'md' | 'lg';
  /** Keep the label for screen readers only. */
  hideLabel?: boolean;
  /** Becomes data-testid on the input. */
  testId?: string;
  /** Ref to the input element. */
  ref?: Ref<HTMLInputElement>;
}

function defaultInvalid(result: NepalMobileResult): string {
  if (result.reason === 'prefix') return `${result.national.slice(0, 3)} is not a Nepal mobile prefix. Check the number.`;
  if (result.reason === 'characters') return 'Use digits only.';
  return 'Enter a 10-digit mobile number starting with 9.';
}

export function MobileNumberInput({
  label, value, onValueChange, hint, error, invalidMessage = defaultInvalid, renderOperator = (o) => o.shortName,
  operatorAnnouncement = (o) => `Operator: ${o.name}`, digits = 'latn', countryCode = '+977', size = 'lg', hideLabel, testId,
  operators, allowUnknownPrefix, id: idProp, className, onBlur, ref, ...rest
}: MobileNumberInputProps) {
  const auto = useId();
  const id = idProp ?? auto;
  const [left, setLeft] = useState(false);
  const options = { operators, allowUnknownPrefix };
  const current = parseNepalMobile(value, options);
  const shown = formatNepalMobile(value, { digits });
  const message = error ?? (left && (current.state === 'invalid' || current.state === 'partial') ? invalidMessage(current) : undefined);
  const badge = current.operator ? renderOperator(current.operator) : null;
  const describedBy = message ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const inner = useRef<HTMLInputElement | null>(null);
  const setRef = useCallback((node: HTMLInputElement | null) => {
    inner.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref]);
  // After React re-renders the grouped text, keep the caret after the same number of digits.
  const placeCaret = (digitsBefore: number) => queueMicrotask(() => {
    const input = inner.current;
    if (!input || input.ownerDocument.activeElement !== input) return;
    let at = 0;
    for (let seen = 0; at < input.value.length && seen < digitsBefore; at++) if (/[\d०-९]/.test(input.value[at]!)) seen++;
    input.setSelectionRange(at, at);
  });

  return (
    <div className={`kit-field pu-mobile-input${size === 'md' ? ' md' : ''}${className ? ` ${className}` : ''}`} data-invalid={message ? 'true' : undefined}>
      <label htmlFor={id} className={hideLabel ? 'kit-sr' : undefined}>{label}</label>
      <div className="pu-mobile-input-control">
        {countryCode && <span className="pu-mobile-input-cc" aria-hidden="true">{countryCode}</span>}
        <input
          {...rest}
          ref={setRef}
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={shown}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy}
          data-testid={testId}
          onChange={(event) => {
            const next = parseNepalMobile(event.target.value, options);
            // Refuse letters and an 11th digit instead of showing them; a paste with +977 is accepted whole.
            if (next.reason === 'characters' || next.national.length > 10) return;
            const raw = event.target.value;
            const caret = event.target.selectionStart ?? raw.length;
            // Digits before the caret, less any country code that normalising removed.
            const typed = (raw.slice(0, caret).match(/[\d०-९]/g) ?? []).length - Math.max(0, (raw.match(/[\d०-९]/g) ?? []).length - next.national.length);
            setLeft(false);
            onValueChange(next);
            placeCaret(Math.max(0, typed));
          }}
          onBlur={(event: FocusEvent<HTMLInputElement>) => { setLeft(true); onBlur?.(event); }}
        />
        {badge !== null && <span className="pu-mobile-input-operator" aria-hidden="true">{badge}</span>}
      </div>
      <span className="kit-sr" aria-live="polite">{current.operator ? operatorAnnouncement(current.operator) : ''}</span>
      {message ? <span className="err" id={`${id}-err`} role="alert">{message}</span> : hint ? <span className="hint" id={`${id}-hint`}>{hint}</span> : null}
    </div>
  );
}
