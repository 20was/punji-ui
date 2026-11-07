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
 *   - `MenuList` is the role="menu" list on its own (inside your Popover or Sheet),
 *     with `MenuHead`, `MenuItemRow` and `MenuSeparator` as children.
 */
import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type MutableRefObject, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

import { AppLink } from '../internal/link.tsx';
import type { LinkComponent } from '../internal/link.tsx';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';

interface MenuItemBase {
  /** Unique within the menu. */
  id: string;
  /** The item's words. Also what typing a letter matches. */
  label: string;
  /** A decorative icon before the label (aria-hidden). */
  icon?: ReactNode;
  /** Announced as dimmed, skipped by the arrow keys, cannot be chosen. */
  disabled?: boolean;
  /** danger: removes or deletes something. Always words, never colour alone; confirm before acting. neutral (default): any other item. */
  tone?: 'neutral' | 'danger';
  /** Quiet words at the end of the row ("Today, Markets, Tools"). Part of the item's name. */
  hint?: string;
  /** Working: the item stays, cannot be chosen, and says so (aria-disabled, aria-busy). It stays reachable by the arrow keys. */
  busy?: boolean;
  /** The label's language when it is not the page's (a language switch). */
  lang?: string;
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
  /** Force a plain <a> that opens a new tab (another site). Draws a trailing arrow. */
  external?: boolean;
  /** With `href`: a chevron at the end, for an item that goes to another page in the app. */
  next?: boolean;
  /** With `external`: words read after the label ("opens in a new tab"). Left out, the name is the label alone. */
  newTabLabel?: string;
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

/** Who or what the menu is about (a name and a line), not an item: it is not focusable and not counted. */
export interface MenuHeadItem {
  /** Who or what the menu is about. */
  type: 'head';
  /** Unique within the menu. */
  id: string;
  /** The name ("Bishwas Adhikari"). */
  title: string;
  /** A second line ("bishwas@example.com"). */
  sub?: string | null;
  /** A short mark before it (initials). */
  lead?: string;
}

export type MenuItem = MenuActionItem | MenuCheckboxItem | MenuRadioItem | MenuSeparatorItem | MenuHeadItem;

export interface MenuButtonProps {
  /** The button's accessible name, and the menu's. With `iconOnly` it is the only name, so it is always required ("Actions for NABIL", "Account"). */
  label: string;
  /** The items in order. Or pass `children` (MenuItemRow, MenuHead, MenuSeparator) for the web kit's composition style. */
  items?: readonly MenuItem[];
  /** Composed items, as `MenuList` takes them. A function receives `close` (shut the menu). */
  children?: ReactNode | ((close: () => void) => ReactNode);
  /** An icon-only button (a row's "⋯"): `label` becomes aria-label, with a 44px touch target. */
  iconOnly?: boolean;
  /** The icon: the "⋯" by default for `iconOnly`, else a chevron after the label. */
  icon?: ReactNode;
  /** Which edge of the button the menu lines up with. Default 'start'. */
  align?: 'start' | 'end';
  /** Not openable. */
  disabled?: boolean;
  /** Controlled open state. Leave it out and the menu keeps its own. */
  open?: boolean;
  /** Starting state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called with the next state when it opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Link component for in-app `href` items; wins over LinkProvider. */
  linkComponent?: LinkComponent;
  /** Becomes data-testid on the button; the menu gets `<testId>-menu`. */
  testId?: string;
  /** Extra class names on the button. */
  className?: string;
}

const ITEMS = '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]';
// Busy items stay reachable (they say they are working); disabled ones are skipped.
const enabled = (menu: HTMLElement | null) => [...(menu?.querySelectorAll<HTMLElement>(ITEMS) ?? [])].filter((n) => n.getAttribute('aria-disabled') !== 'true' || n.hasAttribute('aria-busy'));

const activate = (e: KeyboardEvent<HTMLElement>) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.currentTarget.click();
  }
};

