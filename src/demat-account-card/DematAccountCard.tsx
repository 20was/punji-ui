'use client';

/**
 * DematAccountCard: one demat (and MeroShare-style online) account: the holder, the BOID split into DP ID and
 * client ID, the depository participant, the CRN and linked bank account, the account status, and renewal dates in
 * Bikram Sambat and Gregorian with a warning in words as expiry nears. A display: it fetches and renews nothing.
 */
import { useId, type ReactNode } from 'react';

import { accountNumberTail } from '../banking/account.ts';
import { DualDate } from '../internal/dualDate.tsx';
import type { NepalLanguage } from '../nepal/locale.ts';
import { RetryNote } from '../retry-note/RetryNote.tsx';
import { boidParts, formatBoid, spokenBoid } from '../share-issues/boid.ts';
import { daysBetween } from '../share-issues/issues.ts';
import { Skeleton } from '../states/States.tsx';
import { StatusPill } from '../status-pill/StatusPill.tsx';

export type DematAccountStatus = 'active' | 'dormant' | 'suspended' | 'closed';

export const DEMAT_STATUS_LABELS: Readonly<Record<DematAccountStatus, string>> = Object.freeze({ active: 'Active', dormant: 'Dormant', suspended: 'Suspended', closed: 'Closed' });

const TONES = { active: 'gain', dormant: 'warn', suspended: 'loss', closed: undefined } as const;

export interface DematAccountCardLabels {
  boid: string;
  dpId: string;
  clientId: string;
  dp: string;
  crn: string;
  bank: string;
  dematExpiry: string;
  onlineExpiry: string;
  /** Spoken name of a masked bank number: "account ending in 4 5 0 1". */
  accountEnding: (tail: string) => string;
  /** The renewal note: `days` left (0 is today) or negative when expired. */
  expiry: (days: number) => string;
  loading: string;
  error: string;
  retry: string;
}

