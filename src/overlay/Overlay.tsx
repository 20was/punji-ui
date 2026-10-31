'use client';

/**
 * Sheet (a short confirm: two fields at most; long forms are pages) and
 * Toast (what happened: saved, failed, undo). The app's BrandSheet and toast.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ToneIcon } from '../states/States.tsx';

export function Sheet({ open, title, body, children, onClose, testId, closeLabel = 'Close' }: { open: boolean; title: ReactNode; body?: ReactNode; children: ReactNode; onClose: () => void; testId?: string; closeLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('button, input, select, [href]');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const items = [...ref.current.querySelectorAll<HTMLElement>('button, input, select, [href]')].filter((el) => !el.hasAttribute('disabled'));
        if (!items.length) return;
        const [a, z] = [items[0]!, items[items.length - 1]!];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="kit-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="kit-sheet" role="dialog" aria-modal="true" aria-labelledby="kit-sheet-title" ref={ref} data-testid={testId}>
        <h2 id="kit-sheet-title">{title}</h2>
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

const ToastContext = createContext<ToastApi | null>(null);

export interface ToastProviderProps {
  /** The app (or the part of it) that may raise toasts with useToast. Render the provider once, near the root. */
  children: ReactNode;
}

/** Provides useToast to everything below it and renders the polite live region that holds the toasts (three at most). */
export function ToastProvider({ children }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const show = useCallback<ToastApi['show']>(
    (kind, title, opts) => {
      const id = ++seq.current;
      setItems((xs) => [{ id, kind, title, ...opts }, ...xs].slice(0, 3));
      setTimeout(() => dismiss(id), opts?.action ? 6000 : 4000);
    },
    [dismiss],
  );
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="kit-toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`kit-toast ${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'} data-testid={`toast-${t.kind}`}>
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
export function Dock({ children }: { children: ReactNode }) {
  return <div className="kit-dock">{children}</div>;
}
