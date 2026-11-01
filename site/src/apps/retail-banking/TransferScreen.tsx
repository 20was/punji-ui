import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BeneficiarySelector } from '@punji/ui/beneficiary-selector';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { CurrencyInput } from '@punji/ui/currency-input';
import { Field } from '@punji/ui/fields';
import { OtpInput } from '@punji/ui/otp-input';
import { PayeeVerification, type PayeeVerificationResult } from '@punji/ui/payee-verification';
import { TransferReview } from '@punji/ui/transfer-review';
import { PaymentReceipt } from '@punji/ui/payment-receipt';
import { PaymentTimeline } from '@punji/ui/payment-timeline';
import { Select } from '@punji/ui/select';
import { Note } from '@punji/ui/states';
import { amountInWords } from '@punji/ui/tax';
import { ScreenTitle } from '../shared/kit.tsx';
import {
  ACCOUNTS, BANK, BANKS, DAILY_LIMIT, DEMO_OTP, DIRECTORY, HOLDER, MOBILE_MASKED, PAYEES, accountById, instantAt, npr, referenceFor, rs, transferFee, transferProblem, useBank,
  type AccountId, type TransferInput,
} from './store.ts';
import { compareNames } from './payee.ts';

type Step = 'details' | 'review' | 'otp' | 'done';
const STEPS: { id: Step; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'review', label: 'Review' },
  { id: 'otp', label: 'Verify' },
  { id: 'done', label: 'Receipt' },
];
const PURPOSES = ['Personal use', 'Family support', 'Rent', 'Bill sharing', 'Education', 'Business payment'];
const MAX_TRIES = 3;

interface Target {
  name: string;
  institution: string;
  accountNumber: string;
  sameBank: boolean;
  /** What the receiving bank holds; '' when it does not take part in the name check. */
  registered: string;
}

