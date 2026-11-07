/**
 * RatingScale (design.punji.app/components/rating-scale): where something sits on an N-step scale, as N segments in a
 * row (five unless `steps` or `legend` says otherwise). The step it is on is filled in its tint; the step it came from
 * (`from`) is outlined in its own, so a move reads before to now without an arrow. With `legend` every step is filled
 * and named underneath: the scale itself, explained.
 *
 * Decorative by default (hidden from assistive technology): the words beside it say the same. Give `label` when the
 * scale stands alone (an image with that name).
 */
import type { CSSProperties, ReactNode } from 'react';

import { scaleBucket, type RatingStep } from '../rating-chip/RatingChip.tsx';

export interface RatingScaleProps {
  /** The step it is on (filled), 0 to `steps - 1`; null for none. */
  value?: RatingStep | null;
  /** The step it came from (outlined); null when it did not move or is new. */
  from?: RatingStep | null;
  /** How many steps. Default: the length of `legend`, else 5. */
  steps?: number;
  /** One name per step, lowest first: every step is filled and named under the bar. */
  legend?: readonly ReactNode[];
  /** 'lg': the taller bar of a card at full width. */
  size?: 'lg';
  /** The scale's accessible name, when nothing beside it says the same. */
  label?: string;
  /** Sets `data-testid` on the scale (on the legend's wrapper when there is a legend). */
  testId?: string;
  /** Extra class names, layout only. */
  className?: string;
}

/**
 * @stability beta
 */
export function RatingScale({ value = null, from = null, steps, legend, size, label, testId, className }: RatingScaleProps) {
  const count = Math.max(2, Math.min(12, steps ?? legend?.length ?? 5));
  const style = { '--rating-steps': count } as CSSProperties;
  const bar = (
    <span
      className={`pu-rating-scale${className && !legend ? ` ${className}` : ''}`}
      data-size={size}
      style={style}
      role={label && !legend ? 'img' : undefined}
      aria-label={legend ? undefined : label}
      aria-hidden={legend || !label ? true : undefined}
      data-testid={legend ? undefined : testId}
    >
      {Array.from({ length: count }, (_, s) => {
        const state = legend || s === value ? 'on' : s === from ? 'was' : undefined;
        return <i key={s} data-bucket={state ? scaleBucket(s, count) : undefined} data-state={state} />;
      })}
    </span>
  );
  if (!legend) return bar;
  return (
    <div className={`pu-rating-scale-legend${className ? ` ${className}` : ''}`} style={style} role={label ? 'group' : undefined} aria-label={label} data-testid={testId}>
      {bar}
      <ol>
        {legend.map((name, i) => (
          <li key={i}>{name}</li>
        ))}
      </ol>
    </div>
  );
}
