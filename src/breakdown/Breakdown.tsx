/**
 * Breakdown (design.punji.app/components/breakdown): how a total is made, one
 * row per part (a label, an optional note, the amount) and the total ruled off,
 * e.g. a sale from its amount down to what is received. It does no arithmetic
 * and knows no fee or tax rule: the caller computes and formats every amount
 * (a string, or a MoneyDisplay for an exact one) and says which row is the
 * total. On the inverse surface when it is the summary of a form
 * (`tone="inverse"`, default), on a tint otherwise.
 *
 * A description list: each label is read with its amount. Put the sign in the
 * amount ("- Rs 1,120.00"); `tone` only tints it.
 */
import type { ReactNode } from 'react';

export interface BreakdownProps {
  /** BreakdownRows. */
  children: ReactNode;
  /** 'inverse' (default): the inverse surface, for a form's summary. 'tint': a quiet tinted ground. */
  tone?: 'inverse' | 'tint';
  /** Announce changes politely as a form is filled. */
  live?: boolean;
  /** Sets `data-testid` on the list. */
  testId?: string;
}

export function Breakdown({ children, tone = 'inverse', live, testId }: BreakdownProps) {
  return (
    <dl className={`kit-bd${tone === 'inverse' ? ' kit-inv' : ''}`} aria-live={live ? 'polite' : undefined} data-testid={testId}>
      {children}
    </dl>
  );
}

export interface BreakdownRowProps {
  /** What the amount is ("Sale amount"). */
  label: ReactNode;
  /** A quiet line under the label ("0.4% of the amount"). */
  note?: ReactNode;
  /** The amount as the caller formats it. */
  value: ReactNode;
  /** The ruled-off total row: larger, with a rule above it. */
  total?: boolean;
  /** Tint the amount as a gain or a loss; the amount also carries its sign. */
  tone?: 'up' | 'down';
  /** Sets `data-testid` on the amount. */
  testId?: string;
}

export function BreakdownRow({ label, note, value, total, tone, testId }: BreakdownRowProps) {
  return (
    <div className={`kit-bd-row${total ? ' total' : ''}`}>
      <dt>
        {label}
        {note !== undefined && note !== null && <small>{note}</small>}
      </dt>
      <dd className={tone} data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}