/** Choose a payee and amount, review it with a payee check and the amount in words, verify with a one-time code, get a receipt. */
export default function TransferScreen() {
  const { state, dispatch, focusAccount } = useBank();
  const [step, setStep] = useState<Step>('details');
  const [from, setFrom] = useState<AccountId>('savings');
  const [mode, setMode] = useState<'saved' | 'new'>('saved');
  const [payeeId, setPayeeId] = useState<string | null>(null);
  const [bank, setBank] = useState(BANKS[0]!);
  const [number, setNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<bigint | null>(null);
  const [purpose, setPurpose] = useState('');
  const [remark, setRemark] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cancelled, setCancelled] = useState<string | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [check, setCheck] = useState<PayeeVerificationResult | 'error'>('checking');
  const [ack, setAck] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [done, setDone] = useState<{ input: TransferInput; reference: string; at: string; fee: bigint } | null>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  const payee = PAYEES.find((p) => p.id === payeeId) ?? null;
  const sameBank = mode === 'saved' ? (payee?.sameBank ?? false) : bank === BANK;
  const fee = amount !== null ? transferFee(amount, sameBank) : 0n;

  // Move focus to the step's heading when the step changes (not on first open), so a keyboard or screen reader user
  // lands on it.
  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    const heading = headingRef.current?.querySelector<HTMLElement>('h2, h3');
    if (!heading) return;
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: false });
  }, [step]);

  // The receiving bank's name check: a short wait, then its answer (an error when offline).
  const checkTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(checkTimer.current), []);
  const runCheck = (t: Target) => {
    clearTimeout(checkTimer.current);
    setCheck('checking');
    setAck(false);
    checkTimer.current = setTimeout(() => {
      if (state.offline) setCheck('error');
      else if (!t.registered) setCheck('unavailable');
      else setCheck(compareNames(t.name, t.registered));
    }, 700);
  };

  // The resend cooldown counts down once a second.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const continueToReview = (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    let t: Target | null = null;
    if (mode === 'saved') {
      if (!payee) next.payee = 'Choose who to pay.';
      else t = { name: payee.name, institution: payee.institution ?? '', accountNumber: payee.accountNumber, sameBank: payee.sameBank, registered: payee.registered };
    } else {
      const digits = number.replace(/\D/g, '');
      if (digits.length !== 14) next.number = 'Account numbers here have 14 digits.';
      if (newName.trim().length < 3) next.name = 'Enter the name on the account, as the payee gave it.';
      if (!next.number && !next.name) t = { name: newName.trim(), institution: bank, accountNumber: digits, sameBank: bank === BANK, registered: DIRECTORY[digits] ?? '' };
    }
    const problem = transferProblem(state, from, amount, sameBank);
    if (problem) next.amount = problem;
    if (!purpose) next.purpose = 'Choose a purpose; Nepal Rastra Bank asks banks to record it.';
    setErrors(next);
    if (Object.keys(next).length > 0 || !t) return;
    setCancelled(null);
    setTarget(t);
    runCheck(t);
    setStep('review');
  };

  const toOtp = () => {
    setOtp('');
    setOtpError(null);
    setTries(0);
    setCooldown(30);
    setStep('otp');
  };

  const verify = (code: string) => {
    if (!target || amount === null) return;
    if (state.offline) {
      setOtpError('You are offline. Nothing was sent; try again when you are back online.');
      return;
    }
    if (code !== DEMO_OTP) {
      const used = tries + 1;
      setTries(used);
      setOtp('');
      if (used >= MAX_TRIES) {
        setCancelled('Too many wrong codes, so the transfer was cancelled. Nothing was sent.');
        setStep('details');
        return;
      }
      setOtpError(`That code is not right. ${MAX_TRIES - used} ${MAX_TRIES - used === 1 ? 'try' : 'tries'} left.`);
      return;
    }
    const problem = transferProblem(state, from, amount, target.sameBank);
    if (problem) {
      setCancelled(`${problem} Nothing was sent.`);
      setStep('details');
      return;
    }
    const input: TransferInput = { from, payeeName: target.name, institution: target.institution, accountNumber: target.accountNumber, sameBank: target.sameBank, amount, remark: remark.trim() };
    setDone({ input, reference: referenceFor(state.counter), at: instantAt(state.clock + 1), fee: transferFee(amount, target.sameBank) });
    dispatch({ type: 'transfer', input });
    setStep('done');
  };

  const restart = () => {
    setStep('details');
    setPayeeId(null);
    setNumber('');
    setNewName('');
    setAmountText('');
    setAmount(null);
    setRemark('');
    setPurpose('');
    setErrors({});
    setTarget(null);
    setDone(null);
  };

  const account = accountById(from);
  const index = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="app-stack rb-transfer">
      <ScreenTitle>Transfer</ScreenTitle>
      <ol className="rb-steps" aria-label="Transfer steps">
        {STEPS.map((s, i) => (
          <li key={s.id} data-state={i < index ? 'done' : i === index ? 'current' : 'upcoming'} aria-current={i === index ? 'step' : undefined}>
            <span className="rb-steps-n" aria-hidden="true">{i < index ? '✓' : i + 1}</span>
            <span>
              {s.label}
              {i < index && <span className="kit-sr"> (done)</span>}
            </span>
          </li>
        ))}
      </ol>

      <div ref={headingRef} className="rb-transfer-body">
        {step === 'details' && (
          <Card title="Who and how much" headingLevel={3}>
            {cancelled && (
              <div className="rb-gap">
                <Note tone="error">{cancelled}</Note>
              </div>
            )}
            <form className="rb-form" onSubmit={continueToReview} noValidate>
              <Select
                label="From"
                labelPlacement="above"
                value={from}
                onChange={setFrom}
                options={ACCOUNTS.map((a) => ({ value: a.id, label: `${a.name} ··${a.number.slice(-4)} · ${state.hideBalances ? 'balance hidden' : rs(state.balances[a.id])}` }))}
                block
                testId="rb-from"
              />
              <SegmentedControl
                options={[
                  { value: 'saved', label: 'Saved payee' },
                  { value: 'new', label: 'New account' },
                ]}
                value={mode}
                onChange={setMode}
                prefix="rb-mode"
                label="Pay"
                fill
                testId="rb-mode"
              />
              {mode === 'saved' ? (
                <BeneficiarySelector beneficiaries={PAYEES} value={payeeId} onChange={setPayeeId} label="Pay to" error={errors.payee} testId="rb-payee" />
              ) : (
                <>
                  <Select label="Bank" labelPlacement="above" value={bank} onChange={setBank} options={BANKS.map((b) => ({ value: b, label: b }))} block testId="rb-bank" />
                  <Field
                    label="Account number"
                    value={number}
                    onChange={(v) => setNumber(v.replace(/[^\d ]/g, '').slice(0, 20))}
                    inputMode="numeric"
                    autoComplete="off"
                    hint="14 digits. Try 00101017509999 for a name the bank knows."
                    error={errors.number}
                    testId="rb-number"
                  />
                  <Field label="Name on the account" value={newName} onChange={setNewName} autoComplete="off" error={errors.name} testId="rb-name" />
                </>
              )}
              <CurrencyInput
                label="Amount"
                preset={npr}
                value={amountText}
                onValueChange={(c) => {
                  setAmountText(c.value);
                  setAmount(c.minorUnits);
                }}
                hint={
                  state.hideBalances
                    ? `Fee ${rs(fee)}. Today's limit left: ${rs(DAILY_LIMIT - state.transferredToday)}.`
                    : `Available ${rs(state.balances[from])}. Fee ${rs(fee)}${sameBank ? ' (same bank)' : ''}. Today's limit left: ${rs(DAILY_LIMIT - state.transferredToday)}.`
                }
                error={errors.amount}
                testId="rb-amount"
              />
              <Select
                label="Purpose"
                labelPlacement="above"
                value={purpose}
                onChange={setPurpose}
                options={[{ value: '', label: 'Choose a purpose', disabled: true }, ...PURPOSES.map((p) => ({ value: p, label: p }))]}
                block
                testId="rb-purpose"
              />
              {errors.purpose && (
                <p className="rb-error" role="alert">
                  {errors.purpose}
                </p>
              )}
              <Field label="Remark (optional)" value={remark} onChange={(v) => setRemark(v.slice(0, 50))} hint={`${50 - remark.length} characters left. The payee sees it.`} testId="rb-remark" />
              <Button type="submit" size="lg" block testId="rb-continue">
                Continue to review
              </Button>
            </form>
          </Card>
        )}

        {step === 'review' && target && amount !== null && (
          <div className="app-stack">
            <TransferReview
              amount={amount}
              currency="NPR"
              money={npr}
              words={amountInWords(amount)}
              recipient={{ name: target.name, account: `··${target.accountNumber.slice(-4)}`, institution: target.institution }}
              knownPayees={PAYEES.map((p) => p.name)}
              fee={fee}
              details={[
                { id: 'from', label: 'From', value: `${account.name} ··${account.number.slice(-4)}` },
                { id: 'after', label: 'Balance after', value: state.hideBalances ? 'Hidden' : rs(state.balances[from] - amount - fee) },
                { id: 'purpose', label: 'Purpose', value: purpose },
                ...(remark.trim() ? [{ id: 'remark', label: 'Remark', value: remark.trim() }] : []),
              ]}
              verification={
                check === 'error' ? (
                  <div className="rb-check-error" data-testid="rb-payee-check" data-result="error">
                    <Note tone="error">Could not check the name on the account: you are offline. Try again before you pay.</Note>
                    <Button size="sm" variant="secondary" onClick={() => runCheck(target)}>
                      Try again
                    </Button>
                  </div>
                ) : (
                  <PayeeVerification
                    result={check}
                    enteredName={target.name}
                    accountName={target.registered || undefined}
                    onUseAccountName={(name) => {
                      const next = { ...target, name };
                      setTarget(next);
                      runCheck(next);
                    }}
                    onEdit={() => setStep('details')}
                    onProceed={() => setAck(true)}
                    testId="rb-payee-check"
                  />
                )
              }
              confirm={
                <Button size="lg" onClick={toOtp} disabled={!(check === 'match' || (ack && (check === 'no-match' || check === 'unavailable')))} testId="rb-confirm">
                  Confirm and send {rs(amount + fee)}
                </Button>
              }
              onEdit={() => setStep('details')}
              testId="rb-review"
            />
            <Note>
              {check === 'close-match'
                ? 'Use the name on the account, or change the details, before you send.'
                : ack
                  ? 'You chose to continue without a matching name.'
                  : `Nothing leaves your account until you enter the code we send to ${MOBILE_MASKED}.`}
            </Note>
          </div>
        )}

        {step === 'otp' && target && amount !== null && (
          <Card title="Enter the code" headingLevel={3}>
            <div className="app-stack">
              <p className="app-muted">
                Sending <strong>{rs(amount + fee)}</strong> to {target.name}.
              </p>
              <OtpInput
                label="6-digit code"
                value={otp}
                onChange={(v) => {
                  setOtp(v);
                  if (otpError && v.length > 0) setOtpError(null);
                }}
                onComplete={verify}
                hint={`Sent to ${MOBILE_MASKED}. In this demo the code is ${DEMO_OTP}.`}
                error={otpError ?? undefined}
                testId="rb-otp"
              />
              <div className="rb-buttons">
                <Button variant="ghost" onClick={() => setStep('review')}>
                  Back
                </Button>
                <Button variant="secondary" disabled={cooldown > 0} onClick={() => setCooldown(30)} testId="rb-resend">
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </Button>
                <Button onClick={() => verify(otp)} disabled={otp.length < 6} testId="rb-verify">
                  Verify and send
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === 'done' && done && (
          <div className="app-grid is-halves">
            <div className="app-stack">
              <PaymentReceipt
                amount={done.input.amount}
                fees={done.fee}
                from={{ name: HOLDER, institution: `${BANK}, ${accountById(done.input.from).name}`, accountNumber: accountById(done.input.from).number }}
                to={{ name: done.input.payeeName, institution: done.input.institution, accountNumber: done.input.accountNumber }}
                reference={done.reference}
                timestamp={done.at}
                status="completed"
                note={done.input.remark || undefined}
                printable
                headingLevel={3}
                testId="rb-receipt"
              />
            </div>
            <div className="app-stack">
              <Card title="What happened" headingLevel={3}>
                <PaymentTimeline
                  label="Transfer progress"
                  steps={[
                    { id: 'start', label: 'Transfer started', state: 'complete', timestamp: done.at },
                    { id: 'otp', label: 'Code verified', state: 'complete', timestamp: done.at },
                    { id: 'debit', label: `Debited from ${accountById(done.input.from).name}`, state: 'complete', timestamp: done.at, detail: rs(done.input.amount + done.fee) },
                    done.input.sameBank
                      ? { id: 'credit', label: `Credited to ${done.input.payeeName}`, state: 'complete', timestamp: done.at, detail: 'Inside Punji Bank, instantly' }
                      : { id: 'credit', label: `Sent to ${done.input.institution} via ConnectIPS`, state: 'complete', timestamp: done.at, detail: 'Credited in real time' },
                  ]}
                />
              </Card>
              <div className="rb-buttons">
                <Button onClick={restart} testId="rb-another">
                  Another transfer
                </Button>
                <Button variant="secondary" onClick={() => focusAccount(done.input.from)}>
                  View statement
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
