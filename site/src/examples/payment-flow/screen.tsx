import { useState } from 'react';
import { AccountNumber } from '@punji/ui/account-number';
import { BankAccountCard } from '@punji/ui/bank-account-card';
import { BeneficiarySelector } from '@punji/ui/beneficiary-selector';
import { Breakdown, BreakdownRow } from '@punji/ui/breakdown';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { CurrencyInput } from '@punji/ui/currency-input';
import { Field } from '@punji/ui/fields';
import { InlineState } from '@punji/ui/inline-state';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { PaymentReceipt } from '@punji/ui/payment-receipt';
import { PaymentTimeline } from '@punji/ui/payment-timeline';
import { StepList } from '@punji/ui/step-list';
import { accounts, beneficiaries, qrPlaceholderPath, receipt, timelineCompleted } from '../../sample.ts';
import './screen.css';

// Send money in four steps: payee, amount, review, receipt. Nothing is submitted: "Send" only moves to the receipt,
// built from the fixture's completed transfer. Your server confirms the payee, the fee and the transfer.
const npr = nepalMoneyConfig();
const FEE = 2_500n; // Rs 25.00, illustrative
const BALANCE = accounts.savings.balance;
const STEPS = [
  { title: 'Payee', body: 'Saved or recent' },
  { title: 'Amount', body: 'And a remark' },
  { title: 'Review', body: 'Check before sending' },
  { title: 'Receipt', body: 'Sent and recorded' },
];

export default function Example() {
  const [step, setStep] = useState(0);
  const [payee, setPayee] = useState<string | null>('b1');
  const [amount, setAmount] = useState('20000');
  const [minor, setMinor] = useState<bigint | null>(2_000_000n);
  const [remark, setRemark] = useState('Dashain gift');
  const to = beneficiaries.find((b) => b.id === payee);
  const over = minor !== null && minor + FEE > BALANCE;
  const amountError = minor === null ? undefined : minor <= 0n ? 'Enter an amount above zero.' : over ? 'More than the available balance, after the fee.' : undefined;
  const canContinue = step === 0 ? Boolean(to) : step === 1 ? minor !== null && !amountError : true;

  return (
    <div className="sc-pay">
      <div className="sc-pay-in">
        <div className="sc-pay-steps">
          <StepList title="Send money" eyebrow={`Step ${step + 1} of 4`} steps={STEPS} current={step} layout="rows" tone="plain" headingLevel={3} />
          <BankAccountCard {...accounts.savings} accountType="Paying from" headingLevel={4} />
        </div>

        <div className="sc-pay-panel">
          {step === 0 && (
            <Card title="Who are you paying?" description="From NIC Asia Bank savings" headingLevel={3}>
              <div className="sc-pay-stack">
                <BeneficiarySelector label="Pay to" beneficiaries={beneficiaries} value={payee} onChange={setPayee} />
              </div>
            </Card>
          )}

          {step === 1 && to && (
            <Card title={`How much to ${to.name}?`} description={`To ${to.institution}, from NIC Asia Bank savings`} headingLevel={3}>
              <div className="sc-pay-stack">
                <CurrencyInput
                  label="Amount"
                  preset={npr}
                  value={amount}
                  onValueChange={(change) => {
                    setAmount(change.value);
                    setMinor(change.minorUnits);
                  }}
                  hint={
                    <>
                      Available: <MoneyDisplay value={BALANCE} preset={npr} />
                    </>
                  }
                  error={amountError}
                />
                <Field label="Remark" value={remark} onChange={setRemark} hint="Shown on both statements" />
              </div>
            </Card>
          )}

          {step === 2 && to && minor !== null && (
            <Card title="Check before you send" description="You can still change anything" headingLevel={3}>
              <div className="sc-pay-stack">
                <div className="sc-pay-parties">
                  <div>
                    <p className="sc-pay-label">From</p>
                    <p className="sc-pay-name">{accounts.savings.holder}</p>
                    <p className="sc-pay-muted">{accounts.savings.institution}</p>
                    <AccountNumber value={accounts.savings.accountNumber} />
                  </div>
                  <div>
                    <p className="sc-pay-label">To</p>
                    <p className="sc-pay-name">{to.name}</p>
                    <p className="sc-pay-muted">{to.institution}</p>
                    <AccountNumber value={to.accountNumber} />
                  </div>
                </div>
                <Breakdown>
                  <BreakdownRow label="Amount" value={<MoneyDisplay value={minor} preset={npr} />} />
                  <BreakdownRow label="Transfer fee" note="Illustrative; your bank sets it" value={<MoneyDisplay value={FEE} preset={npr} />} />
                  <BreakdownRow label="Total from your account" total value={<MoneyDisplay value={minor + FEE} preset={npr} />} />
                </Breakdown>
                <InlineState icon="info" layout="row" role="status" title={`Remark: ${remark || 'none'}`} />
              </div>
            </Card>
          )}

          {step === 3 && (
            <div className="sc-pay-done">
              <PaymentReceipt
                {...receipt}
                amount={minor ?? receipt.amount}
                fees={FEE}
                to={{ name: to?.name ?? receipt.to.name, institution: to?.institution ?? receipt.to.institution, accountNumber: to?.accountNumber ?? receipt.to.accountNumber }}
                note={remark || undefined}
                timeZone="Asia/Kathmandu"
                qr={
                  <svg width="120" height="120" viewBox="0 0 20 20" role="img" aria-label="Payment QR code (placeholder)" fill="currentColor">
                    <path d={qrPlaceholderPath} />
                  </svg>
                }
              />
              <Card title="Progress" description="Times in Nepal time" headingLevel={3}>
                <PaymentTimeline steps={timelineCompleted} label="Transfer progress" timeZone="Asia/Kathmandu" />
              </Card>
            </div>
          )}

          <div className="sc-pay-nav">
            {step > 0 && step < 3 && (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {step < 2 && (
              <Button disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
                Continue
              </Button>
            )}
            {step === 2 && <Button onClick={() => setStep(3)}>Send {minor !== null && <MoneyDisplay value={minor + FEE} preset={npr} />}</Button>}
            {step === 3 && (
              <Button variant="secondary" onClick={() => setStep(0)}>
                Send another
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
