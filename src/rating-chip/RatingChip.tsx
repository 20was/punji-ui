/**
 * RatingChip (design.punji.app/components/rating-chip): a word on an N-step scale ("Agree", "Mildly bullish"), in its
 * step's tint: amber on the low side, grey in the middle, blue on the high side, the outer steps stronger than the
 * ones next to them. Never green or red: a step on a scale is not a gain or a loss, and must not read as go or stop.
 * The word is always printed; the tint only repeats it.
 *
 * The scale has five steps unless `steps` says otherwise (3 for low, medium, high; 7 for a finer rating).
 * `step={null}` is the quiet outline for a thing with no step ("Not rated", "Low confidence").
 */
import type { ReactNode } from 'react';

/** A place on a scale: 0 (lowest) to `steps - 1` (highest). */
export type RatingStep = number;

/**
 * Which of the five tints (0 to 4) a step of an N-step scale is drawn in: the lowest step is 0, the highest 4, the
 * rest spread between. A scale of one step is the middle tint.
 *
 * @stability beta
 */
export function scaleBucket(step: number, steps = 5): 0 | 1 | 2 | 3 | 4 {
  if (!Number.isInteger(steps) || steps < 2) return 2;
  const clamped = Math.min(steps - 1, Math.max(0, Math.round(step)));
  return Math.round((clamped * 4) / (steps - 1)) as 0 | 1 | 2 | 3 | 4;
}

export interface RatingChipProps {
  /** The word's place on the scale, 0 (lowest) to `steps - 1`; null for the quiet outline (no step). */
  step: RatingStep | null;
  /** How many steps the scale has. Default 5. */
  steps?: number;
  /** The word, always printed. */
  children: ReactNode;
  /** 'sm': the 20px tag of a dense row. */
  size?: 'sm';
  /** Sets `data-testid` on the chip. */
  testId?: string;
  /** Extra class names, layout only. */
  className?: string;
}

/**
 * @stability beta
 */
export function RatingChip({ step, steps = 5, children, size, testId, className }: RatingChipProps) {
  return (
    <span
      className={`pu-rating-chip${className ? ` ${className}` : ''}`}
      data-bucket={step === null ? undefined : scaleBucket(step, steps)}
      data-step={step ?? undefined}
      data-quiet={step === null ? '' : undefined}
      data-size={size}
      data-testid={testId}
    >
      {children}
    </span>
  );
}
