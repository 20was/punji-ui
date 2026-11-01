// Pure filename sanitiser shared by downloads.

// Control, path and reserved characters, and the invisible bidirectional and zero-width controls: an RLO (U+202E) can
// make "invoice‮fdp.exe" read as "invoiceexe.pdf", hiding the real extension.
// oxlint-disable-next-line no-control-regex -- matching control characters is the point
const UNSAFE = /[\u0000-\u001f\u007f<>:"/\\|?*؜᠎​-‏‪-‮⁠-⁩﻿]/g;

/** Drop leading and trailing dots and whitespace in linear time (a `/[.\s]+$/` replace is quadratic on long runs). */
function trim(text: string): string {
  let end = text.length;
  while (end > 0 && /[.\s]/.test(text[end - 1]!)) end--;
  return text.slice(0, end).replace(/^[.\s]+/, '');
}

/** A conservative cross-platform file name: no path parts, reserved, control, bidirectional or zero-width
 * characters, no leading dots or trailing dots/spaces; at most 150 UTF-16 code units, never splitting a
 * surrogate pair; never empty.
 */
export function safeFilename(name: string, fallback = 'download'): string {
  let cleaned = trim(name.normalize('NFKC').replace(UNSAFE, '_')).slice(0, 150);
  if (/[\uD800-\uDBFF]$/.test(cleaned)) cleaned = cleaned.slice(0, -1);
  cleaned = trim(cleaned);
  return /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(cleaned) ? `_${cleaned}` : cleaned || fallback;
}
