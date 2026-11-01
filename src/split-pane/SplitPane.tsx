'use client';

/**
 * SplitPane: two panes side by side (or one above the other) with a separator the person can drag or move with the
 * keyboard, as in a trading terminal's chart and order ticket. The separator is a WAI-ARIA window splitter: it takes
 * focus, reports the start pane's share as its value, and moves with the arrow keys, Home and End; Enter collapses
 * the start pane to its minimum and restores it. In a narrow container the panes stack and the separator is hidden,
 * so nothing is squeezed on a phone. The share is a percent of the container, so it survives a resize.
 */
import { useId, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';

export interface SplitPaneProps {
  /** The first pane: left in a horizontal split, top in a vertical one. */
  start: ReactNode;
  /** The second pane. */
  end: ReactNode;
  /** Names the separator for screen readers ("Resize chart and order ticket"). */
  label: string;
  /** 'horizontal' (default): panes side by side. 'vertical': one above the other. */
  orientation?: 'horizontal' | 'vertical';
  /** The start pane's share in percent, controlled. Use with `onSizeChange`. */
  size?: number;
  /** The start pane's share at first, uncontrolled. Default 50. */
  defaultSize?: number;
  /** Called with the new share (percent, rounded to one decimal) while dragging and on each key press. */
  onSizeChange?: (size: number) => void;
  /** The smallest share of the start pane, percent. Default 20. */
  min?: number;
  /** The largest share of the start pane, percent. Default 80. */
  max?: number;
  /** How far one arrow key moves the separator, percent. Shift with an arrow moves four times as far. Default 5. */
  step?: number;
  /** Stack the panes (start above end, separator hidden) when the container is narrower than 640 px. Default true. */
  stack?: boolean;
  /** Sets `data-testid` on the root; the separator gets `<id>-separator`. */
  testId?: string;
  /** Layout only (height, margin). */
  className?: string;
}

/** Start a drag: capture the pointer so moves outside the handle still count, and focus the handle. */
function onPointerDown(event: PointerEvent<HTMLDivElement>) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.currentTarget.setPointerCapture?.(event.pointerId);
  event.currentTarget.focus();
}

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

export function SplitPane({
  start,
  end,
  label,
  orientation = 'horizontal',
  size: sizeProp,
  defaultSize = 50,
  onSizeChange,
  min = 20,
  max = 80,
  step = 5,
  stack = true,
  testId,
  className,
}: SplitPaneProps) {
  const lo = clamp(Math.min(min, max), 0, 100);
  const hi = clamp(Math.max(min, max), 0, 100);
  const [raw, setRaw] = useControllableState<number>({ value: sizeProp, defaultValue: defaultSize, onChange: onSizeChange });
  const size = clamp(raw, lo, hi);
  const restore = useRef<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const startId = `${useId()}-start`;
  const horizontal = orientation === 'horizontal';

  const set = (next: number) => {
    const value = round1(clamp(next, lo, hi));
    if (value !== size) setRaw(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const by = event.shiftKey ? step * 4 : step;
    const back = horizontal ? 'ArrowLeft' : 'ArrowUp';
    const forward = horizontal ? 'ArrowRight' : 'ArrowDown';
    let next: number | null = null;
    if (event.key === back) next = size - by;
    else if (event.key === forward) next = size + by;
    else if (event.key === 'Home') next = lo;
    else if (event.key === 'End') next = hi;
    else if (event.key === 'Enter') {
      if (size > lo) {
        restore.current = size;
        next = lo;
      } else next = restore.current ?? defaultSize;
    }
    if (next === null) return;
    event.preventDefault();
    set(next);
  };

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return;
    const span = horizontal ? box.width : box.height;
    if (span <= 0) return;
    set(((horizontal ? event.clientX - box.left : event.clientY - box.top) / span) * 100);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) fromPointer(event);
  };

  const style = { '--kit-split': `${size}%` } as CSSProperties;
  return (
    <div className={['pu-split', className].filter(Boolean).join(' ')} data-testid={testId}>
      <div ref={root} className="pu-split-in" data-orientation={orientation} data-stack={stack ? '' : undefined} style={style}>
        <div className="pu-split-pane" id={startId}>
          {start}
        </div>
        <div
          role="separator"
          tabIndex={0}
          className="pu-split-handle"
          aria-label={label}
          aria-controls={startId}
          aria-orientation={horizontal ? 'vertical' : 'horizontal'}
          aria-valuenow={size}
          aria-valuemin={lo}
          aria-valuemax={hi}
          aria-valuetext={`${Math.round(size)}%`}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          data-testid={testId ? `${testId}-separator` : undefined}
        />
        <div className="pu-split-pane">{end}</div>
      </div>
    </div>
  );
}
