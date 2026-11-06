/**
 * safeHref (design.punji.app/get-started/router): the guard every `href` the
 * kit renders passes through. Pure, no React, so a server component can call it.
 */
import { devWarn } from '../internal/devWarn.ts';

/**
 * Returns `href` when it is safe to put in a link, otherwise `undefined`.
 * Relative paths, `#fragments`, `?queries` and protocol-relative `//host`
 * addresses pass, as do http, https, mailto and tel. Every other scheme
 * (`javascript:`, `vbscript:`, `data:`, `file:` and so on) is blocked, also
 * when it hides behind spaces, tabs, line breaks or capitals. Empty and
 * non-string values give `undefined`. In development a blocked address logs a
 * warning.
 */
export function safeHref(href: string | null | undefined): string | undefined {
  // Browsers ignore control characters and spaces while reading a scheme ("java\nscript:").
  // oxlint-disable-next-line no-control-regex
  const probe = (href ?? '').replace(/[\s\0-\x1f]/g, '');
  if (/^(?!(?:https?|mailto|tel):)[\w.+-]+:/i.test(probe)) devWarn('blocked a link scheme');
  else if (probe) return href?.trim();
}
