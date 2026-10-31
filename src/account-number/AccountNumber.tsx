'use client';

/**
 * AccountNumber: an account number that is masked until the reader asks.
 *
 * Security notes (read before using it):
 * - Masking is display-only. The full number is still in your JavaScript memory
 *   because you pass it in; if that matters, fetch it on demand and mount this
 *   component only after, or pass a short-lived value. It is never written to the
 *   DOM while masked: not in text, attributes, `title`, `aria-label` or `data-*`.
 * - The masked view shows only the last `visible` characters (at most half the
 *   number). Revealing is an explicit toggle (a button with `aria-pressed`) and
 *   hides again after `autoHideMs` and whenever the tab is hidden.
 * - Copy is opt-in (`copyable`) and copies the FULL number, only when the reader
 *   presses the copy button. The clipboard is shared with every app and clipboard
 *   manager on the device and this component cannot clear it; copy a number only
 *   where the reader expects it.
 * - None of this is access control. Authorise on the server.
 */
import { useEffect, useRef, useState } from 'react';

import { formatAccountNumber, maskAccountNumber, normalizeAccountNumber, spokenAccountNumber, accountNumberTail } from '../banking/account.ts';
import { useClipboard } from '../use-clipboard/useClipboard.ts';

export interface AccountNumberLabels {
  /** The toggle's name; it stays the same while pressed. Default 'Show full account number'. */
  reveal: string;
  /** The copy button's name. Default 'Copy account number'. */
  copy: string;
  /** Announced after a successful copy. Default 'Account number copied'. */
  copied: string;
  /** Announced when copying fails. Default 'Could not copy'. */
  copyFailed: string;
  /** Spoken before the last digits of a masked number. Default 'ending in'. */
  endingIn: string;
  /** Spoken when there is no number. Default 'No account number'. */
  none: string;
}

export const DEFAULT_ACCOUNT_NUMBER_LABELS: AccountNumberLabels = {
  reveal: 'Show full account number',
  copy: 'Copy account number',
  copied: 'Account number copied',
  copyFailed: 'Could not copy',
  endingIn: 'ending in',
  none: 'No account number',
};

export interface AccountNumberProps {
  /** The full account number. Masked on screen; see the security notes above. */
  value: string | null | undefined;
  /** What this number is, spoken before it ("Savings account number"). Default 'Account number'. */
  label?: string;
  /** Trailing characters shown while masked. Default 4; never more than half the number. */
  visible?: number;
  /** Group size for the masked and revealed views. Default 4; 0 for none. */
  groupSize?: number;
  /** Show a toggle that reveals the full number. Default true; false makes it permanently masked. */
  revealable?: boolean;
  /** Hide again this long after revealing, in milliseconds. Default 30000; 0 or null keeps it shown until toggled. */
  autoHideMs?: number | null;
  /** Show a copy button that copies the full number when pressed. Default false. */
  copyable?: boolean;
  /** Called with true when the reader reveals and false when it hides (for audit logging). The number is not passed. */
  onRevealedChange?: (revealed: boolean) => void;
  /** Replace the words, in the reader's language. */
  labels?: Partial<AccountNumberLabels>;
  /** Extra class for layout. */
  className?: string;
  /** Sets `data-testid` on the root; the buttons get `<id>-reveal` and `<id>-copy`. */
  testId?: string;
}

const EyeIcon = ({ off }: { off: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
    <circle cx="8" cy="8" r="2" />
    {off && <path d="m2.5 13.5 11-11" />}
  </svg>
);
const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
  </svg>
);

export function AccountNumber({ value, label = 'Account number', visible = 4, groupSize = 4, revealable = true, autoHideMs = 30000, copyable = false, onRevealedChange, labels, className, testId }: AccountNumberProps) {
  const words = { ...DEFAULT_ACCOUNT_NUMBER_LABELS, ...labels };
  const [revealed, setRevealed] = useState(false);
  const clipboard = useClipboard();
  const notify = useRef(onRevealedChange);
  useEffect(() => {
    notify.current = onRevealedChange;
  });
  const full = normalizeAccountNumber(value);
  const canReveal = revealable && full.length > 0;
  const shown = canReveal && revealed;

  const change = (next: boolean) => {
    setRevealed(next);
    notify.current?.(next);
  };

  useEffect(() => {
    if (!shown) return;
    const hide = () => {
      setRevealed(false);
      notify.current?.(false);
    };
    const timer = autoHideMs && autoHideMs > 0 ? setTimeout(hide, autoHideMs) : undefined;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hide();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [shown, autoHideMs]);

  const id = (suffix: string) => (testId ? `${testId}-${suffix}` : undefined);
  if (full.length === 0) {
    return (
      <span className={`pu-acct${className ? ` ${className}` : ''}`} data-testid={testId}>
        <span aria-hidden="true">—</span>
        <span className="kit-sr">{words.none}</span>
      </span>
    );
  }
  const text = shown ? formatAccountNumber(full, { groupSize }) : maskAccountNumber(full, { visible, groupSize });
  const tail = accountNumberTail(full, visible);
  const spoken = shown ? spokenAccountNumber(full, groupSize) : tail ? `${words.endingIn} ${spokenAccountNumber(tail, 0)}` : '';
  return (
    <span className={`pu-acct${className ? ` ${className}` : ''}`} data-masked={shown ? 'false' : 'true'} data-testid={testId}>
      <span className="pu-acct-num" aria-hidden="true">{text}</span>
      <span className="kit-sr">{label}: {spoken}</span>
      {canReveal && (
        <button type="button" className="pu-acct-btn" aria-pressed={shown} aria-label={words.reveal} onClick={() => change(!shown)} data-testid={id('reveal')}>
          <EyeIcon off={shown} />
        </button>
      )}
      {copyable && (
        <button type="button" className="pu-acct-btn" aria-label={words.copy} onClick={() => { void clipboard.copy(full); }} data-testid={id('copy')}>
          <CopyIcon />
        </button>
      )}
      <span className="kit-sr" role="status">{clipboard.copied ? words.copied : clipboard.error ? words.copyFailed : ''}</span>
    </span>
  );
}
