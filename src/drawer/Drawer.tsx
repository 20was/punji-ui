'use client';

/**
 * Drawer: the one place a page's actions open on a wide screen (add, sell,
 * edit, remove, review). A 432px panel slides in from the right over the page,
 * wherever the reader has scrolled, so a form never opens out of sight of the
 * button that asked for it. Modal: the page behind is inert to the pointer
 * (the scrim closes it) and Tab stays inside; Esc closes it unless the form
 * inside used the key first (a form steps back before the drawer closes);
 * focus returns to the button that opened it. Narrow screens push a full page
 * instead.
 *
 * A screen inside it is a DrawerScreen (@punji/ui/drawer-screen), with its
 * header and its footer docked at the drawer's foot.
 */
import { useRef, type ReactNode } from 'react';

import { useFocusScope } from '../internal/focusScope.ts';
import { useInertOthers } from '../internal/inert.ts';
import { Portal } from '../internal/Portal.tsx';
import { useScrollLock } from '../internal/scrollLock.ts';

export interface DrawerProps {
  /** Whether the drawer is shown. You own this state. Nothing renders while it is false or during server rendering. */
  open: boolean;
  /** The dialog's accessible name ("Add transaction"). */
  label: string;
  /** Asked to close: Esc (unless the form inside used the key first) and a click on the scrim. */
  onClose: () => void;
  /** The drawer's content: usually a DrawerScreen, or a heading, a form and its buttons. */
  children: ReactNode;
  /** Becomes data-testid on the panel; the scrim is `${testId}-scrim`. */
  testId?: string;
}

/**
 * @stability beta
 */
export function Drawer(props: DrawerProps) {
  return props.open ? (
    <Portal>
      <DrawerLayer {...props} />
    </Portal>
  ) : null;
}

function DrawerLayer({ label, onClose, children, testId }: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null);
  // The form's own first field takes focus (autoFocus); else the panel itself, so Tab starts inside.
  // Inert first: effect cleanups run in this order, so the page is live again before focus goes back into it.
  useInertOthers(ref, true);
  useScrollLock(true);
  useFocusScope(ref, { initialFocus: 'container', onEscape: onClose });
  return (
    <div className="kit-drawer-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()} data-testid={testId ? `${testId}-scrim` : undefined}>
      <div ref={ref} className="kit-drawer" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} data-testid={testId}>
        {children}
      </div>
    </div>
  );
}
