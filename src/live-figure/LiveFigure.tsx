'use client';

/**
 * Live and LiveFigure: a figure fed by a live price. When the value changes
 * it counts to the new one (live.ts: 450 ms ease-out, the same formatting at
 * every frame, exactly the new value at the end) and the figure's ground
 * flashes the gain or loss tint for 900 ms. Under reduced motion it simply
 * shows the new value.
 *
 * Live takes a render function so any figure (Delta, a signed amount, a
 * figure inside a sentence) can move: children(n) draws the value n. While
 * it moves, the frames are hidden from screen readers and the final value
 * is what they read; aria-live belongs on a container that needs it (the
 * open stock's price), never on every cell. Put a test id on Live itself,
 * never inside children (the final value is drawn twice while it moves).
 */
import type { ReactNode } from 'react';

import { formatFigure, type FigureKind } from '../format/format.ts';
import { useTweenedNumber } from '../live/live.ts';

export interface LiveProps {
  /** The current value, from props or state. A change moves the figure to it. */
  value: number | null | undefined;
  /** What the figure stands for; a new id snaps (picking another row is not a price move). */
  id?: unknown;
  /** Decimals the figure prints (a smaller change is no move). */
  dp?: number;
  /** Extra classes on the wrapper, for layout. */
  className?: string;
  /** Becomes data-testid on the wrapper. Put it here, never inside `children`. */
  testId?: string;
  /** Draws the figure for the value n it is given (the in-between values while it moves, then exactly `value`). */
  children: (n: number | null | undefined) => ReactNode;
}

export function Live({
  value,
  id,
  dp = 2,
  className,
  testId,
  children,
}: LiveProps) {
  const { shown, tint, moving } = useTweenedNumber(value, { id, dp });
  const cls = `kit-live${tint === 'up' ? ' kit-live-up' : tint === 'down' ? ' kit-live-dn' : ''}${className ? ` ${className}` : ''}`;
  return (
    <span className={cls} data-testid={testId}>
      {/* One element for the drawn value at rest and in motion, so a live region around it hears the new value once. */}
      <span aria-hidden={moving || undefined}>{children(shown)}</span>
      {moving && <span className="kit-sr">{children(value)}</span>}
    </span>
  );
}

/** A plain figure (formatFigure) that moves: LTP, value, weight. */
export interface LiveFigureProps {
  /** The current value, from props or state. A change counts to it and tints once. */
  value: number | null | undefined;
  /** How to print it: rs, int, pct or num (default), as in Figure. */
  kind?: FigureKind;
  /** Decimals to print (default 2). */
  dp?: number;
  /** What the figure stands for (a symbol); a new id snaps instead of moving. */
  id?: unknown;
  /** Extra classes on the wrapper, for layout. */
  className?: string;
  /** Becomes data-testid on the wrapper. */
  testId?: string;
}

export function LiveFigure({ value, kind = 'num', dp = 2, id, className, testId }: LiveFigureProps) {
  return (
    <Live value={value} id={id} dp={kind === 'int' ? 0 : dp} className={className ? `kit-fig ${className}` : 'kit-fig'} testId={testId}>
      {(n) => formatFigure(n, kind, dp)}
    </Live>
  );
}
