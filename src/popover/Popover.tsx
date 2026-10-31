'use client';

/**
 * Popover (design.punji.app/components/popover): a panel anchored under the
 * control that opened it (a menu, an inbox, a small editor).
 *
 *   - Esc closes it and puts focus back on the control; a click or a tap
 *     outside closes it where the reader clicked; focus leaving both closes it.
 *   - Never two at once: opening one closes the one that was open.
 *   - Focus moves in when it opens (the first control, or `initialFocus`).
 *   - `fullScreenPhone`: under 768px it fills the screen and the phone tab
 *     bar steps aside (one bottom bar at most); the content brings its own
 *     back button.
 *
 * The anchor and the panel sit in one PopoverAnchor, which the panel is
 * placed against (end-aligned by default).
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

import { createPortal } from 'react-dom';

/** The one open popover's close, so a second one closes it first. */
let openNow: (() => void) | null = null;

const isShown = (node: HTMLElement) => node.getClientRects().length > 0;
const isTabbable = (node: HTMLElement) => isShown(node) && node.tabIndex >= 0;

// Let a nested browser picker handle Escape/Tab before its parent popover.
const nativePickerOpen = (target:EventTarget|null):boolean => {
  try {return target instanceof Element && !!target.closest('select')?.matches(':open');}
  catch {return false;} // Older engines do not recognise :open.
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [role="menuitem"]';

export function PopoverAnchor({ children }: { children: ReactNode }) {
  return <span className="kit-pop-at">{children}</span>;
}

export type PopoverCloseReason = 'escape' | 'outside' | 'blur';

export function Popover({ open, onClose, anchor, label, role = 'dialog', id, align = 'end', wide = false, fullScreenPhone = false, initialFocus, children, testId, portal = false, width = 320, positionAnchor }: {
  open: boolean;
  /** Float in a portal, avoiding ancestor clipping. An element supports nested native dialogs. */
  portal?: boolean | HTMLElement;
  /** Portal panel width, clamped to the viewport. */
  width?: number;
  /** Optional field wrapper to position against while focus returns to anchor. */
  positionAnchor?: RefObject<HTMLElement | null>;
  /** Asked to close, and why ('escape' puts focus back on the anchor first). */
  onClose: (reason: PopoverCloseReason) => void;
  /** The control that opens it (focus returns here on Esc). */
  anchor: RefObject<HTMLElement | null>;
  /** The panel's name (a dialog's aria-label). */
  label: string;
  /** dialog (default): a panel with its own controls. none: the content names itself (a MenuList). */
  role?: 'dialog' | 'none';
  /** For the anchor's aria-controls. */
  id?: string;
  /** Which edge it lines up with: the anchor's end (default) or start. */
  align?: 'start' | 'end';
  /** 420px wide (an inbox) instead of fitting its content. */
  wide?: boolean;
  fullScreenPhone?: boolean;
  /** A selector inside the panel to focus first. */
  initialFocus?: string;
  children: ReactNode;
  testId?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const [floating, setFloating] = useState<{left:number;top:number;width:number;maxHeight:number;theme?:string}>();
  useEffect(() => {
    close.current = onClose;
  });

  useLayoutEffect(() => {
    if (!open) return;
    const shut = () => close.current('outside');
    if (openNow && openNow !== shut) openNow();
    openNow = shut;
    const el = panel.current;
    // The first control that is drawn (a phone-only back button is in the markup but not on a wide screen).
    const reposition = () => {
      if (!portal || !el || !anchor.current) return;
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
      const viewWidth = viewport?.width ?? window.innerWidth, viewHeight = viewport?.height ?? window.innerHeight;
      const size = Math.min(width, viewWidth - 24);
      el.style.width = `${size}px`;
      const rect = (positionAnchor?.current ?? anchor.current).getBoundingClientRect();
      if (rect.bottom < top || rect.top > top + viewHeight) {close.current('outside');return;}
      const height = Math.max(el.scrollHeight + el.offsetHeight - el.clientHeight, el.getBoundingClientRect().height);
      const spaceBelow = Math.max(0, top + viewHeight - 12 - rect.bottom - 6);
      const spaceAbove = Math.max(0, rect.top - top - 12 - 6);
      const below = height <= spaceBelow || (height > spaceAbove && spaceBelow >= spaceAbove);
      const maxHeight = Math.min(viewHeight - 24, below ? spaceBelow : spaceAbove);
      const x = align === 'start' ? rect.left : rect.right - size;
      const y = below ? rect.bottom + 6 : rect.top - Math.min(height, maxHeight) - 6;
      const panelLeft = Math.max(left+12,Math.min(x,left+viewWidth-size-12));
      el.style.maxHeight = `${maxHeight}px`;
      setFloating({left:panelLeft,top:y,width:size,maxHeight,theme:anchor.current.closest('[data-theme]')?.getAttribute('data-theme')??undefined});
    };
    reposition();
    if (portal && el) el.style.visibility = 'visible';
    const resize = portal && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(reposition) : null;
    if (el) resize?.observe(el);
    if (portal) {
      window.addEventListener('resize', reposition);
      document.addEventListener('scroll', reposition, true);
      window.visualViewport?.addEventListener('resize', reposition);
      window.visualViewport?.addEventListener('scroll', reposition);
    }
    const first = (initialFocus && el?.querySelector<HTMLElement>(initialFocus)) || [...(el?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].find(isShown);
    (first ?? el)?.focus({ preventScroll: true });
    if (portal && el && first) {
      const target = first.getBoundingClientRect(), frame = el.getBoundingClientRect();
      if (target.bottom > frame.bottom - 8) el.scrollTop += target.bottom - frame.bottom + 8;
      else if (target.top < frame.top + 8) el.scrollTop -= frame.top - target.top + 8;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || nativePickerOpen(e.target)) return;
      // A dialog above it (the command palette) handles its own Esc first.
      if (!portal && document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      anchor.current?.focus({ preventScroll: true });
      close.current('escape');
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || anchor.current?.contains(t)) return;
      close.current('outside');
    };
    const onPanelKey = (e: KeyboardEvent) => {
        if (!portal || e.defaultPrevented || nativePickerOpen(e.target)) return;
        if (e.key === 'Escape') {
          e.preventDefault(); e.stopPropagation(); anchor.current?.focus({preventScroll:true}); close.current('escape'); return;
        }
        if (e.key !== 'Tab') return;
        if (!el) return;
        const controls = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isTabbable);
        if (e.shiftKey && document.activeElement === controls[0]) {
          e.preventDefault(); anchor.current?.focus(); close.current('blur');
        } else if (!e.shiftKey && document.activeElement === controls.at(-1)) {
          const outside = [...document.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(n=>!el.contains(n)&&isTabbable(n));
          const next = outside[outside.indexOf(anchor.current!) + 1];
          e.preventDefault(); (next ?? anchor.current)?.focus(); close.current('blur');
        }
    };
    el?.addEventListener('keydown', onPanelKey);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      el?.removeEventListener('keydown', onPanelKey);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      resize?.disconnect();
      window.removeEventListener('resize', reposition);
      document.removeEventListener('scroll', reposition, true);
      window.visualViewport?.removeEventListener('resize', reposition);
      window.visualViewport?.removeEventListener('scroll', reposition);
      if (openNow === shut) openNow = null;
    };
  }, [open, anchor, initialFocus, portal, width, align, positionAnchor]);

  if (!open) return null;
  const content = (
    <div
      ref={panel}
      id={id}
      className={`kit-pop${align === 'start' ? ' start' : ''}${wide ? ' wide' : ''}${fullScreenPhone ? ' fs' : ''}`}
      style={portal ? {position:'fixed',right:'auto',bottom:'auto',left:floating?.left,top:floating?.top,width:floating?.width,visibility:floating?'visible':'hidden',maxHeight:floating?.maxHeight??'calc(100dvh - 24px)',overflowY:'auto',animation:'none'} : undefined}
      data-theme={portal ? floating?.theme : undefined}
      role={role === 'dialog' ? 'dialog' : undefined}
      aria-label={role === 'dialog' ? label : undefined}
      tabIndex={-1}
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        // Focus left for somewhere else on the page (Tab past the end): close. Into nothing (a click on blank ground): stay.
        if (next && !panel.current?.contains(next) && !anchor.current?.contains(next)) close.current('blur');
      }}
      data-testid={testId}
    >
      {children}
    </div>
  );
  return portal && typeof document !== 'undefined' ? createPortal(content, typeof portal === 'boolean' ? document.body : portal) : content;
}
