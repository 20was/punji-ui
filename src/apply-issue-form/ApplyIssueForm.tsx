'use client';

/**
 * ApplyIssueForm: applying for a share issue in two steps. Details: the kitta (checked against the issue's
 * minimum, maximum and multiple), the exact amount to block, the bank account (ASBA), the CRN and a declaration.
 * Verify: a review of what will be sent and the transaction PIN or a one-time code. Errors are words under each
 * field, the first invalid field takes focus, and each step's heading takes focus when the step changes. It sends
 * nothing itself: `onSubmit` receives the application, and your server checks every part of it again.
 */
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';

import { accountNumberTail } from '../banking/account.ts';
import { Button } from '../button/Button.tsx';
import { Checkbox } from '../checkbox/Checkbox.tsx';
import { Field, NumberField } from '../fields/Fields.tsx';
import { formatUnits } from '../internal/dualDate.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { nepalMoneyConfig, type MoneyFormatConfig } from '../money/money.ts';
import { OtpInput } from '../otp-input/OtpInput.tsx';
import { SHARE_ISSUE_KIND_LABELS, checkKitta, issueAmount, kittaMessage, kittaRulesOf, type KittaProblem, type KittaRules, type ShareIssue } from '../share-issues/issues.ts';

export interface ApplyIssueAccount {
  /** Stable unique id. */
  id: string;
  /** The bank's display name. */
  bank: string;
  /** The account number; only the last four digits are rendered. */
  accountNumber: string;
  /** Branch name, shown under the bank. */
  branch?: string;
  /** The CRN issued for this account, to prefill the CRN field. */
  crn?: string;
}

export interface ApplyIssueSubmission {
  issueId: string;
  kitta: bigint;
  /** `kitta × pricePerUnit`, minor units. */
  amount: bigint;
  accountId: string;
  /** '' when `requireCrn` is false and the field was left empty. */
  crn: string;
  /** The PIN or one-time code as typed. Send it straight to your server; never store or log it. */
  secret: string;
}

export interface ApplyIssueFormLabels {
  detailsStep: string;
  verifyStep: string;
  /** "Step 1 of 2". */
  stepOf: (step: number, total: number) => string;
  kitta: string;
  /** Hint under the kitta field. */
  kittaHint: (rules: KittaRules) => string;
  kittaError: (problem: KittaProblem, rules: KittaRules) => string;
  amount: string;
  account: string;
  accountError: string;
  /** Spoken name of a masked account: "account ending in 4 5 0 1". */
  accountEnding: (tail: string) => string;
  crn: string;
  crnHint: string;
  crnError: string;
  declaration: string;
  declarationError: string;
  pin: string;
  otp: string;
  secretError: (length: number) => string;
  resend: string;
  review: string;
  issue: string;
  pricePerUnit: string;
  cancel: string;
  continue: string;
  back: string;
  submit: string;
}

export const DEFAULT_APPLY_ISSUE_FORM_LABELS: ApplyIssueFormLabels = {
  detailsStep: 'Application details',
  verifyStep: 'Review and confirm',
  stepOf: (step, total) => `Step ${step} of ${total}`,
  kitta: 'Units (kitta)',
  kittaHint: (r) => `${r.min} to ${r.max}${(r.multiple ?? 10n) > 1n ? `, in multiples of ${r.multiple ?? 10n}` : ''}`,
  kittaError: kittaMessage,
  amount: 'Amount to block',
  account: 'Bank account',
  accountError: 'Choose the bank account to block the amount in.',
  accountEnding: (tail) => `account ending in ${tail.split('').join(' ')}`,
  crn: 'CRN',
  crnHint: 'Customer reference number from your bank',
  crnError: 'Enter the CRN your bank gave you.',
  declaration: 'I have read the prospectus. The details above are mine and correct, and this is my only application for this issue.',
  declarationError: 'Confirm the declaration to continue.',
  pin: 'Transaction PIN',
  otp: 'Verification code',
  secretError: (n) => `Enter all ${n} digits.`,
  resend: 'Send a new code',
  review: 'You are applying for',
  issue: 'Issue',
  pricePerUnit: 'Price per unit',
  cancel: 'Cancel',
  continue: 'Continue',
  back: 'Back',
  submit: 'Apply',
};

