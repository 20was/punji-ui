'use client';

import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';


/**
 * The hint's bubble: over the ⓘ, centred, kept inside the window, under it near the top edge, so a
 * hint on a label never covers the figure below the label. Its own file, not FloatingTooltip's: the
 * public pages' charts load that one and need none of this.
 */
function Bubble({ anchor, id, testId, children, compact, hidden, onPointerEnter, onPointerLeave }: { anchor: DOMRect; id: string; testId?: string; children: ReactNode; compact?: boolean; hidden?: boolean; onPointerEnter?: () => void; onPointerLeave?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const gap = 8;
    const left = Math.max(8, Math.min(anchor.left + anchor.width / 2 - width / 2, window.innerWidth - width - 8));
    const over = anchor.top - gap - height;
    setAt({ left, top: over >= 8 ? over : Math.min(anchor.bottom + gap, window.innerHeight - height - 8) });
  }, [anchor]);
  return createPortal(
    <div ref={ref} id={id} role={hidden ? undefined : 'tooltip'} aria-hidden={hidden || undefined} className={`kit-floating-tip ${compact ? 'kit-icon-tip' : 'kit-info-tip'}`} style={at ? { left: at.left, top: at.top } : { left: 0, top: 0, visibility: 'hidden' }} data-testid={testId} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      {children}
    </div>,
    document.body,
  );
}

/** WCAG 1.4.13: how long the bubble waits after the pointer leaves, so the pointer can cross onto it (hoverable). */
const GRACE_MS = 150;

/** True while any part of the trigger is still in the window: a scroll then moves the bubble's anchor instead of closing it. */
function inView(r: DOMRect): boolean {
  return r.bottom >= 0 && r.right >= 0 && r.top < window.innerHeight && r.left < window.innerWidth;
}

/**
 * What a label means, on a visible ⓘ beside it (never a native title, which waits a second, never
 * shows on a phone and gives no sign it is there). Hover or keyboard focus shows it at once; a click
 * or tap keeps it open until Esc, a second tap, a tap elsewhere or the button leaving the window. The pointer can move
 * onto the bubble without it closing (WCAG 1.4.13), and Esc closes it wherever focus is. The button names what it
 * explains (`label`); the text is its description while shown. Clicks stay inside, so a hint in a
 * clickable row never opens the row.
 */
export interface InfoTipProps {
  /** What the button explains ("About weighted average cost"): its accessible name. */
  label: string;
  /** The explanation: one or two sentences. It is the button's description while shown. */
  children: ReactNode;
  /** Becomes data-testid on the button; the bubble is `${testId}-tip`. */
  testId?: string;
  /** A short text trigger instead of the default info icon. */
  trigger?: ReactNode;
}

export function InfoTip({ label, children, testId, trigger }: InfoTipProps) {
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState<null | 'peek' | 'pinned'>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const grace = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (grace.current) clearTimeout(grace.current);
    grace.current = null;
  };
  const later = () => {
    cancel();
    grace.current = setTimeout(() => setOpen((o) => (o === 'peek' ? null : o)), GRACE_MS);
  };
  useEffect(() => cancel, []);
  const show = (how: 'peek' | 'pinned') => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    cancel();
    setAnchor(r);
    setOpen(how);
  };
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !(t instanceof Element && t.closest(`[id="${CSS.escape(id)}"]`))) setOpen(null);
    };
    const scrolled = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r || !inView(r)) setOpen(null);
      else setAnchor(r);
    };
    const resized = () => setOpen(null);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', scrolled, { capture: true, passive: true });
    window.addEventListener('resize', resized);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', scrolled, { capture: true });
      window.removeEventListener('resize', resized);
    };
  }, [open, id]);
  return (
    <>
      <button
        type="button"
        ref={ref}
        className={`kit-info${trigger ? ' text-trigger' : ''}`}
        aria-label={label}
        aria-expanded={open !== null}
        aria-describedby={open ? id : undefined}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !open) show('peek'); }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse' && open === 'peek') later(); }}
        onFocus={() => { if (!open) show('peek'); }}
        onBlur={() => setOpen(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (open === 'pinned') setOpen(null);
          else show('pinned');
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(null); }
        }}
        data-testid={testId}
      >
        {trigger ?? <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="4.9" r="0.95" fill="currentColor" />
        </svg>}
      </button>
      {open && anchor && (
        <Bubble id={id} anchor={anchor} testId={testId ? `${testId}-tip` : undefined} onPointerEnter={cancel} onPointerLeave={later}>
          {children}
        </Bubble>
      )}
    </>
  );
}

/**
 * Tooltip (design.punji.app/components/tooltip): a short name for a control,
 * on hover after 300 ms and at once on keyboard focus; Esc, blur or leaving
 * hides it. The pointer can move onto the bubble without it closing, and a scroll
 * only closes it when the control leaves the window (WCAG 1.4.13). For an icon-only button it repeats the button's own name, so it
 * is hidden from screen readers (the name already says it); with `describe`
 * it adds a description instead. Never the only place a fact lives: a
 * phone has no hover. A label that needs explaining gets an InfoTip.
 */
export interface TooltipProps {
  /** The short text shown in the bubble: the control's name. */
  content: string;
  /** The one control the tooltip is for (a single element that can take aria-describedby). */
  children: ReactElement<{ 'aria-describedby'?: string }>;
  /** Also expose the text to screen readers as the control's description while shown, for a control that already has a visible name. */
  describe?: boolean;
  /** Becomes data-testid on the bubble. */
  testId?: string;
}

/**
 * @stability beta
 */
export function Tooltip({ content, children, describe, testId }: TooltipProps) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const hide = () => {
    stop();
    setAnchor(null);
  };
  // Leaving the control waits a moment so the pointer can reach the bubble (WCAG 1.4.13).
  const leave = () => {
    stop();
    timer.current = setTimeout(() => setAnchor(null), GRACE_MS);
  };
  const show = () => {
    const el = ref.current?.firstElementChild ?? ref.current;
    if (el) setAnchor(el.getBoundingClientRect());
  };
  useEffect(() => stop, []);
  const open = anchor !== null;
  useEffect(() => {
    if (!open) return;
    const scrolled = () => {
      const el = ref.current?.firstElementChild ?? ref.current;
      const r = el?.getBoundingClientRect();
      if (!r || !inView(r)) setAnchor(null);
      else setAnchor(r);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAnchor(null); };
    window.addEventListener('scroll', scrolled, { capture: true, passive: true });
    document.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('scroll', scrolled, { capture: true });
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  const child = describe && anchor ? cloneElement(children, { 'aria-describedby': id }) : children;
  return (
    <span
      ref={ref}
      className="kit-tip-t"
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return;
        stop();
        timer.current = setTimeout(show, 300);
      }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') leave(); else hide(); }}
      onFocus={(e) => { if ((e.target as HTMLElement).matches(':focus-visible')) show(); }}
      onBlur={hide}
      onPointerDown={hide}
      onKeyDown={(e) => { if (e.key === 'Escape') hide(); }}
    >
      {child}
      {anchor && (
        <Bubble id={id} anchor={anchor} compact hidden={!describe} testId={testId} onPointerEnter={stop} onPointerLeave={leave}>
          {content}
        </Bubble>
      )}
    </span>
  );
}
