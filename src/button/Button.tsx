/**
 * Button (design.punji.app/components/button): primary, secondary, ghost and
 * danger; sm 32 / md 36 / lg 44; icon-only with a required name; loading.
 * Its own file: the account shell loads it on every page, the rest of the
 * controls only where a page draws them.
 */
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import type { LinkComponent } from '../internal/link.tsx';

import type { ControlSize } from '../select/Select.tsx';

/** primary: the view's one main action. secondary: every other action. ghost: a quiet action in a row or a toolbar. danger: a confirmed destructive action. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonBase extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  /** The look: primary (default), secondary, ghost or danger. */
  variant?: ButtonVariant;
  /** The control scale: sm 32, md 36 (default), lg 44 (a form's or a phone bar's main action). */
  size?: ControlSize;
  /** Full width of its container. */
  block?: boolean;
  /** Busy: a spinner, not clickable, aria-busy. */
  loading?: boolean;
  /** An icon before the label (decorative: aria-hidden). */
  icon?: ReactNode;
  /** A tile: the icon over a short, centred label (a quick-action grid on a phone). Wants an `icon`; the label wraps onto two lines. Ignored with `iconOnly`. */
  stacked?: boolean;
  /** Renders a link styled as a button: a plain <a>, or `linkComponent` for an in-app path. An absolute http(s) URL is another site: a plain <a> that opens a new tab (rel noopener noreferrer), with a ↗ drawn after the label and `newTabLabel` read to screen readers. */
  href?: string;
  /** Overrides the new-tab decision for `href`: true opens any address in a new tab, false keeps an absolute URL in the same tab. Default: true only for absolute http(s) URLs. */
  external?: boolean;
  /** Screen-reader words for a link that opens a new tab. Default "(opens in a new tab)". */
  newTabLabel?: string;
  /** The link element for an in-app `href` (wrap your router's link; it receives `href`). Default: a plain <a>. */
  linkComponent?: LinkComponent;
  /** Test id on the rendered button or link. */
  testId?: string;
  /** Layout hooks only (margin, flex), never a restyle. */
  className?: string;
  /** React 19: a ref is a prop (focus the confirm button of a question, etc.). */
  ref?: Ref<HTMLButtonElement>;
}

/** Icon only: a square button whose accessible name is `label` (required). The icon is `icon` or the children. */
type ButtonProps = ButtonBase &
  (
    | { iconOnly?: false; label?: undefined }
    | {
        /** A square button that shows only its icon (the icon prop, or the children). */
        iconOnly: true;
        /** The accessible name of an icon-only button (required with iconOnly). */
        label: string;
      }
  );

/**
 * The button's classes, for the rare link the Button cannot render
 * itself (a link component with its own props). Never extend them.
 */
export function buttonClass({ variant = 'primary', size = 'md', block, iconOnly, stacked }: { variant?: ButtonVariant; size?: ControlSize; block?: boolean; iconOnly?: boolean; stacked?: boolean } = {}): string {
  return `kit-btn ${variant}${size === 'md' ? '' : ` ${size}`}${iconOnly ? ' icon' : ''}${block ? ' block' : ''}${stacked && !iconOnly ? ' stacked' : ''}`;
}

/** The one button (design.punji.app/components/button). */
export function Button({ variant = 'primary', size = 'md', block, loading, icon, stacked, iconOnly, label, href, external, newTabLabel = '(opens in a new tab)', linkComponent, testId, children, disabled, type = 'button', className, ...rest }: ButtonProps) {
  const cls = `${buttonClass({ variant, size, block, iconOnly, stacked })}${className ? ` ${className}` : ''}`;
  const glyph = iconOnly ? (icon ?? children) : icon;
  const body = (
    <>
      {loading ? <span className="kit-spin" aria-hidden="true" /> : glyph ? <span className="kit-btn-ico" aria-hidden="true">{glyph}</span> : null}
      {iconOnly ? null : children}
    </>
  );
  const name = iconOnly ? label : undefined;
  if (href) {
    const absolute = /^https?:/.test(href);
    const newTab = external ?? absolute;
    const L = linkComponent && !absolute && !newTab ? linkComponent : 'a';
    return (
      <L className={cls} href={href} {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : null)} aria-label={name && newTab ? `${name} ${newTabLabel}` : name} data-testid={testId}>
        {body}
        {newTab && !name ? <>{' '}<span className="kit-sr">{newTabLabel}</span></> : null}
      </L>
    );
  }
  return (
    <button {...rest} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} aria-label={name ?? rest['aria-label']} data-testid={testId}>
      {body}
    </button>
  );
}
