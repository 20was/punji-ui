/**
 * PaymentTimeline: the steps a payment went through, in order (initiated,
 * processing, then completed, failed or reversed), each with an icon AND words
 * for its state and a timestamp in a zone you name. An ordered list; the
 * current step carries `aria-current="step"`. It records what your server says
 * happened; it decides nothing and never moves a step on its own.
 */
import type { ReactNode } from 'react';

import { formatTimestamp } from '../banking/time.ts';

export type PaymentStepState = 'complete' | 'current' | 'upcoming' | 'failed' | 'reversed';

export const PAYMENT_STEP_STATE_LABELS: Record<PaymentStepState, string> = { complete: 'Done', current: 'In progress', upcoming: 'Not started', failed: 'Failed', reversed: 'Reversed' };

export interface PaymentStep {
  /** Stable unique id (the row key). */
  id: string;
  /** What this step is ("Initiated", "Sent to the bank"). */
  label: string;
  /** Where the step stands. */
  state: PaymentStepState;
  /** When it happened: a Date, epoch ms, or an ISO string with an offset or Z. Omit for a step that has not happened. */
  timestamp?: Date | number | string;
  /** A line under the label (a reason for a failure). Plain text. */
  detail?: string;
}

const ICONS: Record<PaymentStepState, ReactNode> = {
  complete: <path d="M3 8.5 6.5 12 13 4.5" />,
  current: <><circle cx="8" cy="8" r="5.5" /><circle cx="8" cy="8" r="2" fill="currentColor" /></>,
  upcoming: <circle cx="8" cy="8" r="5.5" strokeDasharray="2.5 2.5" />,
  failed: <path d="m4.5 4.5 7 7m0-7-7 7" />,
  reversed: <path d="M6 3 3 6l3 3M3 6h6a4 4 0 0 1 0 8H7" />,
};

export interface PaymentTimelineProps {
  /** The steps in order. */
  steps: readonly PaymentStep[];
  /** Names the list. Default 'Payment progress'. */
  label?: string;
  /** IANA zone to print timestamps in. Default 'Asia/Kathmandu'; the zone name is printed. */
  timeZone?: string;
  /** BCP 47 locale for timestamps. Default 'en-GB'. */
  locale?: string;
  /** Replace the state words, in the reader's language. */
  stateLabels?: Partial<Record<PaymentStepState, string>>;
  /** Extra class for layout. */
  className?: string;
  /** Sets `data-testid` on the list. */
  testId?: string;
}

export function PaymentTimeline({ steps, label = 'Payment progress', timeZone, locale, stateLabels, className, testId }: PaymentTimelineProps) {
  return (
    <ol className={`pu-timeline${className ? ` ${className}` : ''}`} aria-label={label} data-testid={testId}>
      {steps.map((step) => {
        const when = formatTimestamp(step.timestamp, { timeZone, locale });
        return (
          <li key={step.id} className="pu-step" data-state={step.state} aria-current={step.state === 'current' ? 'step' : undefined}>
            <span className="pu-step-mark">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{ICONS[step.state]}</svg>
            </span>
            <span className="pu-step-body">
              <span className="pu-step-label">{step.label}</span>
              <span className="pu-step-state">{stateLabels?.[step.state] ?? PAYMENT_STEP_STATE_LABELS[step.state]}</span>
              {when && <time className="pu-step-time" dateTime={when.iso}>{when.text}</time>}
              {step.detail && <span className="pu-step-detail">{step.detail}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
