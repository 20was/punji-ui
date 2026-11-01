import { useState, type FormEvent } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { CurrencyInput } from '@punji/ui/currency-input';
import { DocumentUpload, type DocumentSlot } from '@punji/ui/document-upload';
import { Field } from '@punji/ui/fields';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PaymentTimeline } from '@punji/ui/payment-timeline';
import { Select } from '@punji/ui/select';
import { EmptyState, Note } from '@punji/ui/states';
import { StatusPill } from '@punji/ui/status-pill';
import { SESSION_DATE } from '../shared/sim.ts';
import { claimSteps } from './data.ts';
import { dateText } from './bits.tsx';
import { npr, rs, useInvest } from './store.ts';

const REASONS: Record<'health' | 'life', string[]> = {
  health: ['Hospitalisation', 'Day-care procedure', 'Accident treatment'],
  life: ['Critical illness rider', 'Accidental disability rider'],
};
const SLOTS: Record<'health' | 'life', DocumentSlot[]> = {
  health: [
    { id: 'discharge', label: 'Discharge summary', hint: 'Signed by the hospital', accept: ['image/jpeg', 'image/png', '.pdf'] },
    { id: 'bills', label: 'Hospital bills and receipts', accept: ['image/jpeg', 'image/png', '.pdf'] },
    { id: 'prescription', label: 'Prescription or report', required: false, accept: ['image/jpeg', 'image/png', '.pdf'] },
  ],
  life: [
    { id: 'report', label: "Doctor's report", accept: ['image/jpeg', 'image/png', '.pdf'] },
    { id: 'id', label: 'Citizenship certificate', capture: 'environment', accept: ['image/jpeg', 'image/png', '.pdf'] },
  ],
};

/** File a claim (details, then documents) and follow every claim's status timeline. */
export function ClaimsPanel() {
  const { state, dispatch } = useInvest();
  const claimable = state.policies.filter((p) => p.status !== 'lapsed');
  const [policyId, setPolicyId] = useState(claimable.find((p) => p.kind === 'health')?.id ?? claimable[0]?.id ?? '');
  const policy = state.policies.find((p) => p.id === policyId);
  const group: 'health' | 'life' = policy?.kind === 'health' ? 'health' : 'life';
  const [reason, setReason] = useState(REASONS[group][0]!);
  const [eventDate, setEventDate] = useState('2026-10-24');
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<bigint | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [tried, setTried] = useState(false);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState<'details' | 'documents'>('details');

  const errors = {
    date: !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) ? 'Enter the date as YYYY-MM-DD.' : eventDate > SESSION_DATE ? 'The date cannot be in the future.' : undefined,
    amount: amount === null || amount <= 0n ? 'Enter the amount you are claiming.' : policy && amount > policy.sumAssured ? `More than the ${rs(policy.sumAssured)} the policy covers.` : undefined,
  };
  const missing = SLOTS[group].filter((s) => s.required !== false && !files[s.id]);
  const docErrors = tried && step === 'documents' ? Object.fromEntries(missing.map((s) => [s.id, 'This document is needed.'])) : undefined;

  const next = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (errors.date || errors.amount) return;
    setTried(false);
    setStep('documents');
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (missing.length) return;
    if (state.fail) {
      setFailed(true);
      dispatch({ type: 'notice', text: 'The claim could not be sent. Your details are kept; try again.' });
      return;
    }
    dispatch({ type: 'claim', policyId, reason, eventDate, amount: amount!, documents: SLOTS[group].filter((s) => files[s.id]).map((s) => s.label) });
    setFailed(false);
    setTried(false);
    setStep('details');
    setAmount(null);
    setAmountText('');
    setFiles({});
  };

  return (
    <div className="app-grid is-split">
      <div className="app-stack">
        {state.claims.length === 0 ? (
          <EmptyState title="No claims" body="Claims you file appear here with each step the insurer takes." headingLevel={3} bare testId="ii-claims-empty" />
        ) : (
          <ul className="ii-list" aria-label="Claims" data-testid="ii-claims">
            {state.claims.map((c) => {
              const p = state.policies.find((x) => x.id === c.policyId);
              return (
                <li key={c.id}>
                  <Card
                    title={c.reason}
                    description={`${c.id} · ${p?.plan ?? ''} · ${dateText(c.eventDate)}`}
                    headingLevel={3}
                    action={<StatusPill tone={c.stage === 'settled' ? 'gain' : c.stage === 'rejected' ? 'loss' : 'info'} size="sm">{c.stage === 'settled' ? 'Paid' : c.stage === 'rejected' ? 'Rejected' : 'In progress'}</StatusPill>}
                    testId={`ii-claim-${c.id}`}
                  >
                    <div className="app-stack">
                      <p className="app-small">
                        Claimed <MoneyDisplay value={c.amount} preset={npr} />
                        {c.approved !== undefined && (c.stage === 'approved' || c.stage === 'settled') ? (
                          <>
                            {' '}· approved <MoneyDisplay value={c.approved} preset={npr} />
                          </>
                        ) : null}
                        {' '}· {c.documents.length} document{c.documents.length === 1 ? '' : 's'}
                      </p>
                      <PaymentTimeline steps={claimSteps(c)} label={`Claim ${c.id} progress`} />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Card title={step === 'details' ? 'File a claim' : 'Add documents'} description={step === 'details' ? 'Step 1 of 2: what happened' : 'Step 2 of 2: photos or PDFs'} headingLevel={3} testId="ii-claim-form">
        {claimable.length === 0 ? (
          <p className="app-muted">You have no policy in force to claim on.</p>
        ) : step === 'details' ? (
          <form className="ii-form" noValidate onSubmit={next}>
            <Select
              label="Policy"
              labelPlacement="above"
              block
              value={policyId}
              onChange={(id) => {
                setPolicyId(id);
                const p = state.policies.find((x) => x.id === id);
                setReason(REASONS[p?.kind === 'health' ? 'health' : 'life'][0]!);
                setFiles({});
              }}
              options={claimable.map((p) => ({ value: p.id, label: p.plan }))}
              testId="ii-claim-policy"
            />
            <Select label="Reason" labelPlacement="above" block value={reason} onChange={setReason} options={REASONS[group].map((r) => ({ value: r, label: r }))} />
            <Field label="Date of the event" type="date" value={eventDate} max={SESSION_DATE} onChange={setEventDate} error={tried ? errors.date : undefined} testId="ii-claim-date" />
            <CurrencyInput
              label="Amount claimed"
              preset={npr}
              value={amountText}
              onValueChange={(c) => {
                setAmountText(c.value);
                setAmount(c.minorUnits);
              }}
              hint={policy ? `Covered up to ${rs(policy.sumAssured)}` : undefined}
              error={tried ? errors.amount : undefined}
              testId="ii-claim-amount"
            />
            <Button type="submit" testId="ii-claim-next">Continue</Button>
          </form>
        ) : (
          <form className="ii-form" noValidate onSubmit={submit}>
            <DocumentUpload slots={SLOTS[group]} value={files} onChange={setFiles} errors={docErrors} title="Documents" headingLevel={4} testId="ii-claim-docs" />
            {failed && <Note tone="error">The claim could not be sent (demo failure). Your details and documents are kept; try again.</Note>}
            <div className="ii-buttons">
              <Button type="submit" testId="ii-claim-submit">Submit claim for {amount ? rs(amount) : ''}</Button>
              <Button variant="ghost" onClick={() => setStep('details')}>Back</Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
