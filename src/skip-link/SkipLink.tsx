'use client';

/**
 * SkipLink (design.punji.app/components/skip-link): the first focusable element on every page, a link that jumps
 * past the header and navigation to the main content (WCAG 2.4.1). Invisible until it takes keyboard focus, then
 * pinned over the header. It also moves focus into the target, so the next Tab starts in the content in browsers and
 * routers that only scroll to a hash. The target needs an `id` (default `main`); give a `<main>` `id="main"`.
 */
export interface SkipLinkProps {
  /** The in-page address of the content to jump to. Default '#main'. */
  href?: `#${string}`;
  /** The link's words. Default 'Skip to content'. */
  label?: string;
  /** Layout only (margin), never a restyle. */
  className?: string;
  /** Becomes data-testid on the link. */
  testId?: string;
}

function focusTarget(href: string): void {
  let id: string;
  try {
    id = decodeURIComponent(href.slice(1));
  } catch {
    return;
  }
  const target = document.getElementById(id);
  if (!target) return;
  // A <main> or <div> is not focusable on its own; -1 lets script focus it without adding it to the tab order.
  if (!target.hasAttribute('tabindex') && !/^(a|button|input|select|textarea)$/i.test(target.tagName)) target.setAttribute('tabindex', '-1');
  target.focus();
  target.scrollIntoView?.({ block: 'start' });
}

/**
 * @stability beta
 */
export function SkipLink({ href = '#main', label = 'Skip to content', className, testId }: SkipLinkProps) {
  return (
    <a href={href} className={`pu-skip-link${className ? ` ${className}` : ''}`} onClick={() => focusTarget(href)} data-testid={testId}>
      {label}
    </a>
  );
}
