'use client';

/**
 * BottomTabBar (design.punji.app/components/bottom-tab-bar): the phone's
 * bottom navigation. A few tabs (links) and, last, a "More" button that opens
 * the app's bottom Sheet with everything else.
 *
 *   - A `nav` landmark with a list of links. The current page's tab carries
 *     aria-current="page" (you say which with `current`); the library never
 *     reads the URL, so it works with any router through LinkProvider.
 *   - More is a button (aria-haspopup="dialog", aria-expanded). Its sheet is
 *     modal: the page goes inert, scroll locks, focus moves in and comes back
 *     to More on close.
 *   - Fixed to the bottom with the device's safe-area inset, drawn into the
 *     document body, and hidden from 1024px up (a desk keeps its own
 *     navigation). It slides away while the reader scrolls down and returns on
 *     any scroll up, and steps aside while a text field has focus (the
 *     keyboard is up). `placement="inline"` renders it in place, unfixed.
 *   - Punji's tabs, routes and the More content stay in your app.
 */
import { useEffect, useState, type ReactNode } from 'react';

import { AppLink } from '../internal/link.tsx';
import type { LinkComponent } from '../internal/link.tsx';
import { Portal } from '../internal/Portal.tsx';
import { Sheet } from '../overlay/Overlay.tsx';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';

export interface BottomTab {
  /** Unique within the bar; what `current` names. */
  id: string;
  /** The tab's words (short: "Markets"). */
  label: string;
  /** A decorative glyph over the label (aria-hidden). */
  icon: ReactNode;
  /** Where it goes: an in-app path (your router link through LinkProvider) or an absolute URL (a plain link). */
  href: string;
  /** Becomes data-testid on the tab. */
  testId?: string;
}

export interface BottomTabBarProps {
  /** The nav landmark's accessible name ("Main"). */
  label: string;
  /** The tabs in order (three to five fit a phone). */
  tabs: readonly BottomTab[];
  /** The current page's tab id, or 'more' when the current page lives in More. Marks aria-current="page". */
  current?: string | null;
  /** What More opens: your own rows (a MenuList of MenuItemRow fits). A function receives `close`. Leave it out for no More tab. */
  more?: ReactNode | ((close: () => void) => ReactNode);
  /** More's words (default "More"). */
  moreLabel?: string;
  /** More's glyph (default three dots). */
  moreIcon?: ReactNode;
  /** The sheet's heading (default the More label). */
  moreTitle?: ReactNode;
  /** The sheet's close button name (default "Close"). */
  closeLabel?: string;
  /** Controlled: whether the More sheet is open. */
  open?: boolean;
  /** Starting state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called with the next state when More opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** 'fixed': pinned to the bottom, in the body, hidden from 1024px up (default). 'inline': in place, always shown. */
  placement?: 'fixed' | 'inline';
  /** Slide away on scroll down and while a text field has focus. Fixed placement only. Default true. */
  autoHide?: boolean;
  /** Link component for in-app `href`s; wins over LinkProvider. */
  linkComponent?: LinkComponent;
  /** Becomes data-testid on the nav; More is `<testId>-more`. */
  testId?: string;
}

const NOT_TEXT = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image']);

/** A field that raises the keyboard. */
function isField(el: Element | null): boolean {
  if (!el) return false;
  if ((el as HTMLElement).isContentEditable) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  // A read-only field, or one that opens its own sheet (inputmode none), raises no keyboard.
  const input = el as HTMLInputElement;
  return el.tagName === 'INPUT' && !NOT_TEXT.has(input.type) && !input.readOnly && input.inputMode !== 'none';
}

/** True while a text field has focus or the visual viewport says a keyboard is up. */
function useTyping(active: boolean): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (!active) return;
    const check = () => {
      const vv = window.visualViewport;
      setTyping(isField(document.activeElement) || (!!vv && vv.height < window.innerHeight * 0.75));
    };
    const later = () => window.setTimeout(check, 0);
    document.addEventListener('focusin', check);
    document.addEventListener('focusout', later);
    window.visualViewport?.addEventListener('resize', check);
    check();
    return () => {
      document.removeEventListener('focusin', check);
      document.removeEventListener('focusout', later);
      window.visualViewport?.removeEventListener('resize', check);
    };
  }, [active]);
  return active && typing;
}

/** Hidden after a scroll down, shown again on any scroll up. */
function useScrollAway(active: boolean): boolean {
  const [away, setAway] = useState(false);
  useEffect(() => {
    if (!active) return;
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        if (y <= 8) setAway(false);
        else if (y > last + 6) setAway(true);
        else if (y < last - 2) setAway(false);
        last = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [active]);
  return active && away;
}

const Dots = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);

/**
 * @stability beta
 */
export function BottomTabBar({
  label,
  tabs,
  current,
  more,
  moreLabel = 'More',
  moreIcon,
  moreTitle,
  closeLabel,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  placement = 'fixed',
  autoHide = true,
  linkComponent,
  testId,
}: BottomTabBarProps) {
  const [open, setOpen] = useControllableState<boolean>({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange, name: 'BottomTabBar open' });
  const fixed = placement === 'fixed';
  const away = useScrollAway(fixed && autoHide);
  const typing = useTyping(fixed && autoHide);
  const hidden = !open && (away || typing);
  // The Sheet's focus scope puts focus back on More when it unmounts.
  const close = () => setOpen(false);

  const bar = (
    <nav className={`pu-tabbar${fixed ? ' pu-tabbar-fixed' : ''}`} aria-label={label} data-hidden={hidden || undefined} data-testid={testId}>
      {/* oxlint-disable-next-line jsx-a11y/no-redundant-roles -- Safari drops list semantics from list-style: none lists unless the role is explicit */}
      <ul role="list">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <AppLink className="pu-tabbar-tab" href={tab.href} linkComponent={linkComponent} aria-current={!open && current === tab.id ? 'page' : undefined} data-testid={tab.testId}>
              <span className="pu-tabbar-icon" aria-hidden="true">{tab.icon}</span>
              <span className="pu-tabbar-label">{tab.label}</span>
            </AppLink>
          </li>
        ))}
        {more !== undefined ? (
          <li>
            <button
              type="button"
              className="pu-tabbar-tab"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-current={!open && current === 'more' ? 'page' : undefined}
              onClick={() => setOpen(!open)}
              data-testid={testId ? `${testId}-more` : undefined}
            >
              <span className="pu-tabbar-icon" aria-hidden="true">{moreIcon ?? <Dots />}</span>
              <span className="pu-tabbar-label">{moreLabel}</span>
            </button>
          </li>
        ) : null}
      </ul>
    </nav>
  );

  return (
    <>
      {fixed ? <Portal>{bar}</Portal> : bar}
      {more !== undefined ? (
        <Sheet open={open} title={moreTitle ?? moreLabel} onClose={close} closeLabel={closeLabel} testId={testId ? `${testId}-sheet` : undefined}>
          {typeof more === 'function' ? more(close) : more}
        </Sheet>
      ) : null}
    </>
  );
}
