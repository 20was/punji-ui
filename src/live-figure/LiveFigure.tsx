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

export function Live({
  value,
  id,
  dp = 2,
  className,
  testId,
  children,
}: {
  value: number | null | undefined;
  /** What the figure stands for; a new id snaps (picking another row is not a price move). */
  id?: unknown;
  /** Decimals the figure prints (a smaller change is no move). */
  dp?: number;
  className?: string;
  testId?: string;
  children: (n: number | null | undefined) => ReactNode;
}) {
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
export function LiveFigure({ value, kind = 'num', dp = 2, id, className, testId }: { value: number | null | undefined; kind?: FigureKind; dp?: number; id?: unknown; className?: string; testId?: string }) {
  return (
    <Live value={value} id={id} dp={kind === 'int' ? 0 : dp} className={className ? `kit-fig ${className}` : 'kit-fig'} testId={testId}>
      {(n) => formatFigure(n, kind, dp)}
    </Live>
  );
}
