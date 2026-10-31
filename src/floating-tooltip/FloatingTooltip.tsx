'use client';

/** Small, viewport-contained readouts. Portals keep them clear of scroll containers. */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function FloatingTooltip({ anchor, children, id, className = '', testId }: { anchor: { x: number; y: number }; children: ReactNode; id?: string; className?: string; testId?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 180, height: 96 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.target.getBoundingClientRect();
      setSize((was) => was.width === width && was.height === height ? was : { width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  if (typeof document === 'undefined') return null;
  const gap = 12;
  const left = Math.max(8, Math.min(anchor.x + gap + size.width <= window.innerWidth - 8 ? anchor.x + gap : anchor.x - gap - size.width, window.innerWidth - size.width - 8));
  const top = Math.max(8 + size.height / 2, Math.min(anchor.y, window.innerHeight - size.height / 2 - 8));
  return createPortal(<div ref={ref} id={id} role="tooltip" className={`kit-floating-tip ${className}`} style={{ left, top, transform: 'translateY(-50%)' }} data-testid={testId}>{children}</div>, document.body);
}

/** Delayed pointer hint, immediate keyboard hint; Escape and blur dismiss it. */
export function IconHint({ label, enabled = true, children }: { label: string; enabled?: boolean; children: ReactNode }) {
  const id = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; setAnchor(null); };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <span className="kit-icon-hint"
    onPointerEnter={(event) => {
      if (!enabled || event.pointerType === 'touch') return;
      const rect = event.currentTarget.getBoundingClientRect();
      timer.current = setTimeout(() => setAnchor({ x: rect.right, y: rect.top + rect.height / 2 }), 400);
    }}
    onPointerLeave={clear}
    onFocus={(event) => { if (enabled) { const rect = event.currentTarget.getBoundingClientRect(); setAnchor({ x: rect.right, y: rect.top + rect.height / 2 }); } }}
    onBlur={clear} onClick={clear} onKeyDown={(event) => { if (event.key === 'Escape') clear(); }}>
    {children}
    {enabled && anchor && <FloatingTooltip id={id} anchor={anchor} className="kit-icon-tip">{label}</FloatingTooltip>}
  </span>;
}
