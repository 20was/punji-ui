'use client';

/**
 * BankAccountCard: one bank or wallet account as a card: where it is held,
 * whose it is, the masked number, the type, the balance and its status. A
 * display only: it moves no money and fetches nothing. The number is masked
 * (see AccountNumber for the rules; the full number never reaches the DOM
 * until the reader reveals it), and the balance can be hidden behind a toggle,
 * in which case the amount is not in the DOM at all while hidden. Currency
 * is any ISO 4217 code; the default is NPR with lakh/crore grouping.
 */
import { useId, useState, type ReactNode } from 'react';

import { AccountNumber, type AccountNumberProps } from '../account-number/AccountNumber.tsx';
import { Button } from '../button/Button.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { nepalMoneyPreset, type MoneyFormatConfig } from '../money/money.ts';
import { RetryNote } from '../retry-note/RetryNote.tsx';
import { Skeleton } from '../states/States.tsx';
import { StatusPill } from '../status-pill/StatusPill.tsx';

export type BankAccountStatus = 'active' | 'frozen' | 'closed';

export const BANK_ACCOUNT_STATUS_LABELS: Record<BankAccountStatus, string> = { active: 'Active', frozen: 'Frozen', closed: 'Closed' };

const TONES = { active: 'gain', frozen: 'warn', closed: undefined } as const;
const ICONS: Record<BankAccountStatus, ReactNode> = {
  active: <path d="M3 8.5 6.5 12 13 4.5" />,
  frozen: <path d="M8 1.5v13M2.4 4.75l11.2 6.5M2.4 11.25l11.2-6.5" />,
  closed: <><circle cx="8" cy="8" r="5.5" /><path d="m4.2 11.8 7.6-7.6" /></>,
};

export interface BankAccountCardLabels {
  /** Name of the balance figure. Default 'Balance'. */
  balance: string;
  /** Name of the holder line. Default 'Account holder'. */
  holder: string;
  /** The hide/show balance toggle's name (stays the same while pressed). Default 'Hide balance'. */
  hideBalance: string;
  /** Spoken in place of a hidden balance. Default 'Balance hidden'. */
  balanceHidden: string;
  /** Loading region name. Default 'Loading account'. */
  loading: string;
  /** Error text. Default 'Could not load this account.'. */
  error: string;
  /** Retry button words. Default 'Try again'. */
  retry: string;
}

export const DEFAULT_BANK_ACCOUNT_CARD_LABELS: BankAccountCardLabels = {
  balance: 'Balance',
  holder: 'Account holder',
  hideBalance: 'Hide balance',
  balanceHidden: 'Balance hidden',
  loading: 'Loading account',
  error: 'Could not load this account.',
  retry: 'Try again',
};

export interface BankAccountCardProps {
  /** The bank or wallet's display name ("NIC Asia Bank", "eSewa"). Shown as given; the component knows no institution. */
  institution: string;
  /** Whose account it is. */
  holder: string;
  /** The full account number; shown masked. Wallets may pass a phone-style ID. */
  accountNumber: string;
  /** A label for the kind of account ("Savings", "Current", "Wallet"). */
  accountType?: string;
  /** Balance in integer minor units (paisa, cents). null/undefined shows the missing mark, never zero. */
  balance?: bigint | null;
  /** Money format; default NPR (`nepalMoneyPreset`). Any currency works: `{ currency: 'USD', locale: 'en-US' }`. */
  money?: MoneyFormatConfig;
  /** Where the account stands. Decided by the caller. */
  status?: BankAccountStatus;
  /** Show a toggle that hides the balance. Default false. */
  balanceToggle?: boolean;
  /** With `balanceToggle`: start hidden. Default true. */
  defaultBalanceHidden?: boolean;
  /** Props for the masked number (visible digits, copyable, auto-hide). */
  numberProps?: Omit<AccountNumberProps, 'value'>;
  /** Buttons or links for this account (Statement, Send). Rendered as given. */
  actions?: ReactNode;
  /** The data is not here yet: placeholders hold the card's shape. */
  loading?: boolean;
  /** The data failed to load: shows the error line, with a retry when `onRetry` is given. */
  error?: boolean;
  /** Called when the reader presses Try again. Without it no button is drawn. */
  onRetry?: () => void;
  /** Heading level of the institution name. Default 3. */
  headingLevel?: 2 | 3 | 4;
  /** Replace the words, in the reader's language. */
  labels?: Partial<BankAccountCardLabels>;
  /** Extra class for layout. */
  className?: string;
  /** Sets `data-testid` on the card. */
  testId?: string;
}

