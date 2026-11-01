'use client';

/**
 * PayeeCheck (design.punji.app/components/payee-check): the answer to "is this the person I mean to pay?" shown
 * before money moves, in the manner of the UK's Confirmation of Payee and the name lookup Nepali banks run on a
 * ConnectIPS or wallet transfer. The receiving bank compares the name the payer typed with the name on the account;
 * the result is a match, a close match (with the name the bank holds, so the payer can use it), no match, or no
 * answer. For anything but a match the payer has to say they understand the risk before they can go on.
 *
 * The component decides nothing about the account: give it the result your server returned. `comparePayeeNames` is a
 * reference matcher for demos and tests (case, punctuation, honorifics, word order and initials), not a substitute for
 * the bank's own check.
 */
import { useId, type ReactNode } from 'react';

import { accountNumberTail, spokenAccountNumber } from '../banking/account.ts';
import { Button } from '../button/Button.tsx';
import { Checkbox } from '../checkbox/Checkbox.tsx';
import { ToneIcon } from '../states/States.tsx';

/** What the name check said. `checking` while the request is out; `error` when it failed (retry); `unavailable` when the receiving bank does not take part. */
export type PayeeCheckResult = 'match' | 'close' | 'no-match' | 'unavailable' | 'checking' | 'error';

export interface PayeeCheckLabels {
  /** Title for a match. Default 'Name matches'. */
  match: string;
  /** Line under a match. */
  matchBody: string;
  /** Title for a close match. Default 'Name is a close match'. */
  close: string;
  /** Line under a close match, given the registered name. */
  closeBody: (registered: string) => string;
  /** Title for no match. Default 'Name does not match'. */
  noMatch: string;
  /** Line under no match: the risk of paying someone else. */
  noMatchBody: string;
  /** Title when the receiving bank cannot check. Default 'Name check not available'. */
  unavailable: string;
  /** Line under unavailable. */
  unavailableBody: string;
  /** Title while the check is running. */
  checking: string;
  /** Title when the check failed. Default 'Could not check the name'. */
  error: string;
  /** Line under an error. */
  errorBody: string;
  /** The button that takes the registered name, given that name. Default 'Use {name}'. */
  takeName: (registered: string) => string;
  /** The button that goes back to the details. Default 'Change details'. */
  edit: string;
  /** The retry button. Default 'Try again'. */
  retry: string;
  /** The risk acknowledgement checkbox. */
  acknowledge: string;
  /** Spoken before the account's last digits. Default 'account ending in'. */
  endingIn: string;
}

export const DEFAULT_PAYEE_CHECK_LABELS: PayeeCheckLabels = {
  match: 'Name matches',
  matchBody: 'The name you gave matches the name on the account.',
  close: 'Name is a close match',
  closeBody: (registered) => `The account is in the name of ${registered}. Check this is who you mean to pay.`,
  noMatch: 'Name does not match',
  noMatchBody: 'The name you gave is not the name on this account. If you pay it, the money may go to someone else and you may not get it back.',
  unavailable: 'Name check not available',
  unavailableBody: 'The receiving bank could not confirm the name. Make sure the account number came from someone you trust.',
  checking: 'Checking the name on the account…',
  error: 'Could not check the name',
  errorBody: 'The name check did not answer. Try again before you pay.',
  takeName: (registered) => `Use ${registered}`,
  edit: 'Change details',
  retry: 'Try again',
  acknowledge: 'I understand the risk and want to continue',
  endingIn: 'account ending in',
};

export interface PayeeCheckProps {
  /** The result your server returned for this payee. */
  result: PayeeCheckResult;
  /** The name the payer typed or saved. Shown as plain text. */
  enteredName: string;
  /** The name the receiving bank holds. Shown only for a close match, as Confirmation of Payee does. */
  registeredName?: string;
  /** The receiving bank or wallet. */
  institution?: string;
  /** The account number; only its last four characters are shown. */
  accountNumber?: string;
  /** For a close match: replace the entered name with the registered one (and usually re-run the check). */
  onUseRegisteredName?: () => void;
  /** Go back and change the payee or the account number. */
  onEdit?: () => void;
  /** Run the check again after an error. Without it no button is drawn. */
  onRetry?: () => void;
  /** Whether the payer ticked "I understand the risk" (close match, no match, unavailable). */
  acknowledged?: boolean;
  /** Called when the payer ticks or clears the acknowledgement. Without it no checkbox is drawn. */
  onAcknowledgedChange?: (acknowledged: boolean) => void;
  /** Heading level of the result title. Default 3. */
  headingLevel?: 2 | 3 | 4;
  /** Replace the words, in the reader's language. */
  labels?: Partial<PayeeCheckLabels>;
  /** Extra class for layout. */
  className?: string;
  /** Sets `data-testid` on the root; the buttons get `-use`, `-edit`, `-retry` and the checkbox `-ack`. */
  testId?: string;
}

/** Whether the payer may go on: a match always; a close match, no match or no answer only once acknowledged; never while checking or after an error. */
export function payeeCheckAllowsProceed(result: PayeeCheckResult, acknowledged = false): boolean {
  if (result === 'match') return true;
  if (result === 'close' || result === 'no-match' || result === 'unavailable') return acknowledged;
  return false;
}

const sortedWords = (w: readonly string[]) => w.toSorted().join(' ');

const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'shri', 'shree', 'sri', 'smt', 'sushri', 'km', 'late', 'ji']);

