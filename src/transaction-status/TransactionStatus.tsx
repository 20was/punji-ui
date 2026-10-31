/**
 * TransactionStatus: where a payment or transfer stands (completed, pending,
 * failed, reversed) as a pill with an icon AND words; each status has its own
 * icon shape, so colour is never the only signal. It labels a status the
 * caller already knows (from the bank or wallet); it decides nothing. For an
 * invoice or bill use PaymentStatus.
 */
import type { ReactNode } from 'react';

import type { TransactionStatusValue } from '../banking/transactions.ts';
import { StatusPill } from '../status-pill/StatusPill.tsx';

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatusValue, string> = { completed: 'Completed', pending: 'Pending', failed: 'Failed', reversed: 'Reversed' };

const TONES = { completed: 'gain', pending: 'info', failed: 'loss', reversed: 'warn' } as const;

const ICONS: Record<TransactionStatusValue, ReactNode> = {
  completed: <path d="M3 8.5 6.5 12 13 4.5" />,
  pending: <><circle cx="8" cy="8" r="5.5" /><path d="M8 4.8V8l2.2 1.4" /></>,
  failed: <><circle cx="8" cy="8" r="5.5" /><path d="m5.8 5.8 4.4 4.4m0-4.4-4.4 4.4" /></>,
  reversed: <path d="M6 3 3 6l3 3M3 6h6a4 4 0 0 1 0 8H7" />,
};

export interface TransactionStatusProps {
  /** Where the payment stands. Decided by the caller. */
  status: TransactionStatusValue;
  /** Replace the words, in the reader's language. */
  labels?: Partial<Record<TransactionStatusValue, string>>;
  /** 'sm' for a smaller pill, for a dense list. */
  size?: 'sm';
  /** Extra class for layout. */
  className?: string;
  /** Sets `data-testid` on the pill. */
  testId?: string;
}

export function TransactionStatus({ status, labels, size, className, testId }: TransactionStatusProps) {
  const text = labels?.[status] ?? TRANSACTION_STATUS_LABELS[status];
  return (
    <StatusPill tone={TONES[status]} size={size} className={`pu-txstatus${className ? ` ${className}` : ''}`} testId={testId}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="pu-txstatus-icon" data-status={status}>{ICONS[status]}</svg>
      <span>{text}</span>
    </StatusPill>
  );
}
