/**
 * safeHref (design.punji.app/get-started/router): the guard every `href` the
 * kit renders passes through. Pure, no React, so a server component can call it.
 */
import { devWarn } from '../internal/devWarn.ts';

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
const ALLOWED = new Set(['http', 'https', 'mailto', 'tel']);

/**
 * Returns `href` when it is safe to put in a link, otherwise `undefined`.
 * Relative paths, `#fragments`, `?queries` and protocol-relative `//host`
 * addresses pass, as do http, https, mailto and tel. Every other scheme
 * (`javascript:`, `vbscript:`, `data:`, `file:` and so on) is blocked, also
 * when it hides behind spaces, tabs, line breaks or capitals. Empty and
 * non-string values give `undefined`. In development a blocked address logs a
 * warning (the scheme only, never the rest of the address).
 */
export function safeHref(href: string | null | undefined): string | undefined {
  if (typeof href !== 'string') return undefined;
  // Browsers ignore control characters and spaces while reading a scheme ("java\nscript:").
  // oxlint-disable-next-line no-control-regex
  const probe =href.replace(/[\s\u0000-\u001f\u007f-\u009f\u200b-\u200d\u2060\ufeff]/g, '');
  if (!probe) return undefined;
  const scheme = SCHEME.exec(probe)?.[1]?.toLowerCase();
  if (scheme && !ALLOWED.has(scheme)) {
    devWarn(`blocked a link with the "${scheme}:" scheme; it renders without an href`);
    return undefined;
  }
  return href.trim();
}
