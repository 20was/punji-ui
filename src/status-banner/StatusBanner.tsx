'use client';
/**
 * StatusBanner (design.punji.app/components/status-banner): a notice about the whole system, not one field or
 * one action: the market is closed, prices are delayed, maintenance is planned, a service is degraded. Tones are
 * info, warn and danger; each has an icon and the words carry the meaning. info and warn are `role="status"`
 * (polite); danger is `role="alert"` (assertive). An optional action is a link (through the router link you gave
 * `LinkProvider`) or a button; the banner can be dismissed (controlled with `open`, or uncontrolled), and can stick
 * to the top of the page.
 *
 * A sticky banner covers content under it. Give the scrolling container `scroll-padding-top` equal to the
 * banner's height so a focused control is never hidden behind it (WCAG 2.4.11 Focus Not Obscured).
 *
 * @stability beta
 * @remarks Display only. A banner that says "market closed" or "maintenance" does not stop an order or a transfer; the server must refuse them.
 */
import type { ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import type { LinkComponent } from '../internal/link.tsx';
import { useLocaleMessages } from '../locale/context.tsx';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';

export type StatusBannerTone = 'info' | 'warn' | 'danger';

/** StatusBanner's words. Also settable for every instance under `statusBanner` in the locale messages. */
export interface StatusBannerLabels {
  /** The dismiss button's name. Default "Dismiss". */
  dismiss?: string;
}

export interface StatusBannerAction {
  /** The action's words ("View status page"). */
  label: string;
  /** Makes the action a link. In-app paths use the `linkComponent` or the nearest `LinkProvider`. */
  href?: string;
  /** Makes the action a button. */
  onClick?: () => void;
  /** The link element for an in-app `href`. */
  linkComponent?: LinkComponent;
}

export interface StatusBannerProps {
  /** info (neutral), warn (a caution) or danger (something is wrong). Default info. */
  tone?: StatusBannerTone;
  /** A short bold lead ("Markets are closed"). */
  title?: ReactNode;
  /** The message, one or two sentences. */
  children?: ReactNode;
  /** One action: a link (`href`) or a button (`onClick`). */
  action?: StatusBannerAction;
  /** Show a dismiss button. Default false. */
  dismissible?: boolean;
  /** Controlled visibility. Omit for uncontrolled (starts open, closes on dismiss). */
  open?: boolean;
  /** Uncontrolled initial visibility. Default true. */
  defaultOpen?: boolean;
  /** Called with false when dismissed (and with the new value in controlled mode). */
  onOpenChange?: (open: boolean) => void;
  /** Stick to the top of the scroll container, under `--pu-z-sticky`. Add scroll-padding-top to the scroller. Default false. */
  sticky?: boolean;
  /** Your words; they win over the locale provider's `statusBanner`. */
  labels?: StatusBannerLabels;
  /** Sets `data-testid` on the root; the action gets `<id>-action` and the dismiss button `<id>-dismiss`. */
  testId?: string;
  /** Layout only. */
  className?: string;
}

function ToneGlyph({ tone }: { tone: StatusBannerTone }) {
  return (
    <svg className="pu-status-banner-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {tone === 'info' && (<><circle cx="12" cy="12" r="9.5" /><path d="M12 11v6M12 7.5h.01" /></>)}
      {tone === 'warn' && (<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>)}
      {tone === 'danger' && (<><circle cx="12" cy="12" r="9.5" /><path d="M15 9l-6 6M9 9l6 6" /></>)}
    </svg>
  );
}

/** @stability beta */
export function StatusBanner({ tone = 'info', title, children, action, dismissible, open, defaultOpen = true, onOpenChange, sticky, labels, testId, className }: StatusBannerProps) {
  const { messages } = useLocaleMessages();
  const { dismiss = 'Dismiss' } = { ...messages.statusBanner, ...labels };
  const [visible, setVisible] = useControllableState<boolean>({ value: open, defaultValue: defaultOpen, onChange: onOpenChange, name: 'StatusBanner open' });
  if (!visible) return null;
  return (
    <div
      className={`pu-status-banner ${tone}${sticky ? ' sticky' : ''}${className ? ` ${className}` : ''}`}
      role={tone === 'danger' ? 'alert' : 'status'}
      data-testid={testId}
    >
      <ToneGlyph tone={tone} />
      <div className="pu-status-banner-body">
        {title && <strong className="pu-status-banner-title">{title}</strong>}
        {children && <span className="pu-status-banner-text">{children}</span>}
      </div>
      {action && (action.href || action.onClick) && (
        <Button variant="ghost" size="sm" href={action.href} linkComponent={action.linkComponent} onClick={action.onClick} testId={testId ? `${testId}-action` : undefined}>
          {action.label}
        </Button>
      )}
      {dismissible && (
        <Button variant="ghost" size="sm" iconOnly label={dismiss} onClick={() => setVisible(false)} testId={testId ? `${testId}-dismiss` : undefined}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </Button>
      )}
    </div>
  );
}
