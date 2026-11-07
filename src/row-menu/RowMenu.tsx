'use client';

/**
 * RowMenu and SheetMenuButton (design.punji.app/components/row-menu): the menu
 * button of `@punji/ui/menu` that, under 768px, opens as the library's bottom
 * Sheet (44px rows over the page) instead of a popover. Its own module so a
 * page that never needs the phone sheet does not carry the Sheet.
 *
 *   - Wide: exactly MenuButton (popover, APG menu keyboard).
 *   - Phone: the button has aria-haspopup="dialog"; the Sheet is modal (inert
 *     page, scroll lock, then focus scope), holds a role="menu" list, and Esc,
 *     the scrim or choosing an item closes it with focus back on the button.
 */
import { useId, useRef, type ReactNode } from 'react';

import { MenuButton, MenuList } from '../menu/Menu.tsx';
import type { MenuButtonProps } from '../menu/Menu.tsx';
import { Sheet } from '../overlay/Overlay.tsx';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';
import { useMediaQuery } from '../use-media-query/useMediaQuery.ts';

export interface SheetMenuButtonProps extends Omit<MenuButtonProps, 'children'> {
  /** Composed items (MenuItemRow, MenuHead, MenuSeparator). A function receives `close`. */
  children?: ReactNode | ((close: () => void) => ReactNode);
  /** The phone sheet's heading (the row's code, "NABIL"). Defaults to `label`. */
  sheetTitle?: ReactNode;
  /** The phone sheet's close button name (default "Close"). */
  closeLabel?: string;
}

function Dots() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="3" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="13" cy="8" r="1.4" />
    </svg>
  );
}

/**
 * A MenuButton that is a bottom Sheet under 768px.
 * @stability beta
 */
export function SheetMenuButton({ sheetTitle, closeLabel, children, open: openProp, defaultOpen = false, onOpenChange, ...rest }: SheetMenuButtonProps) {
  const [open, setOpen] = useControllableState<boolean>({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange, name: 'SheetMenuButton open' });
  const narrow = useMediaQuery('(max-width: 767px)');
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const { label, items, iconOnly = false, icon, disabled, linkComponent, testId, className } = rest;
  if (!narrow) {
    return (
      <MenuButton {...rest} open={open} onOpenChange={setOpen}>
        {children}
      </MenuButton>
    );
  }
  const close = () => {
    setOpen(false);
    document.getElementById(`${id}-button`)?.focus({ preventScroll: true });
  };
  const body = typeof children === 'function' ? children(close) : children;
  return (
    <>
      <button
        ref={button}
        type="button"
        id={`${id}-button`}
        className={`pu-menu-button${iconOnly ? ' pu-menu-icon' : ''}${className ? ` ${className}` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        data-testid={testId}
      >
        {iconOnly ? (
          icon ?? <Dots />
        ) : (
          <span>{label}</span>
        )}
      </button>
      <Sheet open={open} title={sheetTitle ?? label} onClose={close} closeLabel={closeLabel} testId={testId ? `${testId}-sheet` : undefined}>
        <MenuList label={label} items={items} onClose={close} linkComponent={linkComponent} testId={testId ? `${testId}-menu` : undefined}>
          {body}
        </MenuList>
      </Sheet>
    </>
  );
}

export interface RowMenuProps {
  /** The button's and the menu's name, with the row's own ("More for NABIL"). */
  label: string;
  /** The phone sheet's heading (the row's code, "NABIL"). */
  title: ReactNode;
  /** The sheet's close button name (Esc and a tap on the scrim close it too). */
  closeLabel?: string;
  /** The items (MenuItemRow, MenuSeparator); `close` shuts the menu. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Becomes data-testid on the button; the menu gets `<testId>-menu`, the phone sheet `<testId>-sheet`. */
  testId?: string;
  /** Control the menu when a nested action needs to return to it. */
  open?: boolean;
  /** Starting state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called with the next state. */
  onOpenChange?: (open: boolean) => void;
  /** Link component for in-app `to` items. */
  linkComponent?: MenuButtonProps['linkComponent'];
}

/**
 * A row's "..." menu (the web kit's RowMenu): a popover under the button, the bottom Sheet under 768px.
 * @stability beta
 */
export function RowMenu({ label, title, closeLabel, children, testId, open, defaultOpen, onOpenChange, linkComponent }: RowMenuProps) {
  return (
    <SheetMenuButton label={label} iconOnly sheetTitle={title} closeLabel={closeLabel} testId={testId} open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} linkComponent={linkComponent}>
      {children}
    </SheetMenuButton>
  );
}
