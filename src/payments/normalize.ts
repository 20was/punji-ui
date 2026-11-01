/**
 * Shared input clean-up for payment identifiers: digits of any supported script to ASCII, separators and invisible
 * characters dropped, letters uppercased. Pure: no React, no browser globals.
 */
import { toAsciiDigits } from '../nepal/decimal.ts';

/** The state of a typed payment identifier. 'partial' means it can still become valid by typing more. */
export type PaymentState = 'empty' | 'partial' | 'valid' | 'invalid';

/** Why a value is invalid. */
export type PaymentReason =
  | 'characters'
  | 'length'
  | 'format'
  | 'checksum'
  | 'country'
  | 'brand'
  | 'month'
  | 'expired'
  | 'too-far'
  | 'handle'
  | 'provider';

/** The common result of every payment check. */
export interface PaymentCheck {
  /** See `PaymentState`. */
  state: PaymentState;
  /** The canonical value to store and send: ASCII, uppercase where letters are case-insensitive, no separators. */
  value: string;
  /** The grouped form to show ("GB82 WEST 1234 …", "12-34-56"). Works on partial input. */
  display: string;
  /** Why it is invalid, else null. */
  reason: PaymentReason | null;
  /** True when invisible, bidi or control characters were removed from the input (a pasted value may carry them). */
  cleaned: boolean;
}

// Controls, soft hyphen, bidi marks and isolates, zero-width characters and the BOM.
// eslint-disable-next-line no-control-regex
const INVISIBLE = /[\u0000-\u001F\u007F-\u009F­؜᠎​-‏‪-‮⁠-⁩﻿]/g;
// Spaces of every kind, hyphens and dashes, dots and slashes used as separators.
const SEPARATORS = /[\s  -   　\-‐-―−._/]/g;

/** Remove invisible characters and report whether any were there. */
export function stripInvisible(text: string): { text: string; cleaned: boolean } {
  const out = String(text ?? '').replace(INVISIBLE, '');
  return { text: out, cleaned: out.length !== String(text ?? '').length };
}

/**
 * Pasted or typed text to a compact ASCII form: digits of any supported script (Devanagari, Bengali, Arabic-Indic and
 * more) become ASCII, full-width letters become ASCII, spaces, dashes, dots and slashes are dropped, and invisible
 * characters are removed. Letters are uppercased unless `keepCase` is set. Other characters are kept, so a check can
 * refuse them.
 */
export function compactPaymentInput(text: string, options: { keepCase?: boolean; keepSeparators?: boolean } = {}): { text: string; cleaned: boolean } {
  const stripped = stripInvisible(text);
  let out = toAsciiDigits(stripped.text.normalize('NFKC'));
  if (!options.keepSeparators) out = out.replace(SEPARATORS, '');
  if (!options.keepCase) out = out.toUpperCase();
  return { text: out, cleaned: stripped.cleaned };
}

/** Split text into groups of the given sizes; the last size repeats. "12345678", [4] gives "1234 5678". */
export function groupBy(text: string, sizes: readonly number[], separator = ' '): string {
  const parts: string[] = [];
  let at = 0;
  let index = 0;
  while (at < text.length) {
    const size = Math.max(1, sizes[Math.min(index, sizes.length - 1)] ?? 4);
    parts.push(text.slice(at, at + size));
    at += size;
    index++;
  }
  return parts.join(separator);
}

/** Build a result. */
export const check = (state: PaymentState, value: string, display: string, reason: PaymentReason | null, cleaned: boolean): PaymentCheck =>
  ({ state, value, display, reason, cleaned });

/** ISO 7064 mod 97-10 remainder of an alphanumeric string (letters count as 10 to 35), without bigint. */
export function mod97(text: string): number {
  let remainder = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    const digits = code >= 65 ? String(code - 55) : char;
    for (const digit of digits) remainder = (remainder * 10 + (digit.charCodeAt(0) - 48)) % 97;
  }
  return remainder;
}

/** The Luhn (mod 10) check on a string of ASCII digits. False for anything else or fewer than two digits. */
export function luhnValid(digits: string): boolean {
  if (!/^\d{2,}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits.charCodeAt(digits.length - 1 - i) - 48;
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}