interface Typed {
  text: string;
  timer: number;
}

/** The menu keyboard (WAI-ARIA Menu): arrows wrap, Home and End, typeahead. Tab and Escape are the caller's. */
function menuKeys(menu: RefObject<HTMLElement | null>, typed: MutableRefObject<Typed>, hooks: { tab?: (() => void) | undefined; escape?: (() => void) | undefined }) {
  return (e: KeyboardEvent<HTMLElement>) => {
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
    else if (e.key === 'Escape' && hooks.escape) {
      e.preventDefault();
      e.stopPropagation();
      hooks.escape();
    } else if (e.key === 'Tab') {
      hooks.tab?.();
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
      const found = order.find((n) => (n.querySelector('.pu-menu-label')?.textContent ?? n.textContent)?.trim().toLowerCase().startsWith(prefix));
      if (found) go(found);
    }
  };
}

/** What an item calls to shut the menu it sits in. */
const MenuContext = createContext<{ close: (refocus?: boolean) => void }>({ close: () => {} });

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
function End({ d }: { d: string }) {
  return (
    <svg className="pu-menu-end" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const NEXT = 'M9 6l6 6-6 6';
const OUT = 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5';

/** Who or what the menu is about (a name and a line), not an item. */
export interface MenuHeadProps {
  /** The name ("Bishwas Adhikari"). */
  title: string;
  /** A second line ("bishwas@example.com"). */
  sub?: string | null;
  /** A short mark before it (initials). */
  lead?: string;
}

/**
 * The head of a menu: who or what it is about. Not an item (not focusable, skipped by the arrow keys).
 * @stability beta
 */
export function MenuHead({ title, sub, lead }: MenuHeadProps) {
  return (
    <div className="pu-menu-head" role="presentation">
      {lead ? <span className="pu-menu-lead" aria-hidden="true">{lead}</span> : null}
      <span className="pu-menu-who">
        <b>{title}</b>
        {sub ? <span>{sub}</span> : null}
      </span>
    </div>
  );
}

/**
 * A hairline between groups, for composed menus.
 * @stability beta
 */
export function MenuSeparator() {
  // oxlint-disable-next-line jsx-a11y/control-has-associated-label
  return <div className="pu-menu-sep" role="separator" />;
}

interface RowBody {
  icon?: ReactNode;
  hint?: string | undefined;
  end?: string | null;
  sr?: string | undefined;
  children: ReactNode;
}
function RowContent({ icon, children, hint, end, sr }: RowBody) {
  return (
    <>
      {icon ? <span className="pu-menu-icon-slot" aria-hidden="true">{icon}</span> : null}
      <span className="pu-menu-label">{children}</span>
      {hint ? <span className="pu-menu-hint">{hint}</span> : null}
      {sr ? <span className="kit-sr">, {sr}</span> : null}
      {end ? <End d={end} /> : null}
    </>
  );
}

export interface MenuItemRowProps {
  /** A 16px glyph before the words (decorative). */
  icon?: ReactNode;
  /** The words. */
  children: ReactNode;
  /** Quiet words at the end ("Today, Markets, Tools"). */
  hint?: string;
  /** A page in this app: a link through the link adapter (your router link from LinkProvider). */
  to?: string;
  /** Another site: a plain <a> that opens in a new tab, with an arrow after the words. */
  href?: string;
  /** With `href`: the words read after the item's own ("opens in a new tab"). */
  newTab?: string;
  /** With `to`: a chevron at the end (it goes to another page in this app). */
  next?: boolean;
  /** danger: it removes or deletes something (always words, and it asks before it acts). */
  tone?: 'danger';
  /** Chosen (a click, Enter or Space). A link item calls it too. The menu closes after it. */
  onSelect?: () => void;
  /** Working: the item stays, cannot be chosen, and says so (aria-disabled, aria-busy). */
  busy?: boolean;
  /** A full name when the words alone say less. */
  label?: string;
  /** The words' language when it is not the page's. */
  lang?: string;
  /** Link component for `to`; wins over LinkProvider. */
  linkComponent?: LinkComponent;
  /** Becomes data-testid on the item. */
  testId?: string;
}

/**
 * One row of a composed menu (the web kit's MenuItem): an action, a router link (`to`) or another site (`href`).
 * Closes the menu it sits in when chosen.
 * @stability beta
 */
export function MenuItemRow({ icon, children, hint, to, href, newTab, next = false, tone, onSelect, busy = false, label, lang, linkComponent, testId }: MenuItemRowProps) {
  const { close } = useContext(MenuContext);
  const cls = `pu-menu-item${tone === 'danger' ? ' pu-menu-danger' : ''}${busy ? ' pu-menu-busy' : ''}`;
  const common = { role: 'menuitem', tabIndex: -1, className: cls, 'aria-label': label, lang, 'data-testid': testId } as const;
  const body = (
    <RowContent icon={icon} hint={hint} end={href ? OUT : to && next ? NEXT : null} sr={href ? newTab : undefined}>
      {children}
    </RowContent>
  );
  const nav = () => {
    onSelect?.();
    window.setTimeout(() => close(false), 0);
  };
  if (to) return <AppLink {...common} href={to} linkComponent={linkComponent} onClick={nav}>{body}</AppLink>;
  if (href) return <AppLink {...common} href={href} external target="_blank" onClick={nav}>{body}</AppLink>;
  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      {...common}
      tabIndex={-1}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      onKeyDown={activate}
      onClick={() => {
        if (busy) return;
        onSelect?.();
        close(true);
      }}
    >
      {body}
    </div>
  );
}

function Items({ items, linkComponent }: { items: readonly MenuItem[]; linkComponent?: LinkComponent | undefined }) {
  const { close } = useContext(MenuContext);
  return (
    <>
      {items.map((item) => {
        // oxlint-disable-next-line jsx-a11y/control-has-associated-label
        if (item.type === 'separator') return <div key={item.id} className="pu-menu-sep" role="separator" />;
        if (item.type === 'head') return <MenuHead key={item.id} title={item.title} sub={item.sub} lead={item.lead} />;
        const common = {
          className: `pu-menu-item${item.tone === 'danger' ? ' pu-menu-danger' : ''}${item.busy ? ' pu-menu-busy' : ''}`,
          tabIndex: -1,
          lang: item.lang,
          'aria-disabled': item.disabled || item.busy || undefined,
          'aria-busy': item.busy || undefined,
          'data-testid': item.testId,
          onPointerMove: (e: { currentTarget: HTMLElement }) => {
            if (!item.disabled && document.activeElement !== e.currentTarget) e.currentTarget.focus({ preventScroll: true });
          },
        };
        const off = item.disabled || item.busy;
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
                if (off) return;
                if (item.type === 'checkbox') item.onCheckedChange(!item.checked);
                else item.onSelect();
                close(true);
              }}
            >
              <span className="pu-menu-check" aria-hidden="true">{item.checked ? (item.type === 'radio' ? '•' : '✓') : ''}</span>
              <RowContent icon={item.icon} hint={item.hint}>{item.label}</RowContent>
            </div>
          );
        }
        const end = item.href ? (item.external ? OUT : item.next ? NEXT : null) : null;
        const body = (
          <RowContent icon={item.icon} hint={item.hint} end={end} sr={item.href && item.external ? item.newTabLabel : undefined}>
            {item.label}
          </RowContent>
        );
        if (item.href && !off) {
          return (
            <AppLink
              key={item.id}
              {...common}
              href={item.href}
              external={item.external}
              target={item.external ? '_blank' : undefined}
              linkComponent={linkComponent}
              role="menuitem"
              onClick={() => {
                item.onSelect?.();
                // Let the link navigate before it unmounts.
                window.setTimeout(() => close(false), 0);
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
              if (off) return;
              item.onSelect?.();
              close(true);
            }}
          >
            {body}
          </div>
        );
      })}
    </>
  );
}

