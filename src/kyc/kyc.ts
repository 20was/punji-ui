/**
 * Shape checks for Nepali identity numbers typed into KYC forms: the Permanent Account Number (PAN, nine digits,
 * issued by the Inland Revenue Department) and the citizenship certificate number (digits in groups separated by
 * "-" or "/", as printed by the issuing district). Devanagari digits are accepted and stored as ASCII.
 *
 * These are typing-slip checks only. They do not know whether a number was issued, to whom, or by which district;
 * there is no public check digit for either. Verify against the issuing authority or your KYC provider on the server.
 * Pure: no React, no browser globals.
 */

export type IdNumberKind = 'pan' | 'citizenship';

export type IdNumberResult =
  | { state: 'empty'; value: '' }
  | { state: 'invalid'; value: string; reason: 'characters' | 'length' | 'format' }
  | { state: 'valid'; value: string };

const DEVANAGARI = '०१२३४५६७८९';

/** Devanagari digits to ASCII, Unicode dashes to "-", whitespace trimmed. Other characters are kept for the check to refuse. */
export function toAsciiIdText(text: string): string {
  return text.replace(/[०-९]/g, (d) => String(DEVANAGARI.indexOf(d))).replace(/[‐-―−]/g, '-').trim();
}

/** ASCII digits to Devanagari, for display. Separators are kept. */
export function idNumberToDevanagari(text: string): string {
  return text.replace(/\d/g, (d) => DEVANAGARI[Number(d)]!);
}

/** Check a PAN: exactly nine digits once spaces and dashes are dropped. The canonical value is the nine digits. */
export function validatePan(text: string): IdNumberResult {
  const ascii = toAsciiIdText(String(text ?? '')).replace(/[\s-]/g, '');
  if (ascii === '') return { state: 'empty', value: '' };
  if (!/^\d+$/.test(ascii)) return { state: 'invalid', value: ascii, reason: 'characters' };
  if (ascii.length !== 9) return { state: 'invalid', value: ascii, reason: 'length' };
  return { state: 'valid', value: ascii };
}

/** "123 456 789" for reading a PAN aloud or on a card; the stored value stays nine digits. */
export function formatPan(value: string): string {
  const result = validatePan(value);
  return result.state === 'valid' ? result.value.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3') : String(value ?? '');
}

/**
 * Check a citizenship certificate number: groups of digits joined by single "-" or "/" ("27-01-71-02345",
 * "1234/5678", "123456"), 3 to 20 digits in all. Spaces become "-". The canonical value keeps the separators as typed,
 * because the issuing office's grouping is part of the number.
 */
export function validateCitizenshipNumber(text: string): IdNumberResult {
  const ascii = toAsciiIdText(String(text ?? '')).replace(/\s+/g, '-');
  if (ascii === '') return { state: 'empty', value: '' };
  if (!/^[\d/-]+$/.test(ascii)) return { state: 'invalid', value: ascii, reason: 'characters' };
  if (!/^\d+(?:[/-]\d+)*$/.test(ascii)) return { state: 'invalid', value: ascii, reason: 'format' };
  const digits = ascii.replace(/\D/g, '').length;
  if (digits < 3 || digits > 20) return { state: 'invalid', value: ascii, reason: 'length' };
  return { state: 'valid', value: ascii };
}

/** Validate either kind. */
export function validateIdNumber(kind: IdNumberKind, text: string): IdNumberResult {
  return kind === 'pan' ? validatePan(text) : validateCitizenshipNumber(text);
}
