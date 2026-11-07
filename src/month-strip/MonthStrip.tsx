/**
 * MonthStrip (design.punji.app/components/month-strip): a run of months, one cell each, tinted by the sign of its
 * figure (gain, loss, or flat for a month held in cash), with an optional line over it (how many rose, the best and
 * the worst) and one under it. Twelve across on a wide card, six on a narrow one, four on a phone. Each cell is read
 * as "Aug 2026: +1.64%"; the tint is never the only signal (the figure carries its sign).
 */
import type { ReactNode } from 'react';

export interface MonthCell {
  /** A stable key for the cell ("2026-08"). */
  key: string;
  /** The cell's short month ("Aug"). */
  label: string;
  /** The figure as printed ("+1.64%"). It carries the sign. */
  text: string;
  /** Which way the month went. Deprecated: 'up' and 'down', use `gain` and `loss`. */
  tone: 'gain' | 'loss' | 'flat' | 'up' | 'down';
  /** The cell read whole ("Aug 2026: +1.64%"). */
  aria: string;
  /** Sets `data-testid` on the cell. */
  testId?: string;
}

export interface MonthStripProps {
  /** The months, in order. */
  cells: readonly MonthCell[];
  /** A line over the strip ("8 of 12 months rose"). */
  head?: ReactNode;
  /** A line under the strip. */
  foot?: ReactNode;
  /** The list's name ("Months"). */
  label: string;
  /** Sets `data-testid` on the root. */
  testId?: string;
  /** Extra class names, layout only. */
  className?: string;
}

const DIRECTION = { gain: 'gain', up: 'gain', loss: 'loss', down: 'loss', flat: undefined } as const;

/**
 * @stability beta
 */
export function MonthStrip({ cells, head, foot, label, testId, className }: MonthStripProps) {
  return (
    <div className={`pu-month-strip${className ? ` ${className}` : ''}`} data-testid={testId}>
      {head && <p className="pu-month-strip-head">{head}</p>}
      <ul aria-label={label}>
        {cells.map((c) => (
          <li key={c.key} data-tone={DIRECTION[c.tone]} aria-label={c.aria} data-testid={c.testId}>
            <span aria-hidden="true">{c.label}</span>
            <b aria-hidden="true">{c.text}</b>
          </li>
        ))}
      </ul>
      {foot && <p className="pu-month-strip-foot">{foot}</p>}
    </div>
  );
}
