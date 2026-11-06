'use client';

/**
 * Sheet (a short confirm: two fields at most; long forms are pages) and
 * Toast (what happened: saved, failed, undo). The app's BrandSheet and toast.
 */
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

import { useFocusScope } from '../internal/focusScope.ts';
import { useInertOthers } from '../internal/inert.ts';
import { Portal } from '../internal/Portal.tsx';
import { useScrollLock } from '../internal/scrollLock.ts';
import { ToneIcon } from '../states/States.tsx';

export interface SheetProps {
  /** Shown or not. Nothing renders while false. */
  open: boolean;
  /** The decision as a heading ("Sell 40 NTC?"). Names the dialog. */
  title: ReactNode;
  /** One line under the title saying what happens. */
  body?: ReactNode;
  /** The buttons or the one or two fields. */
  children: ReactNode;
  /** Called by Esc, the scrim and the close button. */
  onClose: () => void;
  /** Becomes data-testid on the dialog. */
  testId?: string;
  /** The close button's accessible name (default "Close"). Pass it in the reader's language. */
  closeLabel?: string;
}

export function Sheet(props: SheetProps) {
  // The content mounts only while open, so the overlay hooks live and die with it.
  return props.open ? (
    <Portal>
      <SheetLayer {...props} />
    </Portal>
  ) : null;
}

function SheetLayer({ title, body, children, onClose, testId, closeLabel = 'Close' }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Focus lands on the safest control: an explicit [data-autofocus], else the first one that is not destructive (Keep, Cancel, Close), else the first.
  useFocusScope(ref, { onEscape: onClose });
  useScrollLock(true);
  useInertOthers(ref, true);
  return (
    <div className="kit-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="kit-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} data-testid={testId}>
        <h2 id={titleId}>{title}</h2>
        {body && <p>{body}</p>}
        {children}
        <span className="kit-sr"><button type="button" onClick={onClose}>{closeLabel}</button></span>
      </div>
    </div>
  );
}

export type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
  action?: { label: string; run: () => void };
}

interface ToastApi {
  show: (kind: ToastKind, title: string, opts?: { body?: string; action?: { label: string; run: () => void } }) => void;
  dismiss: (id: number) => void;
}

/** How long a toast stays. One with an action (Undo) gets 10 s (WCAG 2.2.1). Hover or focus inside pauses it. */
const PLAIN_MS = 4000;
const ACTION_MS = 10000;

const ToastContext = createContext<ToastApi | null>(null);

export interface ToastProviderProps {
  /** The app (or the part of it) that may raise toasts with useToast. Render the provider once, near the root. */
  children: ReactNode;
}

/** Provides useToast to everything below it and renders the polite live region that holds the toasts (three at most; the stack itself is not live, two hidden regions announce each toast once, errors assertively, and hover or focus pauses its countdown). */
export function ToastProvider({ children }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  // What the two hidden live regions say. The keyed span is replaced on every toast, so an identical message announces again.
  const [said, setSaid] = useState<{ polite: { n: number; text: string }; assertive: { n: number; text: string } }>({ polite: { n: 0, text: '' }, assertive: { n: 0, text: '' } });
  // One timer per toast, with what is left of its time, so hover and focus can pause it (WCAG 2.2.1).
  const timers = useRef(new Map<number, { handle: ReturnType<typeof setTimeout> | null; left: number; since: number }>());
  const clear = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t?.handle) clearTimeout(t.handle);
    timers.current.delete(id);
  }, []);
  const dismiss = useCallback(
    (id: number) => {
      clear(id);
      setItems((xs) => xs.filter((x) => x.id !== id));
    },
    [clear],
  );
  const arm = useCallback(
    (id: number, ms: number) => {
      timers.current.set(id, { handle: setTimeout(() => dismiss(id), ms), left: ms, since: Date.now() });
    },
    [dismiss],
  );
  const pause = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (!t?.handle) return;
    clearTimeout(t.handle);
    t.handle = null;
    t.left = Math.max(t.left - (Date.now() - t.since), 1000);
  }, []);
  const resume = useCallback(
    (id: number) => {
      const t = timers.current.get(id);
      if (t && !t.handle) arm(id, t.left);
    },
    [arm],
  );
  const show = useCallback<ToastApi['show']>(
    (kind, title, opts) => {
      const id = ++seq.current;
      setItems((xs) => [{ id, kind, title, ...opts }, ...xs].slice(0, 3));
      const tone = kind === 'error' ? 'assertive' : 'polite';
      setSaid((c) => ({ ...c, [tone]: { n: id, text: opts?.body ? `${title}. ${opts.body}` : title } }));
      arm(id, opts?.action ? ACTION_MS : PLAIN_MS);
    },
    [arm],
  );
  useEffect(() => {
    const all = timers.current;
    return () => {
      for (const t of all.values()) if (t.handle) clearTimeout(t.handle);
      all.clear();
    };
  }, []);
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="kit-sr">
        <div role="status" aria-live="polite" aria-atomic="true"><span key={said.polite.n}>{said.polite.text}</span></div>
        <div role="alert" aria-live="assertive" aria-atomic="true"><span key={said.assertive.n}>{said.assertive.text}</span></div>
      </div>
      <div className="kit-toasts">
        {items.map((t) => (
          <div
            key={t.id}
            className={`kit-toast ${t.kind}`}
            data-testid={`toast-${t.kind}`}
            onMouseEnter={() => pause(t.id)}
            onMouseLeave={(e) => { if (!e.currentTarget.contains(document.activeElement)) resume(t.id); }}
            onFocus={() => pause(t.id)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !e.currentTarget.matches(':hover')) resume(t.id); }}
          >
            {(t.kind === 'error' || t.kind === 'success') && <ToneIcon tone={t.kind} />}
            <span className="msg">
              <b>{t.title}</b>
              {t.body}
            </span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action!.run();
                  dismiss(t.id);
                }}
                data-testid="toast-action"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

/** A page's main action docked at the bottom (the app's BottomDock). */
export interface DockProps {
  /** The page's main action (a Button) and at most one quiet companion. */
  children: ReactNode;
}

export function Dock({ children }: DockProps) {
  return <div className="kit-dock">{children}</div>;
}
