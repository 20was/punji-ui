'use client';

/**
 * BoidInput: a field for a 16-digit BOID (demat account number). Typed or pasted text is cleaned as it arrives
 * (Devanagari digits converted, spaces and hyphens dropped, anything else refused), so the value is always ASCII
 * digits. Once the BOID is complete the hint shows its DP ID and client ID; a problem (too short, wrong prefix) is
 * said in words after the field is left, never while the person is still typing. The shape is all it checks:
 * whether the account exists is the depository's answer.
 */
import { useState, type FocusEvent, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

import { Field } from '../fields/Fields.tsx';
import { boidMessage, checkBoid, normalizeBoid, type BoidCheck, type BoidOptions, type BoidParts, type BoidProblem } from '../share-issues/boid.ts';
import { showDigits } from '../internal/digits.ts';

export interface BoidInputChange {
  /** ASCII digits only ('' when cleared). */
  value: string;
  /** The shape check of `value`. */
  check: BoidCheck;
}

export interface BoidInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size' | 'type' | 'inputMode' | 'defaultValue' | 'prefix'> {
  /** The visible label. Default 'BOID'. */
  label?: ReactNode;
  /** Controlled value: ASCII digits, as `onValueChange` gives them. */
  value: string;
  /** Called with each accepted edit. */
  onValueChange: (change: BoidInputChange) => void;
  /** Help text; replaced by the DP split once the BOID is complete, and by an error. Default '16 digits, as printed on your demat statement'. */
  hint?: ReactNode;
  /** An error from your side (for example "Not found at CDSC"). Replaces the built-in message. */
  error?: ReactNode;
  /** Required prefix. Default '130' (CDSC); `null` checks the length only. */
  prefix?: string | null;
  /** Show the digits in Devanagari. The value stays ASCII. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** Text under a complete BOID. Default "DP ID 13013700 · Client ID 00012345". `null` hides it. */
  partsHint?: ((parts: BoidParts) => ReactNode) | null;
  /** Words for a problem. Default `boidMessage` (English). */
  message?: (problem: BoidProblem, digits: number) => ReactNode;
  /** Field size: 'lg' (default) or 'md'. */
  size?: 'md' | 'lg';
  /** Hide the label visually. */
  hideLabel?: boolean;
  /** Test id on the input. */
  testId?: string;
  /** Ref to the input element. */
  ref?: Ref<HTMLInputElement>;
}


const defaultParts = (p: BoidParts) => `DP ID ${p.dpId} · Client ID ${p.clientId}`;

export function BoidInput({
  label = 'BOID', value, onValueChange, hint = '16 digits, as printed on your demat statement', error, prefix, digits = 'latn', partsHint = defaultParts,
  message, onBlur, testId, className, ...rest
}: BoidInputProps) {
  const [left, setLeft] = useState(false);
  const options: BoidOptions = { prefix };
  const check = checkBoid(value, options);
  const builtIn = left && !check.ok && check.problem !== 'empty' ? (message ? message(check.problem, check.digits) : boidMessage(check.problem, check.digits, options)) : undefined;
  const shown = showDigits(value, digits);
  const toDeva = (text: string) => showDigits(text, digits);
  const help = check.ok && partsHint ? (() => { const h = partsHint(check.parts); return typeof h === 'string' ? toDeva(h) : h; })() : hint;
  return (
    <Field
      {...rest}
      className={className ? `pu-boid-input ${className}` : 'pu-boid-input'}
      label={label}
      value={shown}
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      testId={testId}
      hint={help}
      error={error ?? builtIn}
      onChange={(raw) => {
        const next = normalizeBoid(raw);
        if (!/^\d*$/.test(next) || next.length > 20) return;
        onValueChange({ value: next, check: checkBoid(next, options) });
      }}
      onBlur={(event: FocusEvent<HTMLInputElement>) => {
        setLeft(true);
        onBlur?.(event);
      }}
    />
  );
}