export const DEFAULT_DEMAT_ACCOUNT_CARD_LABELS: DematAccountCardLabels = {
  boid: 'BOID',
  dpId: 'DP ID',
  clientId: 'Client ID',
  dp: 'Depository participant',
  crn: 'CRN',
  bank: 'Linked bank account',
  dematExpiry: 'Demat renewal due',
  onlineExpiry: 'Online access expires',
  accountEnding: (tail) => `account ending in ${tail.split('').join(' ')}`,
  expiry: (days) => (days < 0 ? 'Expired' : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`),
  loading: 'Loading demat account',
  error: 'Could not load this demat account.',
  retry: 'Try again',
};

export interface DematAccountCardProps {
  /** Whose account it is. */
  holder: string;
  /** The 16-digit BOID. Shown split into DP ID and client ID. */
  boid: string;
  /** The depository participant's name ("NIC Asia Capital"). Display text. */
  dpName?: string;
  /** Customer reference number issued by the bank for ASBA applications. */
  crn?: string;
  /** Linked bank's name. */
  bankName?: string;
  /** Linked bank account number; only the last four digits are rendered. */
  bankAccount?: string;
  /** Account status, from your server. */
  status?: DematAccountStatus;
  /** Demat renewal (annual fee) date, Gregorian `YYYY-MM-DD`. */
  dematExpiry?: string;
  /** Online access (MeroShare-style login) expiry, Gregorian `YYYY-MM-DD`. */
  onlineExpiry?: string;
  /** Today, Gregorian `YYYY-MM-DD`: enables the "Due in N days" notes. */
  today?: string;
  /** Warn this many days before an expiry. Default 30. */
  warnWithinDays?: number;
  /** Mask the BOID to its last 4 digits. Default false (a BOID is shared to check results). */
  maskBoid?: boolean;
  /** Which calendar leads in dates. Default 'bs'. */
  primaryCalendar?: 'bs' | 'ad';
  /** Month names in dates. Default 'en'. */
  language?: NepalLanguage;
  /** Digits in dates. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** Buttons or links (Renew, Switch account). */
  actions?: ReactNode;
  /** Placeholders while loading. */
  loading?: boolean;
  /** The data failed to load. */
  error?: boolean;
  /** Retry handler; without it no button is drawn. */
  onRetry?: () => void;
  /** Heading level of the holder name. Default 3. */
  headingLevel?: 2 | 3 | 4;
  /** Words for statuses. */
  statusLabels?: Partial<Record<DematAccountStatus, string>>;
  /** Replace the words. */
  labels?: Partial<DematAccountCardLabels>;
  className?: string;
  /** Sets `data-testid` on the card. */
  testId?: string;
}

export function DematAccountCard({
  holder, boid, dpName, crn, bankName, bankAccount, status, dematExpiry, onlineExpiry, today, warnWithinDays = 30, maskBoid = false,
  primaryCalendar = 'bs', language, digits, actions, loading, error, onRetry, headingLevel = 3, statusLabels, labels, className, testId,
}: DematAccountCardProps) {
  const words = { ...DEFAULT_DEMAT_ACCOUNT_CARD_LABELS, ...labels };
  const uid = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const classes = `pu-demat kit-card${className ? ` ${className}` : ''}`;
  if (loading) {
    return (
      <article className={classes} aria-busy="true" aria-label={words.loading} data-testid={testId}>
        <Skeleton width="50%" height={20} label={words.loading} />
        <Skeleton width="80%" height={16} />
        <Skeleton width="65%" height={14} />
        <Skeleton width="45%" height={14} />
      </article>
    );
  }
  if (error) {
    return (
      <article className={classes} aria-labelledby={`${uid}-name`} data-testid={testId}>
        <Heading className="pu-demat-name" id={`${uid}-name`}>{holder}</Heading>
        <RetryNote retryLabel={words.retry} onRetry={onRetry} testId={testId ? `${testId}-error` : undefined}>{words.error}</RetryNote>
      </article>
    );
  }
  let parts: ReturnType<typeof boidParts> | null = null;
  try { parts = boidParts(boid); } catch { parts = null; }
  const tail = bankAccount ? accountNumberTail(bankAccount) : '';
  const expiryRow = (key: string, label: string, date: string | undefined) => {
    if (!date) return null;
    const days = today ? daysBetween(today, date) : null;
    const tone = days === null ? null : days < 0 ? 'loss' : days <= warnWithinDays ? 'warn' : null;
    return (
      <div key={key}>
        <dt>{label}</dt>
        <dd className="pu-demat-expiry">
          <DualDate value={date} primary={primaryCalendar} language={language} digits={digits} />
          {tone && days !== null && <StatusPill size="sm" tone={tone} testId={testId ? `${testId}-${key}` : undefined}>{words.expiry(days)}</StatusPill>}
        </dd>
      </div>
    );
  };
  return (
    <article className={classes} aria-labelledby={`${uid}-name`} data-testid={testId}>
      <div className="pu-demat-head">
        <div className="pu-demat-id">
          <Heading className="pu-demat-name" id={`${uid}-name`}>{holder}</Heading>
          {dpName && <p className="pu-demat-dp">{dpName}</p>}
        </div>
        {status && <StatusPill tone={TONES[status]} dot size="sm" testId={testId ? `${testId}-status` : undefined}>{statusLabels?.[status] ?? DEMAT_STATUS_LABELS[status]}</StatusPill>}
      </div>
      <div className="pu-demat-boid">
        <span className="pu-demat-k">{words.boid}</span>
        {parts && !maskBoid ? (
          <span className="pu-demat-boid-v" data-testid={testId ? `${testId}-boid` : undefined}>
            <span aria-hidden="true"><span className="pu-demat-dpid">{parts.dpId}</span> <span>{parts.clientId}</span></span>
            <span className="kit-sr">{spokenBoid(parts.boid)}</span>
          </span>
        ) : (
          <span className="pu-demat-boid-v" data-testid={testId ? `${testId}-boid` : undefined}>{formatBoid(boid, { mask: maskBoid })}</span>
        )}
        {parts && !maskBoid && (
          <span className="pu-demat-split" aria-hidden="true">{words.dpId} {parts.dpId} · {words.clientId} {parts.clientId}</span>
        )}
      </div>
      <dl className="pu-demat-facts">
        {crn && <div><dt>{words.crn}</dt><dd>{crn}</dd></div>}
        {(bankName || tail) && (
          <div>
            <dt>{words.bank}</dt>
            <dd>
              {bankName}
              {tail && <>{bankName ? ' ' : ''}<span aria-hidden="true">••{tail}</span><span className="kit-sr">{words.accountEnding(tail)}</span></>}
            </dd>
          </div>
        )}
        {expiryRow('demat-expiry', words.dematExpiry, dematExpiry)}
        {expiryRow('online-expiry', words.onlineExpiry, onlineExpiry)}
      </dl>
      {actions && <div className="pu-demat-actions">{actions}</div>}
    </article>
  );
}
