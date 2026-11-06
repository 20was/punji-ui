'use client';

/**
 * MenuButton (design.punji.app/components/menu): a button that opens a menu of
 * actions, the WAI-ARIA Menu Button pattern. Use it for row actions in a table,
 * an account menu or a "More" button. A panel with its own controls (a form, a
 * filter) is a Popover; choosing a value for a field is a Select.
 *
 *   - The button has aria-haspopup="menu" and aria-expanded. Enter, Space,
 *     click and ArrowDown open it on the first item; ArrowUp on the last.
 *   - Arrows move and wrap, Home and End jump, typing a letter jumps to the next
 *     item that starts with it. Disabled items are announced but skipped.
 *   - Esc closes and returns focus to the button; Tab closes and moves on.
 *   - Items are actions, links (a plain <a>, or your router link through
 *     LinkProvider; `href` goes through safeHref), checkboxes or radios.
 *   - The panel floats in a portal at `--pu-z-dropdown`, below the button, and
 *     flips above it when there is not room below.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { AppLink } from '../internal/link.tsx';
import type { LinkComponent } from '../internal/link.tsx';

interface MenuItemBase {
  /** Unique within the menu. */
  id: string;
  /** The item's words. Also what typing a letter matches. */
  label: string;
  /** A decorative icon before the label (aria-hidden). */
  icon?: ReactNode;
  /** Announced as dimmed, skipped by the arrow keys, cannot be chosen. */
  disabled?: boolean;
  /** danger: removes or deletes something. Always words, never colour alone; confirm before acting. */
  tone?: 'default' | 'danger';
  /** Becomes data-testid on the item. */
  testId?: string;
}

/** An action, or (with `href`) a link. */
export interface MenuActionItem extends MenuItemBase {
  /** An action or link (the default). */
  type?: 'item';
  /** Called when chosen. The menu closes and focus returns to the button. */
  onSelect?: () => void;
  /** Makes the item a link. A blocked scheme (safeHref) renders a disabled link. */
  href?: string;
  /** Force a plain <a> that opens a new tab (another site). */
  external?: boolean;
}

/** A toggle (role="menuitemcheckbox"). */
export interface MenuCheckboxItem extends MenuItemBase {
  /** A toggle. */
  type: 'checkbox';
  /** Whether it is on. */
  checked: boolean;
  /** Called with the next value. */
  onCheckedChange: (checked: boolean) => void;
}

/** One choice of several (role="menuitemradio"); you keep the choice and pass `checked`. */
export interface MenuRadioItem extends MenuItemBase {
  /** One choice of several. */
  type: 'radio';
  /** Whether it is the chosen one. */
  checked: boolean;
  /** Called when chosen. */
  onSelect: () => void;
}

/** A hairline between groups. */
export interface MenuSeparatorItem {
  /** A hairline between groups. */
  type: 'separator';
  /** Unique within the menu. */
  id: string;
}

export type MenuItem = MenuActionItem | MenuCheckboxItem | MenuRadioItem | MenuSeparatorItem;

export interface MenuButtonProps {
  /** The button's accessible name, and the menu's. With `iconOnly` it is the only name, so it is always required ("Actions for NABIL", "Account"). */
  label: string;
  /** The items in order. */
  items: readonly MenuItem[];
  /** An icon-only button (a row's "⋯"): `label` becomes aria-label, with a 44px touch target. */
  iconOnly?: boolean;
  /** The icon: the "⋯" by default for `iconOnly`, else a chevron after the label. */
  icon?: ReactNode;
  /** Which edge of the button the menu lines up with. Default 'start'. */
  align?: 'start' | 'end';
  /** Not openable. */
  disabled?: boolean;
  /** Called when it opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Link component for in-app `href` items; wins over LinkProvider. */
  linkComponent?: LinkComponent;
  /** Becomes data-testid on the button; the menu gets `<testId>-menu`. */
  testId?: string;
  /** Extra class names on the button. */
  className?: string;
}

const ITEMS = '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]';
const enabled = (menu: HTMLElement | null) => [...(menu?.querySelectorAll<HTMLElement>(ITEMS) ?? [])].filter((n) => n.getAttribute('aria-disabled') !== 'true');

