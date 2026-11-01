'use client';

/**
 * PanInput: a field for a Nepal PAN or VAT number (nine digits). Spaces and hyphens are dropped and Devanagari digits
 * are accepted as typed or pasted; the value is the ASCII digits. It says what is wrong once the field is left (too
 * few digits, a letter, too many), never while the person is still typing. It checks the shape only: whether the
 * number was issued, and to whom, is a lookup your server makes.
 */
import { useState, type FocusEvent, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

import { Field } from '../fields/Fields.tsx';
import { useLocaleMessages } from '../locale/context.tsx';
import { PAN_LENGTH, checkPan, formatPanNumber, type PanCheck } from '../tax/pan.ts';

export interface PanInputLabels {
  /** Fewer than nine digits, shown after the field is left. */
  short: string;
  /** A letter or symbol. */
  characters: string;
  /** More than nine digits. */
  long: string;
  /** Spoken after a complete, well-formed number. */
  complete: string;
}

export const DEFAULT_PAN_INPUT_LABELS: PanInputLabels = {
  short: 'Enter all 9 digits of the number.',
  characters: 'Use digits only.',
  long: 'The number has 9 digits.',
  complete: '9 digits entered',
};

export interface PanInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size' | 'type' | 'inputMode' | 'defaultValue'> {
  /** The field's label, for example "Buyer PAN" or "VAT number". */
  label: ReactNode;
  /** Help text under the field. Default "9 digits". */
  hint?: ReactNode;
  /** Your own error, for example from a lookup. It replaces the built-in messages. */
  error?: ReactNode;
  /** Field size: 'lg' (default) or 'md'. */
  size?: 'md' | 'lg';
  /** Hide the label visually; it stays in the accessible name. */
  hideLabel?: boolean;
  /** Test id on the input element. */
  testId?: string;
  /** Controlled value: the ASCII digits from `onValueChange` ('' for none). */
  value: string;
  /** Called with each edit: the normalised digits and the check's state ('empty', 'partial', 'valid', 'invalid'). */
  onValueChange: (check: PanCheck) => void;
  /** Show the digits in Devanagari (१२३४५६७८९). The value stays ASCII. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** Message words, in the reader's language. */
  labels?: Partial<PanInputLabels>;
  /** Ref to the input element. */
  ref?: Ref<HTMLInputElement>;
}

export function PanInput({ label, hint = '9 digits', error, value, onValueChange, digits = 'latn', labels, onBlur, className, ...rest }: PanInputProps) {
  const words = { ...DEFAULT_PAN_INPUT_LABELS, ...useLocaleMessages().messages.panInput, ...labels };
  const [left, setLeft] = useState(false);
  const check = checkPan(value);
  const builtIn = !left ? undefined
    : check.state === 'partial' ? words.short
    : check.state === 'invalid' ? (check.reason === 'characters' ? words.characters : words.long)
    : undefined;
  return (
    <div className="pu-pan">
      <Field
        {...rest}
        className={className ? `pu-pan-input ${className}` : 'pu-pan-input'}
        label={label}
        hint={check.state === 'valid' && !error ? <>{hint}<span className="kit-sr">{`, ${words.complete}`}</span></> : hint}
        error={error ?? builtIn}
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        maxLength={PAN_LENGTH + 4}
        value={formatPanNumber(value, { digits })}
        onChange={(raw) => onValueChange(checkPan(raw))}
        onBlur={(event: FocusEvent<HTMLInputElement>) => {
          setLeft(true);
          onBlur?.(event);
        }}
      />
    </div>
  );
}
