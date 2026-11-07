'use client';
/**
 * AlertSummary (design.punji.app/components/alert-summary): the contrast card that says what is being watched: a
 * label, the count as one large figure ("4 active"), a line under it ("1 paused · 1 triggered"), and sections of
 * AlertRowCompact rows (Closest to firing, Fired lately). An alerts panel, a phone's alerts page and an overview's
 * "Your alerts" read the same card. On the inverse surface; one per view.
 *
 * AlertSummarySection is a titled block inside it, and AlertSummaryNote the quiet line a section shows when it has no
 * rows yet. While the figures answer, `loading` keeps their shapes and the label.
 */
import { useId, type ReactNode } from 'react';

import { Skeleton } from '../states/States.tsx';

export interface AlertSummaryProps {
  /** What is being watched ("Price alerts"). */
  label: ReactNode;
  /** The count in words: "4 active"; empty when it cannot be known (then the line under it says why). */
  value: ReactNode;
  /** The line under the figure ("1 paused · 1 triggered"). */
  sub?: ReactNode;
  /** `AlertSummarySection` blocks. */
  children?: ReactNode;
  /** The figures are still answering: their shapes, the label kept. */
  loading?: boolean;
  /** The heading's id (the figure is an h2), for the card's name. */
  headingId?: string;
  /** Sets `data-testid` on the card. */
  testId?: string;
  /** Extra class names, layout only. */
  className?: string;
}

/**
 * @stability beta
 */
export function AlertSummary({ label, value, sub, children, loading, headingId, testId, className }: AlertSummaryProps) {
  const generated = useId();
  const id = headingId ?? generated;
  const named = loading || !!value;
  return (
    <section
      className={`pu-alert-summary kit-inv${className ? ` ${className}` : ''}`}
      aria-labelledby={named ? id : undefined}
      aria-label={named ? undefined : typeof label === 'string' ? label : undefined}
      aria-busy={loading || undefined}
      data-testid={testId}
    >
      <p className="pu-alert-summary-label">{label}</p>
      {named && (
        <h2 className="pu-alert-summary-value" id={id}>
          {loading ? <Skeleton width={150} height={32} radius={8} /> : value}
        </h2>
      )}
      {(sub || loading) && <p className="pu-alert-summary-sub">{loading ? <Skeleton width={140} height={11} /> : sub}</p>}
      {children}
    </section>
  );
}

export interface AlertSummarySectionProps {
  /** The section's heading ("Closest to firing"). */
  title: ReactNode;
  /** `AlertRowCompact` rows, or an `AlertSummaryNote`. */
  children: ReactNode;
  /** Sets `data-testid` on the section. */
  testId?: string;
}

/**
 * @stability beta
 */
export function AlertSummarySection({ title, children, testId }: AlertSummarySectionProps) {
  return (
    <div className="pu-alert-summary-section" data-testid={testId}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export interface AlertSummaryNoteProps {
  /** The words ("Fills in when prices load"). */
  children: ReactNode;
}

/**
 * A line in a section when it has no rows to show ("Fills in when prices load").
 *
 * @stability beta
 */
export function AlertSummaryNote({ children }: AlertSummaryNoteProps) {
  return <p className="pu-alert-summary-note">{children}</p>;
}