/** Lower case, letters and digits only, honorifics dropped, as words. */
export function payeeNameWords(name: string): string[] {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !HONORIFICS.has(w));
}

/** Edit distance between two short strings (names), capped work: O(a·b) on at most 64 characters each. */
function distance(a: string, b: string): number {
  const x = a.slice(0, 64);
  const y = b.slice(0, 64);
  let prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= y.length; j += 1) cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[y.length]!;
}

/**
 * A reference name matcher: `match` when the words agree (any order, any case, honorifics and punctuation ignored);
 * `close` when they agree but for initials ("H. B. Khatri" for "Hari Bahadur Khatri"), a dropped middle name, or a
 * small misspelling (at most one edit in five letters); otherwise `no-match`. Your bank's check decides; this is for
 * demos, tests and a hint while typing.
 */
export function comparePayeeNames(entered: string, registered: string): 'match' | 'close' | 'no-match' {
  const a = payeeNameWords(entered);
  const b = payeeNameWords(registered);
  if (a.length === 0 || b.length === 0) return 'no-match';
  if (sortedWords(a) === sortedWords(b)) return 'match';
  // Same surname, and every other entered word is a full word or an initial of the registered words, in order.
  if (a.at(-1) === b.at(-1)) {
    const rest = b.slice(0, -1);
    let j = 0;
    let fits = true;
    for (const word of a.slice(0, -1)) {
      while (j < rest.length && !(rest[j] === word || (word.length === 1 && rest[j]!.startsWith(word)))) j += 1;
      if (j === rest.length) {
        fits = false;
        break;
      }
      j += 1;
    }
    if (fits) return 'close';
  }
  const x = a.join(' ');
  const y = b.join(' ');
  return distance(x, y) * 5 <= Math.max(x.length, y.length) ? 'close' : 'no-match';
}

const TONE: Record<PayeeCheckResult, 'success' | 'warn' | 'error' | null> = { match: 'success', close: 'warn', 'no-match': 'error', unavailable: 'warn', error: 'error', checking: null };

export function PayeeCheck({
  result, enteredName, registeredName, institution, accountNumber, onUseRegisteredName, onEdit, onRetry, acknowledged = false, onAcknowledgedChange,
  headingLevel = 3, labels, className, testId,
}: PayeeCheckProps) {
  const words = { ...DEFAULT_PAYEE_CHECK_LABELS, ...labels };
  const uid = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const id = (suffix: string) => (testId ? `${testId}-${suffix}` : undefined);
  const tone = TONE[result];
  const title = { match: words.match, close: words.close, 'no-match': words.noMatch, unavailable: words.unavailable, checking: words.checking, error: words.error }[result];
  const body =
    result === 'match' ? words.matchBody
    : result === 'close' ? words.closeBody(registeredName ?? '—')
    : result === 'no-match' ? words.noMatchBody
    : result === 'unavailable' ? words.unavailableBody
    : result === 'error' ? words.errorBody
    : null;
  const tail = accountNumber ? accountNumberTail(accountNumber, 4) : '';
  const risky = result === 'close' || result === 'no-match' || result === 'unavailable';
  const actions: ReactNode[] = [];
  if (result === 'close' && registeredName && onUseRegisteredName)
    actions.push(<Button key="use" size="sm" variant="secondary" onClick={onUseRegisteredName} testId={id('use')}>{words.takeName(registeredName)}</Button>);
  if (result === 'error' && onRetry) actions.push(<Button key="retry" size="sm" variant="secondary" onClick={onRetry} testId={id('retry')}>{words.retry}</Button>);
  if (result !== 'match' && result !== 'checking' && onEdit) actions.push(<Button key="edit" size="sm" variant="ghost" onClick={onEdit} testId={id('edit')}>{words.edit}</Button>);

  return (
    <section className={`pu-payee is-${result}${className ? ` ${className}` : ''}`} aria-labelledby={`${uid}-t`} aria-busy={result === 'checking' || undefined} data-result={result} data-testid={testId}>
      <div className="pu-payee-head">
        <span className="pu-payee-mark" aria-hidden="true">
          {tone ? <ToneIcon tone={tone} /> : <span className="pu-payee-spin" />}
        </span>
        {/* A live region, so a screen reader hears the answer arrive after "Checking". */}
        <div className="pu-payee-text" role="status" aria-live="polite">
          <Heading className="pu-payee-title" id={`${uid}-t`}>{title}</Heading>
          <p className="pu-payee-who">
            <span className="pu-payee-name">{enteredName}</span>
            {(institution || tail) && (
              <span className="pu-payee-sub">
                {institution}
                {institution && tail ? ' · ' : ''}
                {tail && (
                  <>
                    <span aria-hidden="true">••{tail}</span>
                    <span className="kit-sr">{words.endingIn} {spokenAccountNumber(tail, 0)}</span>
                  </>
                )}
              </span>
            )}
          </p>
        </div>
      </div>
      {body && <p className="pu-payee-body">{body}</p>}
      {result === 'close' && registeredName && (
        <p className="pu-payee-registered" data-testid={id('registered')}>
          <span className="pu-payee-registered-name">{registeredName}</span>
        </p>
      )}
      {risky && onAcknowledgedChange && (
        <div className="pu-payee-ack">
          <Checkbox checked={acknowledged} onChange={onAcknowledgedChange} testId={id('ack')}>{words.acknowledge}</Checkbox>
        </div>
      )}
      {actions.length > 0 && <div className="pu-payee-actions">{actions}</div>}
    </section>
  );
}
