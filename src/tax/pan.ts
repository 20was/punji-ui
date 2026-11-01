/**
 * Nepal PAN and VAT registration numbers: nine digits. The Inland Revenue Department issues one number that serves as
 * the PAN and, once registered for VAT, the VAT number. This checks the shape only (nine digits, after removing
 * spaces and hyphens and converting Devanagari digits); it does not know whether the number was issued, and it applies
 * no checksum, because none is published. Look the number up with the IRD and validate it again on your server.
 */

import { fromDevanagari, showDigits } from '../internal/digits.ts';

export const PAN_LENGTH = 9;

export type PanCheck =
  | {
      /** Nothing typed. */
      state: 'empty';
      /** Always ''. */
      value: '';
    }
  | {
      /** Fewer than nine digits: still typing. */
      state: 'partial';
      /** The digits so far, ASCII. */
      value: string;
    }
  | {
      /** Exactly nine digits. */
      state: 'valid';
      /** The nine digits, ASCII. */
      value: string;
    }
  | {
      /** A character that is not a digit, or more than nine digits. */
      state: 'invalid';
      /** The normalised text, ASCII digits and any other characters kept. */
      value: string;
      /** 'characters' for a letter or symbol, 'length' for more than nine digits. */
      reason: 'characters' | 'length';
    };


/** Devanagari digits to ASCII, spaces, hyphens and dots removed. Other characters are kept so the check can refuse them. */
export function normalizePan(input: string): string {
  return fromDevanagari(input.slice(0, 64)).replace(/[\s\-‐-―.]/g, '');
}

/**
 * Check a PAN or VAT number as typed. `partial` is fewer than nine digits (still typing); `invalid` is a character
 * that is not a digit, or more than nine digits. The `value` is the normalised ASCII digits.
 */
export function checkPan(input: string): PanCheck {
  const value = normalizePan(input);
  if (value === '') return { state: 'empty', value: '' };
  if (!/^\d+$/.test(value)) return { state: 'invalid', value, reason: 'characters' };
  if (value.length < PAN_LENGTH) return { state: 'partial', value };
  if (value.length > PAN_LENGTH) return { state: 'invalid', value, reason: 'length' };
  return { state: 'valid', value };
}

/** True when the input is exactly nine digits after normalising. */
export function isValidPan(input: string): boolean {
  return checkPan(input).state === 'valid';
}

/** A PAN for display: the nine digits, optionally in Devanagari. A value that is not a valid PAN is returned normalised but unchanged otherwise. */
export function formatPanNumber(input: string, options: { digits?: 'latn' | 'deva' } = {}): string {
  const value = normalizePan(input);
  return showDigits(value, options.digits);
}
