// Pure filename sanitiser shared by downloads.

/** A conservative cross-platform file name: no path parts, reserved or control characters,
 * leading dots or trailing dots/spaces; at most 150 characters; never empty.
 */
export function safeFilename(name: string, fallback = 'download'): string {
  const cleaned = Array.from(name.normalize('NFKC'))
    .map((ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 || '<>:"/\\|?*'.includes(ch) ? '_' : ch))
    .join('')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 150)
    .replace(/[.\s]+$/g, '');
  return /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(cleaned) ? `_${cleaned}` : cleaned || fallback;
}