const Eye = ({ off }: { off: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
    <circle cx="8" cy="8" r="2" />
    {off && <path d="m2.5 13.5 11-11" />}
  </svg>
);

export function BankAccountCard({
  institution, holder, accountNumber, accountType, balance, money = nepalMoneyPreset, status, balanceToggle = false, defaultBalanceHidden = true,
  numberProps, actions, loading, error, onRetry, headingLevel = 3, labels, className, testId,
}: BankAccountCardProps) {
  const words = { ...DEFAULT_BANK_ACCOUNT_CARD_LABELS, ...labels };
  const [hidden, setHidden] = useState(balanceToggle && defaultBalanceHidden);
  const uid = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const classes = `pu-bank kit-card${className ? ` ${className}` : ''}`;
  if (loading) {
    return (
      <section className={classes} aria-busy="true" aria-label={words.loading} data-testid={testId}>
        <Skeleton width="55%" height={20} label={words.loading} />
        <Skeleton width="40%" height={14} />
        <Skeleton width="70%" height={16} />
        <Skeleton width="50%" height={28} />
      </section>
    );
  }
  if (error) {
    return (
      <section className={classes} aria-label={institution} data-testid={testId}>
        <Heading className="pu-bank-name">{institution}</Heading>
        <RetryNote retryLabel={words.retry} onRetry={onRetry} testId={testId ? `${testId}-error` : undefined}>{words.error}</RetryNote>
      </section>
    );
  }
  const balanceHidden = balanceToggle && hidden;
  return (
    <section className={classes} aria-labelledby={`${uid}-name`} data-testid={testId}>
      <div className="pu-bank-head">
        <div className="pu-bank-id">
          <Heading className="pu-bank-name" id={`${uid}-name`}>{institution}</Heading>
          {accountType && <p className="pu-bank-type">{accountType}</p>}
        </div>
        {status && (
          <StatusPill tone={TONES[status]} size="sm" className="pu-bank-status" testId={testId ? `${testId}-status` : undefined}>
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="pu-bank-status-icon" data-status={status}>{ICONS[status]}</svg>
            <span>{BANK_ACCOUNT_STATUS_LABELS[status]}</span>
          </StatusPill>
        )}
      </div>
      <dl className="pu-bank-facts">
        <div>
          <dt>{words.holder}</dt>
          <dd>{holder}</dd>
        </div>
        <div>
          <dt>{numberProps?.label ?? 'Account number'}</dt>
          <dd><AccountNumber {...numberProps} label={numberProps?.label} value={accountNumber} testId={testId ? `${testId}-number` : undefined} /></dd>
        </div>
      </dl>
      <div className="pu-bank-balance">
        <dl className="pu-bank-facts">
          <div>
            <dt>{words.balance}</dt>
            <dd className="pu-bank-amount" data-hidden={balanceHidden ? 'true' : undefined} data-testid={testId ? `${testId}-balance` : undefined}>
              {balanceHidden
                ? <><span aria-hidden="true">••••••</span><span className="kit-sr">{words.balanceHidden}</span></>
                : <MoneyDisplay value={balance} preset={money} />}
            </dd>
          </div>
        </dl>
        {balanceToggle && (
          <Button variant="ghost" size="sm" iconOnly label={words.hideBalance} aria-pressed={balanceHidden} onClick={() => setHidden(!hidden)} testId={testId ? `${testId}-balance-toggle` : undefined}>
            <Eye off={balanceHidden} />
          </Button>
        )}
      </div>
      {actions && <div className="pu-bank-actions">{actions}</div>}
    </section>
  );
}
