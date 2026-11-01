'use client';

/**
 * PayeeVerification: the result of a name check against the account (UK Confirmation of Payee, EU Verification of
 * Payee, or your bank's own lookup) shown the way those schemes intend. A match is quiet. A close match shows the name
 * the bank holds and offers to use it. No match says plainly that the money may go to someone else and asks for an
 * explicit acknowledgement before continuing. Unavailable says the name could not be checked, which is not a match.
 *
 * The component only displays a result your server got from the scheme; it does no matching itself. Names are
 * shown inside <bdi> with bidi controls and invisible characters removed (`detectSpoofing`), and a name that tries
 * those tricks is called out.
 */
import { useId, useState, type ReactNode } from 'react';

import { Checkbox } from '../checkbox/Checkbox.tsx';
import { detectSpoofing } from '../trust/spoofing.ts';

export type PayeeVerificationResult = 'checking' | 'match' | 'close-match' | 'no-match' | 'unavailable';

export interface PayeeVerificationLabels {
  /** While the check runs. */
  checking?: string;
  /** Title for a match. */
  match?: string;
  /** Title for a close match. */
  closeMatch?: string;
  /** Sentence with the name the bank holds. */
  closeMatchBody?: (accountName: string) => string;
  /** Title for no match. */
  noMatch?: string;
  /** What can happen if the person continues. */
  noMatchBody?: string;
  /** Title when the name could not be checked. */
  unavailable?: string;
  /** What "could not check" means. */
  unavailableBody?: string;
  /** "You entered". */
  entered?: string;
  /** "Name on the account". */
  accountName?: string;
  /** Close match button that takes the name the bank holds. */
  useAccountName?: string;
  /** Button back to the details. */
  edit?: string;
  /** Checkbox before continuing after no match or unavailable. */
  acknowledge?: string;
  /** Continue button after the acknowledgement. */
  proceed?: string;
  /** Shown when the name itself carries hidden characters or look-alike letters. */
  suspicious?: string;
}

export interface PayeeVerificationProps {
  /** The scheme's answer for this payee. */
  result: PayeeVerificationResult;
  /** The name the person typed. */
  enteredName: string;
  /** The name the bank holds, when the scheme returns it (close match, sometimes match). */
  accountName?: string;
  /** Close match: replace the typed name with the account name. */
  onUseAccountName?: (accountName: string) => void;
  /** Go back and change the details. */
  onEdit?: () => void;
  /** No match or unavailable: continue anyway, after the acknowledgement. Leave it out to block the payment. */
  onProceed?: () => void;
  /** Words, in the reader's language. */
  labels?: PayeeVerificationLabels;
  /** Extra class on the root element (layout only). */
  className?: string;
  /** Becomes data-testid on the root. */
  testId?: string;
}

const DEFAULTS: Required<PayeeVerificationLabels> = {
  checking: 'Checking the name on the account…',
  match: 'The name matches the account.',
  closeMatch: 'The name is a close match.',
  closeMatchBody: (name) => `The account is in the name "${name}". Check this is who you mean to pay.`,
  noMatch: 'The name does not match the account.',
  noMatchBody: 'If you continue, the money may go to someone else and you may not get it back. Check the details with the person you are paying, using contact details you already trust.',
  unavailable: 'We could not check the name.',
  unavailableBody: 'The receiving bank did not confirm who holds this account. Only continue if you are sure the details are right.',
  entered: 'You entered',
  accountName: 'Name on the account',
  useAccountName: 'Use this name',
  edit: 'Change details',
  acknowledge: 'I understand the money may go to the wrong person',
  proceed: 'Continue anyway',
  suspicious: 'This name contains hidden or look-alike characters.',
};

const ICONS: Record<Exclude<PayeeVerificationResult, 'checking'>, ReactNode> = {
  match: <path d="M4 10.5 8 14.5 16 6" />,
  'close-match': <><path d="M10 6v5" /><path d="M10 14.2v.1" /></>,
  'no-match': <><path d="M6 6l8 8" /><path d="M14 6l-8 8" /></>,
  unavailable: <><path d="M10 6v5" /><path d="M10 14.2v.1" /></>,
};

function Name({ name }: { name: string }) {
  return <bdi className="pu-payee-name">{detectSpoofing(name).display}</bdi>;
}

export function PayeeVerification({ result, enteredName, accountName, onUseAccountName, onEdit, onProceed, labels = {}, className, testId }: PayeeVerificationProps) {
  const words = { ...DEFAULTS, ...labels };
  const id = useId();
  const [acknowledged, setAcknowledged] = useState(false);
  const shown = accountName ? detectSpoofing(accountName) : null;
  const suspicious = detectSpoofing(enteredName).risk === 'high' || shown?.risk === 'high';

  if (result === 'checking') {
    return (
      <div className={`pu-payee${className ? ` ${className}` : ''}`} data-result="checking" role="status" data-testid={testId}>
        <span className="kit-spin" aria-hidden="true" />
        <span className="pu-payee-title">{words.checking}</span>
      </div>
    );
  }

  const title = result === 'match' ? words.match : result === 'close-match' ? words.closeMatch : result === 'no-match' ? words.noMatch : words.unavailable;
  const body = result === 'close-match' && shown ? words.closeMatchBody(shown.display) : result === 'no-match' ? words.noMatchBody : result === 'unavailable' ? words.unavailableBody : null;
  const risky = result === 'no-match' || result === 'unavailable';

  return (
    <section className={`pu-payee${className ? ` ${className}` : ''}`} data-result={result} aria-labelledby={`${id}-t`} data-testid={testId}>
      <div className="pu-payee-head" role={result === 'match' ? 'status' : 'alert'}>
        <svg className="pu-payee-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <circle cx="10" cy="10" r="9" />
          {ICONS[result]}
        </svg>
        <span className="pu-payee-title" id={`${id}-t`}>{title}</span>
      </div>
      {body && <p className="pu-payee-body">{body}</p>}
      {suspicious && <p className="pu-payee-body pu-payee-suspicious">{words.suspicious}</p>}
      <dl className="pu-payee-names">
        <div><dt>{words.entered}</dt><dd><Name name={enteredName} /></dd></div>
        {accountName && result !== 'match' && <div><dt>{words.accountName}</dt><dd><Name name={accountName} /></dd></div>}
      </dl>
      {risky && onProceed && (
        <Checkbox checked={acknowledged} onChange={setAcknowledged}>{words.acknowledge}</Checkbox>
      )}
      {(onEdit || (result === 'close-match' && accountName && onUseAccountName) || (risky && onProceed)) && (
        <div className="pu-payee-actions">
          {result === 'close-match' && accountName && onUseAccountName && (
            <button type="button" className="kit-btn primary" onClick={() => onUseAccountName(accountName)}>{words.useAccountName}</button>
          )}
          {onEdit && <button type="button" className={`kit-btn ${risky ? 'primary' : 'secondary'}`} onClick={onEdit}>{words.edit}</button>}
          {risky && onProceed && (
            <button type="button" className="kit-btn secondary" aria-disabled={!acknowledged || undefined} onClick={() => { if (acknowledged) onProceed(); }}>{words.proceed}</button>
          )}
        </div>
      )}
    </section>
  );
}