const activate = (e: KeyboardEvent<HTMLElement>) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.currentTarget.click();
  }
};

function Dots() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="3" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="13" cy="8" r="1.4" />
    </svg>
  );
}
function Caret() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

/**
 * A button that opens a menu of actions (WAI-ARIA Menu Button).
 * @stability beta
 */
export function MenuButton({ label, items, iconOnly = false, icon, align = 'start', disabled, onOpenChange, linkComponent, testId, className }: MenuButtonProps) {
  const [open, setOpenState] = useState(false);
  const [start, setStart] = useState<'first' | 'last'>('first');
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: '', timer: 0 });
  const changed = useRef(onOpenChange);
  const id = useId();
  useEffect(() => {
    changed.current = onOpenChange;
  });
  const setOpen = (next: boolean, from: 'first' | 'last' = 'first') => {
    if (next) setStart(from);
    setOpenState((prev) => {
      if (prev !== next) queueMicrotask(() => changed.current?.(next));
      return next;
    });
  };
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus({ preventScroll: true });
  };

  useLayoutEffect(() => {
    if (!open) return;
    const el = menu.current, anchor = button.current;
    if (!el || !anchor) return;
    const place = () => {
      const view = window.visualViewport;
      const vw = view?.width ?? window.innerWidth, vh = view?.height ?? window.innerHeight;
      const ox = view?.offsetLeft ?? 0, oy = view?.offsetTop ?? 0;
      const rect = anchor.getBoundingClientRect();
      el.style.minWidth = `${Math.min(rect.width, vw - 16)}px`;
      const height = el.scrollHeight, width = el.offsetWidth;
      const below = Math.max(0, oy + vh - 8 - rect.bottom - 4), above = Math.max(0, rect.top - oy - 8 - 4);
      // Flip above only when it does not fit below and there is more room above.
      const down = height <= below || below >= above;
      const rtl = getComputedStyle(anchor).direction === 'rtl';
      const x = (align === 'start') !== rtl ? rect.left : rect.right - width;
      el.style.maxHeight = `${down ? below : above}px`;
      el.style.left = `${Math.max(ox + 8, Math.min(x, ox + vw - width - 8))}px`;
      el.style.top = `${down ? rect.bottom + 4 : rect.top - Math.min(height, above) - 4}px`;
      el.style.visibility = 'visible';
    };
    const theme = anchor.closest('[data-theme]')?.getAttribute('data-theme');
    if (theme) el.setAttribute('data-theme', theme);
    el.dir = getComputedStyle(anchor).direction;
    place();
    const list = enabled(el);
    (start === 'last' ? list.at(-1) : list[0])?.focus({ preventScroll: true });
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!el.contains(t) && !anchor.contains(t)) setOpenState(false);
    };
    const timer = typed.current;
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    document.addEventListener('pointerdown', away);
    return () => {
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', place, true);
      document.removeEventListener('pointerdown', away);
      window.clearTimeout(timer.timer);
    };
  }, [open, align, start]);

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true, e.key === 'ArrowUp' ? 'last' : 'first');
    }
  };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = enabled(menu.current);
    const at = list.indexOf(document.activeElement as HTMLElement);
    const go = (n: HTMLElement | undefined) => {
      e.preventDefault();
      n?.focus();
    };
    if (e.key === 'ArrowDown') go(list[(at + 1) % list.length]);
    else if (e.key === 'ArrowUp') go(list[(at <= 0 ? list.length : at) - 1]);
    else if (e.key === 'Home') go(list[0]);
    else if (e.key === 'End') go(list.at(-1));
    else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === 'Tab') {
      // Close and let Tab carry on from the button, so focus moves to the next control on the page.
      close(true);
    } else if (e.key === ' ' && (document.activeElement as HTMLElement | null)?.tagName === 'A') {
      go(undefined);
      (document.activeElement as HTMLElement).click();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') {
      const t = typed.current;
      window.clearTimeout(t.timer);
      t.text += e.key.toLowerCase();
      t.timer = window.setTimeout(() => (t.text = ''), 500);
      const repeat = [...t.text].every((c) => c === t.text[0]);
      // "ss" cycles through the items starting with s; "sh" narrows to those starting with sh.
      const prefix = repeat ? t.text[0]! : t.text;
      const order = [...list.slice(at + 1), ...list.slice(0, at + 1)];
      const found = order.find((n) => n.textContent?.trim().toLowerCase().startsWith(prefix));
      if (found) go(found);
    }
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        id={`${id}-button`}
        className={`pu-menu-button${iconOnly ? ' pu-menu-icon' : ''}${className ? ` ${className}` : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-label={label}
        disabled={disabled}
        onClick={() => (open ? close(true) : setOpen(true))}
        onKeyDown={onButtonKey}
        data-testid={testId}
      >
        {iconOnly ? (
          icon ?? <Dots />
        ) : (
          <>
            <span>{label}</span>
            <span className="pu-menu-caret" aria-hidden="true">{icon ?? <Caret />}</span>
          </>
        )}
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menu}
              id={`${id}-menu`}
              className="pu-menu"
              role="menu"
              tabIndex={-1}
              aria-labelledby={`${id}-button`}
              style={{ visibility: 'hidden' }}
              onKeyDown={onMenuKey}
              onBlur={(e) => {
                const next = e.relatedTarget as Node | null;
                if (next && !menu.current?.contains(next) && !button.current?.contains(next)) setOpen(false);
              }}
              data-testid={testId ? `${testId}-menu` : undefined}
            >
              {items.map((item) => {
                // oxlint-disable-next-line jsx-a11y/control-has-associated-label
                if (item.type === 'separator') return <div key={item.id} className="pu-menu-sep" role="separator" />;
                const common = {
                  className: `pu-menu-item${item.tone === 'danger' ? ' pu-menu-danger' : ''}`,
                  tabIndex: -1,
                  'aria-disabled': item.disabled || undefined,
                  'data-testid': item.testId,
                  onPointerMove: (e: { currentTarget: HTMLElement }) => {
                    if (!item.disabled && document.activeElement !== e.currentTarget) e.currentTarget.focus({ preventScroll: true });
                  },
                };
                const body = (
                  <>
                    {item.type === 'checkbox' || item.type === 'radio' ? (
                      <span className="pu-menu-check" aria-hidden="true">{item.checked ? (item.type === 'radio' ? '•' : '✓') : ''}</span>
                    ) : null}
                    {item.icon ? <span className="pu-menu-icon-slot" aria-hidden="true">{item.icon}</span> : null}
                    <span className="pu-menu-label">{item.label}</span>
                  </>
                );
                if (item.type === 'checkbox' || item.type === 'radio') {
                  return (
                    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
                    <div
                      key={item.id}
                      {...common}
                      tabIndex={-1}
                      role={item.type === 'checkbox' ? 'menuitemcheckbox' : 'menuitemradio'}
                      aria-checked={item.checked}
                      onKeyDown={activate}
                      onClick={() => {
                        if (item.disabled) return;
                        if (item.type === 'checkbox') item.onCheckedChange(!item.checked);
                        else item.onSelect();
                        close(true);
                      }}
                    >
                      {body}
                    </div>
                  );
                }
                if (item.href && !item.disabled) {
                  return (
                    <AppLink
                      key={item.id}
                      {...common}
                      tabIndex={-1}
                      href={item.href}
                      external={item.external}
                      target={item.external ? '_blank' : undefined}
                      linkComponent={linkComponent}
                      role="menuitem"
                      onClick={() => {
                        item.onSelect?.();
                        // Let the link navigate before it unmounts.
                        window.setTimeout(() => setOpen(false), 0);
                      }}
                    >
                      {body}
                    </AppLink>
                  );
                }
                return (
                  // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
                  <div
                    key={item.id}
                    {...common}
                    tabIndex={-1}
                    role="menuitem"
                    onKeyDown={activate}
                    onClick={() => {
                      if (item.disabled) return;
                      item.onSelect?.();
                      close(true);
                    }}
                  >
                    {body}
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