export interface ApplyIssueFormProps {
  issue: ShareIssue;
  /** Bank accounts the amount can be blocked in. With one, it is chosen for the reader. */
  accounts: readonly ApplyIssueAccount[];
  /** Account chosen at first. */
  defaultAccountId?: string;
  /** Kitta at first (text). Default: the issue's minimum. */
  defaultKitta?: string;
  /** Ask for a CRN. Default true. */
  requireCrn?: boolean;
  /** The declaration text. Default an English line about the prospectus and a single application. */
  declaration?: ReactNode;
  /** 'pin' (default, masked boxes) or 'otp' (a code sent to the reader). */
  verification?: 'pin' | 'otp';
  /** Boxes in the PIN or code. Default 4 for a PIN, 6 for a code. */
  secretLength?: number;
  /** Hint under the PIN or code ("Sent to 98XXXXXX12"). */
  verificationHint?: ReactNode;
  /** With `verification="otp"`: shows a resend button. */
  onResend?: () => void;
  /** Receives the application. Return a promise to show the busy state until it settles. */
  onSubmit: (application: ApplyIssueSubmission) => void | Promise<void>;
  /** Busy, controlled by you (otherwise follows the promise from onSubmit). */
  submitting?: boolean;
  /** A server error, shown on the verify step and announced. */
  error?: ReactNode;
  /** Shows Cancel on the first step. */
  onCancel?: () => void;
  /** Nothing can be changed or sent (for example, the issue has closed). */
  disabled?: boolean;
  /** Money format. Default NPR in lakh/crore grouping. */
  money?: MoneyFormatConfig;
  /** Digits for units and money. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** Heading level of each step. Default 2. */
  headingLevel?: 2 | 3 | 4;
  /** Replace the words. */
  labels?: Partial<ApplyIssueFormLabels>;
  className?: string;
  /** Sets `data-testid` on the form; parts get `<id>-kitta`, `<id>-crn`, `<id>-continue`, `<id>-submit`, ... */
  testId?: string;
}

type ErrorKey = 'kitta' | 'account' | 'crn' | 'declaration';