export interface MenuListProps {
  /** The menu's name ("Account menu"). */
  label: string;
  /** The items in order. Or pass `children` (MenuItemRow, MenuHead, MenuSeparator). */
  items?: readonly MenuItem[];
  /** Composed items. */
  children?: ReactNode;
  /** Tab left the menu: close the surface that holds it without moving focus. */
  onLeave?: () => void;
  /** An item was chosen: close the surface that holds the list. Called after the item's own `onSelect`. */
  onClose?: (refocus?: boolean) => void;
  /** Esc pressed in the list. Leave it out when the surface that holds it (Popover, Sheet) handles Esc. */
  onEscape?: () => void;
  /** Focus the first item on mount (default true). */
  autoFocus?: boolean;
  /** Link component for in-app `href` items; wins over LinkProvider. */
  linkComponent?: LinkComponent;
  /** Becomes data-testid on the list. */
  testId?: string;
}

/**
 * The items of a menu on their own (role="menu", no button): put it inside your Popover or Sheet. Arrow keys
 * move and wrap, Home and End jump, typing a letter jumps to the next item that starts with it, Tab leaves
 * (`onLeave`). Focus starts on the first item.
 * @stability beta
 */
export function MenuList({ label, items, children, onLeave, onClose, onEscape, autoFocus = true, linkComponent, testId }: MenuListProps) {
  const box = useRef<HTMLDivElement>(null);
  const typed = useRef<Typed>({ text: '', timer: 0 });
  useEffect(() => {
    const t = typed.current;
    if (autoFocus) enabled(box.current)[0]?.focus({ preventScroll: true });
    return () => window.clearTimeout(t.timer);
  }, [autoFocus]);
  return (
    <MenuContext.Provider value={{ close: (refocus) => onClose?.(refocus) }}>
      <div
        ref={box}
        className="pu-menu pu-menu-static"
        role="menu"
        tabIndex={-1}
        aria-label={label}
        onKeyDown={(e) => menuKeys(box, typed, { tab: onLeave, escape: onEscape })(e)}
        data-testid={testId}
      >
        {items ? <Items items={items} linkComponent={linkComponent} /> : null}
        {children}
      </div>
    </MenuContext.Provider>
  );
}

