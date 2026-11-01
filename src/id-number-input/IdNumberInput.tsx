'use client';

/**
 * IdNumberInput: a KYC field for a Nepali PAN (nine digits) or a citizenship certificate number (digit groups with
 * "-" or "/"). Devanagari digits are accepted and reported as ASCII; letters and other characters are refused as you
 * type. The shape is checked when the field is left, with a message that says what to fix. A shape check is not
 * verification: confirm the number with the issuing authority or your KYC provider on the server.
 */
import { useState, type FocusEvent, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

import { Field } from '../fields/Fields.tsx';
import { useLocaleMessages } from '../locale/context.tsx';
import { idNumberToDevanagari, toAsciiIdText, validateIdNumber, type IdNumberKind, type IdNumberResult } from '../kyc/kyc.ts';

export interface IdNumberInputLabels {
  /** For a PAN that is not nine digits. */
  panLength: string;
  /** For characters other than digits. */
  characters: string;
  /** For a citizenship number with doubled or trailing separators. */
  format: string;
  /** For a citizenship number with too few or too many digits. */
  citizenshipLength: string;
}

export const DEFAULT_ID_NUMBER_INPUT_LABELS: IdNumberInputLabels = {
  panLength: 'A PAN has 9 digits.',
  characters: 'Use digits only, with - or / between groups.',
  format: 'Put one - or / between groups of digits.',
  citizenshipLength: 'Enter the number as printed on the certificate (3 to 20 digits).',
};

export interface IdNumberInputChange {
  /** The text as typed, with ASCII digits and separators. Pass it back as `value`. */
  value: string;
  /** The shape check of `value`. */
  check: IdNumberResult;
}

export interface IdNumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size' | 'type' | 'inputMode' | 'defaultValue' | 'pattern'> {
  /** 'pan' or 'citizenship'. */
  kind: IdNumberKind;
  /** The field's label. */
  label: ReactNode;
  /** Help text under the field. Default: the expected shape. */
  hint?: ReactNode;
  /** Your own error (a server answer such as "This PAN is already registered"). It replaces the built-in message. */
  error?: ReactNode;
  /** Controlled text, as typed (ASCII digits and separators). */
  value: string;
  /** Called on each accepted edit with the text (`value`, ASCII) and the shape check (`check`), like BoidInput. */
  onValueChange: (change: IdNumberInputChange) => void;
  /** Show the digits in Devanagari. The reported value stays ASCII. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** Replace the built-in messages, for translation. */
  labels?: Partial<IdNumberInputLabels>;
  /** Field size: 'lg' (default) or 'md'. */
  size?: 'md' | 'lg';
  /** Hide the label visually; it stays in the accessible name. */
  hideLabel?: boolean;
  /** Test id on the input element. */
  testId?: string;
  /** Ref to the input element. */
  ref?: Ref<HTMLInputElement>;
}

const HINTS: Record<IdNumberKind, string> = { pan: '9 digits, for example 301234567', citizenship: 'As printed, for example 27-01-71-02345' };

export function IdNumberInput({ kind, label, hint, error, value, onValueChange, digits = 'latn', labels, onBlur, testId, ...rest }: IdNumberInputProps) {
  const [left, setLeft] = useState(false);
  const words = { ...DEFAULT_ID_NUMBER_INPUT_LABELS, ...useLocaleMessages().messages.idNumberInput, ...labels };
  const result = validateIdNumber(kind, value);
  let message: string | undefined;
  if (left && result.state === 'invalid') {
    message = result.reason === 'characters' ? words.characters : result.reason === 'format' ? words.format : kind === 'pan' ? words.panLength : words.citizenshipLength;
  }
  const allowed = kind === 'pan' ? /^[\d\s]*$/ : /^[\d\s/-]*$/;
  return (
    <Field
      autoComplete="off"
      spellCheck={false}
      {...rest}
      testId={testId}
      label={label}
      hint={hint ?? HINTS[kind]}
      error={error ?? message}
      inputMode={kind === 'pan' ? 'numeric' : 'text'}
      maxLength={kind === 'pan' ? 11 : 32}
      value={digits === 'deva' ? idNumberToDevanagari(value) : value}
      onChange={(raw) => {
        const text = toAsciiIdText(raw).replace(/^\s+/, '');
        if (!allowed.test(text)) return;
        onValueChange({ value: text, check: validateIdNumber(kind, text) });
      }}
      onBlur={(event: FocusEvent<HTMLInputElement>) => {
        setLeft(true);
        onBlur?.(event);
      }}
    />
  );
}