export function ApplyIssueForm({
  issue, accounts, defaultAccountId, defaultKitta, requireCrn = true, declaration, verification = 'pin', secretLength, verificationHint, onResend, onSubmit,
  submitting: submittingProp, error, onCancel, disabled = false, money, digits = 'latn', headingLevel = 2, labels, className, testId,
}: ApplyIssueFormProps) {
  const words = { ...DEFAULT_APPLY_ISSUE_FORM_LABELS, ...labels };
  const uid = useId();
  const rules = kittaRulesOf(issue);
  const length = secretLength ?? (verification === 'pin' ? 4 : 6);
  const preset = money ?? nepalMoneyConfig({ digits });
  const firstAccount = defaultAccountId ?? (accounts.length === 1 ? accounts[0]!.id : null);
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [kitta, setKitta] = useState(defaultKitta ?? String(issue.minKitta));
  const [accountId, setAccountId] = useState<string | null>(firstAccount);
  const [crn, setCrn] = useState(accounts.find((a) => a.id === firstAccount)?.crn ?? '');
  const [crnEdited, setCrnEdited] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [secret, setSecret] = useState('');
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({});
  const [secretError, setSecretError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const submitting = submittingProp ?? busy;
  const check = checkKitta(kitta, rules);
  const amount = check.ok ? issueAmount(check.kitta, issue.pricePerUnit) : null;
  const account = accounts.find((a) => a.id === accountId) ?? null;
  const tid = (part: string) => (testId ? `${testId}-${part}` : undefined);

  const validate = (): Partial<Record<ErrorKey, string>> => {
    const next: Partial<Record<ErrorKey, string>> = {};
    if (!check.ok) next.kitta = words.kittaError(check.problem, rules);
    if (!account) next.account = words.accountError;
    if (requireCrn && crn.trim() === '') next.crn = words.crnError;
    if (!agreed) next.declaration = words.declarationError;
    return next;
  };
  const focusHeading = () => requestAnimationFrame(() => heading.current?.focus());

  const onContinue = (event: FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    const found = validate();
    setErrors(found);
    const first = (['kitta', 'account', 'crn', 'declaration'] as const).find((k) => found[k]);
    if (first) {
      form.current?.querySelector<HTMLElement>(`[data-field="${first}"] input`)?.focus();
      return;
    }
    setStep('verify');
    focusHeading();
  };

  const onConfirm = async (event: FormEvent) => {
    event.preventDefault();
    if (disabled || submitting || !check.ok || !account) return;
    if (secret.length !== length) {
      setSecretError(words.secretError(length));
      form.current?.querySelector<HTMLElement>('.pu-otp-cell')?.focus();
      return;
    }
    setSecretError(null);
    const result = onSubmit({ issueId: issue.id, kitta: check.kitta, amount: amount!, accountId: account.id, crn: crn.trim(), secret });
    if (result && typeof (result as Promise<void>).then === 'function') {
      setBusy(true);
      // A rejection is yours to report through `error`; the form only leaves its busy state.
      try { await result; } catch { /* shown through the error prop */ } finally { setBusy(false); setSecret(''); }
    }
  };

  const stepHead = (n: number, title: string) => (
    <div className="pu-apply-head">
      <p className="pu-apply-step">{words.stepOf(n, 2)}</p>
      <Heading className="pu-apply-title" ref={heading} tabIndex={-1} id={`${uid}-title`}>{title}</Heading>
      <p className="pu-apply-issue">
        <b>{issue.company}</b> · {SHARE_ISSUE_KIND_LABELS[issue.kind]}{issue.shareGroup ? ` · ${issue.shareGroup}` : ''}
      </p>
    </div>
  );

  if (step === 'verify' && check.ok && account) {
    return (
      <form ref={form} className={`pu-apply${className ? ` ${className}` : ''}`} aria-labelledby={`${uid}-title`} onSubmit={onConfirm} noValidate data-testid={testId}>
        {stepHead(2, words.verifyStep)}
        <dl className="pu-apply-review" aria-label={words.review}>
          <div><dt>{words.issue}</dt><dd>{issue.company}{issue.symbol ? ` (${issue.symbol})` : ''}</dd></div>
          <div><dt>{words.kitta}</dt><dd data-testid={tid('review-kitta')}>{formatUnits(check.kitta, digits)}</dd></div>
          <div><dt>{words.pricePerUnit}</dt><dd><MoneyDisplay value={issue.pricePerUnit} preset={preset} /></dd></div>
          <div className="pu-apply-total"><dt>{words.amount}</dt><dd data-testid={tid('review-amount')}><MoneyDisplay value={amount} preset={preset} /></dd></div>
          <div><dt>{words.account}</dt><dd>{account.bank} <span aria-hidden="true">••{accountNumberTail(account.accountNumber)}</span><span className="kit-sr">{words.accountEnding(accountNumberTail(account.accountNumber))}</span></dd></div>
          {crn.trim() && <div><dt>{words.crn}</dt><dd>{crn.trim()}</dd></div>}
        </dl>
        <OtpInput
          label={verification === 'pin' ? words.pin : words.otp}
          length={length}
          mask={verification === 'pin'}
          value={secret}
          onChange={(v) => { setSecret(v); if (secretError) setSecretError(null); }}
          hint={verificationHint}
          error={secretError ?? undefined}
          disabled={disabled || submitting}
          testId={tid('secret')}
        />
        {verification === 'otp' && onResend && (
          <div><Button variant="ghost" size="sm" onClick={onResend} disabled={submitting} testId={tid('resend')}>{words.resend}</Button></div>
        )}
        {error && <p className="pu-apply-error" role="alert" data-testid={tid('error')}>{error}</p>}
        <div className="pu-apply-actions">
          <Button variant="secondary" onClick={() => { setStep('details'); setSecret(''); setSecretError(null); focusHeading(); }} disabled={submitting} testId={tid('back')}>{words.back}</Button>
          <Button type="submit" loading={submitting} disabled={disabled} testId={tid('submit')}>{words.submit}</Button>
        </div>
      </form>
    );
  }

  return (
    <form ref={form} className={`pu-apply${className ? ` ${className}` : ''}`} aria-labelledby={`${uid}-title`} onSubmit={onContinue} noValidate data-testid={testId}>
      {stepHead(1, words.detailsStep)}
      <div data-field="kitta">
        <NumberField
          label={words.kitta}
          integer
          grouping="south-asian"
          steppers
          step={String(rules.multiple ?? 10n)}
          min={String(rules.min)}
          max={String(rules.max)}
          value={kitta}
          onChange={(v) => { setKitta(v); if (errors.kitta) setErrors({ ...errors, kitta: undefined }); }}
          hint={words.kittaHint(rules)}
          error={errors.kitta}
          disabled={disabled}
          required
          testId={tid('kitta')}
        />
      </div>
      <div className="pu-apply-amount" data-testid={tid('amount')}>
        <span>{words.amount}</span>
        <output aria-live="polite"><MoneyDisplay value={amount} preset={preset} /></output>
      </div>
      <fieldset className="pu-apply-accounts" data-field="account" aria-describedby={errors.account ? `${uid}-acct-err` : undefined} disabled={disabled}>
        <legend>{words.account}</legend>
        {accounts.map((a) => {
          const tail = accountNumberTail(a.accountNumber);
          return (
            <div key={a.id} className="pu-apply-account" data-checked={a.id === accountId ? 'true' : undefined}>
              <input
                type="radio"
                id={`${uid}-acct-${a.id}`}
                name={`${uid}-account`}
                value={a.id}
                checked={a.id === accountId}
                onChange={() => {
                  setAccountId(a.id);
                  if (!crnEdited) setCrn(a.crn ?? '');
                  if (errors.account) setErrors({ ...errors, account: undefined });
                }}
                data-testid={tid(`account-${a.id}`)}
              />
              <label htmlFor={`${uid}-acct-${a.id}`} className="pu-apply-account-t">
                {a.bank}
                <span><span aria-hidden="true">••{tail}</span><span className="kit-sr">{words.accountEnding(tail)}</span>{a.branch ? ` · ${a.branch}` : ''}</span>
              </label>
            </div>
          );
        })}
        {errors.account && <span className="pu-apply-err" id={`${uid}-acct-err`} role="alert">{errors.account}</span>}
      </fieldset>
      {requireCrn && (
        <div data-field="crn">
          <Field
            label={words.crn}
            value={crn}
            onChange={(v) => { setCrn(v); setCrnEdited(true); if (errors.crn) setErrors({ ...errors, crn: undefined }); }}
            hint={words.crnHint}
            error={errors.crn}
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            required
            testId={tid('crn')}
          />
        </div>
      )}
      <div className="pu-apply-declare" data-field="declaration" data-invalid={errors.declaration ? 'true' : undefined}>
        <Checkbox checked={agreed} onChange={(v) => { setAgreed(v); if (v && errors.declaration) setErrors({ ...errors, declaration: undefined }); }} disabled={disabled} testId={tid('declaration')}>
          {declaration ?? words.declaration}
        </Checkbox>
        {errors.declaration && <span className="pu-apply-err" role="alert">{errors.declaration}</span>}
      </div>
      <div className="pu-apply-actions">
        {onCancel && <Button variant="secondary" onClick={onCancel} testId={tid('cancel')}>{words.cancel}</Button>}
        <Button type="submit" disabled={disabled} testId={tid('continue')}>{words.continue}</Button>
      </div>
    </form>
  );
}