/**
 * A button that opens a menu of actions (WAI-ARIA Menu Button).
 * @stability beta
 */
export function MenuButton({ label, items, children, iconOnly = false, icon, align = 'start', disabled, open: openProp, defaultOpen = false, onOpenChange, linkComponent, testId, className }: MenuButtonProps) {
  const [open, setOpen] = useControllableState<boolean>({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange, name: 'MenuButton open' });
  const [start, setStart] = useState<'first' | 'last'>('first');
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const typed = useRef<Typed>({ text: '', timer: 0 });
  const id = useId();
  const show = (from: 'first' | 'last' = 'first') => {
    setStart(from);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) document.getElementById(`${id}-button`)?.focus({ preventScroll: true });
  };
  const body = typeof children === 'function' ? children(() => close(true)) : children;

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
      if (!el.contains(t) && !anchor.contains(t)) setOpen(false);
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
  }, [open, align, start, setOpen]);

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      show(e.key === 'ArrowUp' ? 'last' : 'first');
    }
  };

  const onMenuKey = (e: KeyboardEvent<HTMLElement>) =>
    menuKeys(menu, typed, {
      escape: () => close(true),
      // Close and let Tab carry on from the button, so focus moves to the next control on the page.
      tab: () => close(true),
    })(e);

  return (
    <MenuContext.Provider value={{ close }}>
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
        onClick={() => (open ? close(true) : show())}
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
              {items ? <Items items={items} linkComponent={linkComponent} /> : null}
              {body}
            </div>,
            document.body,
          )
        : null}
    </MenuContext.Provider>
  );
}
