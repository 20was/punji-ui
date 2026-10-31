/**
 * PaymentStatus: where an invoice or bill stands, as a pill with an icon AND
 * words. Each status has its own icon shape (a check, a half circle, an empty
 * circle, a warning triangle, a slashed circle), so colour is never the only
 * signal. It only labels a status the caller already knows; it decides nothing
 * (it does not compare dates or amounts to call something overdue).
 */
import type { ReactNode } from 'react';

import { StatusPill } from '../status-pill/StatusPill.tsx';

export type PaymentStatusValue = 'paid' | 'partial' | 'unpaid' | 'overdue' | 'void';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusValue, string> = { paid: 'Paid', partial: 'Partly paid', unpaid: 'Unpaid', overdue: 'Overdue', void: 'Void' };

const TONES = { paid: 'gain', partial: 'info', unpaid: undefined, overdue: 'loss', void: undefined } as const;

const ICONS: Record<PaymentStatusValue, ReactNode> = {
  paid: <path d="M3 8.5 6.5 12 13 4.5" />,
  partial: <><circle cx="8" cy="8" r="5.5" /><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" /></>,
  unpaid: <circle cx="8" cy="8" r="5.5" />,
  overdue: <path d="M8 2 14.5 13.5h-13zM8 6.5v3M8 11.5v.1" />,
  void: <><circle cx="8" cy="8" r="5.5" /><path d="m4.2 11.8 7.6-7.6" /></>,
};

export interface PaymentStatusProps {
  status: PaymentStatusValue;
  /** Replace the words, in the reader's language. */
  labels?: Partial<Record<PaymentStatusValue, string>>;
  size?: 'sm';
  className?: string;
  testId?: string;
}

export function PaymentStatus({ status, labels, size, className, testId }: PaymentStatusProps) {
  const text = labels?.[status] ?? PAYMENT_STATUS_LABELS[status];
  return (
    <StatusPill tone={TONES[status]} size={size} className={`pu-payment${className ? ` ${className}` : ''}`} testId={testId}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="pu-payment-icon" data-status={status}>{ICONS[status]}</svg>
      <span className={status === 'void' ? 'pu-payment-void' : undefined}>{text}</span>
    </StatusPill>
  );
}
