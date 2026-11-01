/**
 * Pure account-number and reference helpers. Display only: masking hides digits
 * on screen, it is not encryption and not access control. The full number must
 * come from your server only when the reader asks for it, and every rule here
 * (length, check digits) is generic: this module knows no bank, country or
 * scheme. Client-side checks never replace the server's.
 */

const SEPARATORS = /[\s\-_.]/g;
// Control characters and bidirectional/zero-width controls: they can reorder or hide text in a reference.
function invisible(code: number): boolean {
  return code <= 0x1f || (code >= 0x7f && code <= 0x9f) || code === 0xad || code === 0x061c || code === 0x180e || (code >= 0x200b && code <= 0x200f) || (code >= 0x202a && code <= 0x202e) || (code >= 0x2060 && code <= 0x2069) || code === 0xfeff;
}
const stripInvisible = (text: string, replacement: string) => Array.from(text, (char) => (invisible(char.codePointAt(0)!) ? replacement : char)).join('');

export interface MaskAccountNumberOptions {
  /** How many trailing characters to keep. Default 4. Never more than half the number (rounded down), so a short number is never fully shown. */
  visible?: number;
  /** Group the result in blocks of this size with `separator` (4 gives "•••• •••• 1234"). Default: no grouping. */
  groupSize?: number;
  /** The mark for a hidden character. Default '•'. */
  maskChar?: string;
  /** Between groups. Default a space. */
  separator?: string;
}

const whole = (n: unknown, fallback: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback);

/** Remove spaces, hyphens, dots and underscores and any control or invisible character. Non-strings become ''. */
export function normalizeAccountNumber(value: unknown): string {
  return typeof value === 'string' ? stripInvisible(value, '').replace(SEPARATORS, '') : '';
}

function group(text: string, size: number, separator: string): string {
  if (size < 1) return text;
  const parts: string[] = [];
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i += size) parts.push(chars.slice(i, i + size).join(''));
  return parts.join(separator);
}

/**
 * Hide all but the last `visible` characters of an account number. Separators in the input are dropped first, so
 * "0123 4567 8901 2345" and "0123456789012345" mask the same. It never reveals more than `visible` characters, and never
 * more than half the number: "1234" with visible 4 shows "••34". Empty or non-string input gives ''. The result keeps the
 * length (one mark per hidden character); if the length itself is sensitive, show a fixed placeholder instead.
 */
export function maskAccountNumber(value: unknown, options: MaskAccountNumberOptions = {}): string {
  const { groupSize = 0, maskChar = '•', separator = ' ' } = options;
  const chars = Array.from(normalizeAccountNumber(value));
  if (chars.length === 0) return '';
  const visible = Math.min(whole(options.visible, 4), Math.floor(chars.length / 2));
  const mark = Array.from(maskChar)[0] ?? '•';
  const hidden = chars.length - visible;
  const masked = mark.repeat(hidden) + chars.slice(hidden).join('');
  return group(masked, whole(groupSize, 0), separator);
}

/** The last characters only ("1234"), under the same cap as `maskAccountNumber`. For a short label such as "ending 1234". */
export function accountNumberTail(value: unknown, visible = 4): string {
  const chars = Array.from(normalizeAccountNumber(value));
  const keep = Math.min(whole(visible, 4), Math.floor(chars.length / 2));
  return keep === 0 ? '' : chars.slice(chars.length - keep).join('');
}

export interface FormatAccountNumberOptions {
  /** Block size. Default 4. 0 or less leaves the number ungrouped. */
  groupSize?: number;
  /** Between blocks. Default a space. */
  separator?: string;
}

/** Group a full account number in blocks ("0123456789012345" to "0123 4567 8901 2345"). Display only; the characters are unchanged. */
export function formatAccountNumber(value: unknown, options: FormatAccountNumberOptions = {}): string {
  return group(normalizeAccountNumber(value), whole(options.groupSize, 4), options.separator ?? ' ');
}

/** Spoken form of a number: single characters in blocks separated by commas, so a screen reader reads digits, not one huge figure. */
export function spokenAccountNumber(value: unknown, groupSize = 4): string {
  const chars = Array.from(normalizeAccountNumber(value));
  const size = whole(groupSize, 4) || chars.length || 1;
  const blocks: string[] = [];
  for (let i = 0; i < chars.length; i += size) blocks.push(chars.slice(i, i + size).join(' '));
  return blocks.join(', ');
}

/** Uppercase an IBAN and drop spaces and separators. Non-strings become ''. */
export function normalizeIban(value: unknown): string {
  return normalizeAccountNumber(value).toUpperCase();
}

/**
 * Check an IBAN's shape and its ISO 7064 mod-97 check digits. Generic on purpose: it accepts any two-letter prefix and 15
 * to 34 characters, and does not know which countries issue IBANs or how long theirs are. Passing means "no typing slip",
 * not "this account exists": confirm on the server.
 */
export function isValidIban(value: unknown): boolean {
  const iban = normalizeIban(value);
  if (iban.length < 15 || iban.length > 34 || !/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = char >= 'A' ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/** An IBAN in blocks of four ("GB82 WEST 1234 5698 7654 32"). Returns '' for non-strings. It does not validate; use `isValidIban`. */
export function formatIban(value: unknown): string {
  return group(normalizeIban(value), 4, ' ');
}

export interface FormatTransactionReferenceOptions {
  /** Group a reference without spaces in blocks of this size. Default: leave as is. */
  groupSize?: number;
  /** Shorten from the middle past this many characters ("ABCD…WXYZ"). Default: no limit. */
  maxLength?: number;
}

/**
 * Make a transaction reference safe and tidy to print: control, zero-width and bidirectional characters are removed (they can
 * reorder or hide text), whitespace is collapsed and trimmed, and a long reference can be shortened from the middle. The
 * reference is data from outside; React escapes it, and this keeps lookalike tricks out. Non-strings become ''.
 */
export function formatTransactionReference(value: unknown, options: FormatTransactionReferenceOptions = {}): string {
  if (typeof value !== 'string') return '';
  let text = stripInvisible(value, ' ').replace(/\s+/g, ' ').trim();
  const size = whole(options.groupSize, 0);
  if (size > 0 && !text.includes(' ')) text = group(text, size, ' ');
  const max = whole(options.maxLength, 0);
  const chars = Array.from(text);
  if (max >= 3 && chars.length > max) {
    const head = Math.ceil((max - 1) / 2);
    const tail = max - 1 - head;
    text = `${chars.slice(0, head).join('')}…${chars.slice(chars.length - tail).join('')}`;
  }
  return text;
}
