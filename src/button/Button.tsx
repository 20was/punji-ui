/**
 * PLACEHOLDER (pipeline proof). Copied from the in-repo kit so the build, test,
 * size and package gates run on real code. The real kit arrives in the
 * extraction PR. One change from the kit: `href` renders a plain <a> (the
 * package does not depend on a router; router links arrive with the
 * extraction as a `render` prop).
 *
 * Button (https://design.punji.app/components/button): primary, secondary,
 * ghost and danger; sm 32 / md 36 / lg 44; icon-only with a required name;
 * loading. Styles: `@punji/ui/styles.css` or `@punji/ui/css/button.css`.
 */
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

import type { ControlSize } from '../internal/types.ts';

/** primary: the view's one main action. secondary: every other action. ghost: a quiet action in a row or a toolbar. danger: a confirmed destructive action. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonBase extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  /** The control scale: sm 32, md 36 (default), lg 44 (a form's or a phone bar's main action). */
  size?: ControlSize;
  /** Full width of its container. */
  block?: boolean;
  /** Busy: a spinner, not clickable, aria-busy. */
  loading?: boolean;
  /** An icon before the label (decorative: aria-hidden). */
  icon?: ReactNode;
  /** Renders a link styled as a button. */
  href?: string;
  testId?: string;
  /** Layout hooks only (margin, flex), never a restyle. */
  className?: string;
  /** React 19: a ref is a prop. */
  ref?: Ref<HTMLButtonElement>;
}

/** Icon only: a square button whose accessible name is `label` (required). The icon is `icon` or the children. */
export type ButtonProps = ButtonBase & ({ iconOnly?: false; label?: undefined } | { iconOnly: true; label: string });

/** The button's classes, for the rare element the Button cannot render itself. Never extend them. */
export function buttonClass({ variant = 'primary', size = 'md', block, iconOnly }: { variant?: ButtonVariant; size?: ControlSize; block?: boolean; iconOnly?: boolean } = {}): string {
  return `kit-btn ${variant}${size === 'md' ? '' : ` ${size}`}${iconOnly ? ' icon' : ''}${block ? ' block' : ''}`;
}

/** The one button. */
export function Button({ variant = 'primary', size = 'md', block, loading, icon, iconOnly, label, href, testId, children, disabled, type = 'button', className, ...rest }: ButtonProps) {
  const cls = `${buttonClass({ variant, size, block, iconOnly })}${className ? ` ${className}` : ''}`;
  const glyph = iconOnly ? (icon ?? children) : icon;
  const body = (
    <>
      {loading ? <span className="kit-spin" aria-hidden="true" /> : glyph ? <span className="kit-btn-ico" aria-hidden="true">{glyph}</span> : null}
      {iconOnly ? null : children}
    </>
  );
  const name = iconOnly ? label : undefined;
  if (href) {
    return (
      <a className={cls} href={href} aria-label={name} data-testid={testId}>
        {body}
      </a>
    );
  }
  return (
    <button {...rest} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} aria-label={name ?? rest['aria-label']} data-testid={testId}>
      {body}
    </button>
  );
}
