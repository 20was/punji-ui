'use client';

/**
 * The pieces the financial charts share: measuring the container, the
 * keyboard cursor (arrows, Home, End, Escape), the in-figure tooltip and the
 * date and price words. Not exported from the package.
 */
import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The width of an element in CSS px, kept current; `fallback` until it has one (first paint, tests). */
export function useMeasuredWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width: width > 0 ? Math.round(width) : fallback };
}

/**
 * The active position of a chart: set by the pointer, moved by the keyboard.
 * Left and Right step by one, Home and End jump to the ends, Escape clears.
 * `source` says who set it last, so a pointer leaving does not clear a
 * keyboard position.
 */
export function useChartCursor(count: number) {
  const [state, setState] = useState<{ index: number | null; source: 'pointer' | 'keyboard' }>({ index: null, source: 'pointer' });
  const index = state.index !== null && state.index < count ? state.index : null;
  const pointerTo = useCallback((i: number | null) => setState((s) => (i === null && s.source === 'keyboard' ? s : { index: i, source: 'pointer' })), []);
  const onKeyDown = (event: KeyboardEvent) => {
    if (count === 0 || event.altKey || event.ctrlKey || event.metaKey) return;
    const at = index ?? (event.key === 'ArrowLeft' || event.key === 'End' ? count : -1);
    let next: number | null | undefined;
    if (event.key === 'ArrowRight') next = Math.min(count - 1, at + 1);
    else if (event.key === 'ArrowLeft') next = Math.max(0, at - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = count - 1;
    else if (event.key === 'Escape') next = null;
    if (next === undefined) return;
    event.preventDefault();
    setState({ index: next, source: 'keyboard' });
  };
  const clear = () => setState({ index: null, source: 'pointer' });
  /** On focus with no position yet, start on the latest observation. */
  const onFocus = () => setState((s) => (s.index === null ? { index: count - 1, source: 'keyboard' } : s));
  return { index, pointerTo, onKeyDown, onFocus, clear };
}

/** A readout that sits inside the figure, flipped to the other side of the cursor near the edge. Hidden from assistive tech: the live region says the same words. */
export function ChartTooltip({ x, width, children, testId }: { x: number; width: number; children: ReactNode; testId?: string }) {
  const right = x > width / 2;
  return (
    <div className="kit-ct-tip" aria-hidden="true" data-testid={testId} style={right ? { right: Math.max(0, width - x + 12) } : { left: x + 12 }}>
      {children}
    </div>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2025-11-14" as "14 Nov" (no time zone involved); anything else is returned as given. */
export function shortDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  const month = m ? MONTHS[Number(m[2]) - 1] : undefined;
  return m && month ? `${Number(m[3])} ${month}` : date;
}

const NPR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR', currencyDisplay: 'code', minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** NPR with two decimals and lakh grouping ("NPR 12,34,567.50"), from the platform's currency formatter (the exact bigint money module would add its weight to every chart). */
export function nprPrice(v: number): string {
  return Number.isFinite(v) ? NPR.format(v) : String(v);
}

/** Whole-number quantity grouped by the same lakh rules. */
export function quantity(v: number): string {
  return Number.isFinite(v) ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v) : String(v);
}

/** The axis labels: thin to about one per `minPx`, always including the last. */
export function thinned(count: number, step: number, minPx: number): number[] {
  const every = Math.max(1, Math.ceil(minPx / Math.max(1, step)));
  const out: number[] = [];
  for (let i = count - 1; i >= 0; i -= every) out.unshift(i);
  return out;
}
