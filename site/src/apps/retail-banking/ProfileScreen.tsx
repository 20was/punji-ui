import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { Checkbox } from '@punji/ui/checkbox';
import { DocumentUpload, type DocumentSlot } from '@punji/ui/document-upload';
import { FactList } from '@punji/ui/fact-list';
import { Field } from '@punji/ui/fields';
import { IdNumberInput } from '@punji/ui/id-number-input';
import { NepalAddressPicker, emptyNepalAddress, type NepalAddress } from '@punji/ui/nepal-address-picker';
import { OnboardingWizard } from '@punji/ui/onboarding-wizard';
import { Select } from '@punji/ui/select';
import { Note } from '@punji/ui/states';
import { StatusPill } from '@punji/ui/status-pill';
import { ScreenTitle } from '../shared/kit.tsx';
import { HOLDER, MOBILE_MASKED, useBank } from './store.ts';

const STEPS = [
  { id: 'personal', title: 'Personal details', description: 'As on your citizenship certificate' },
  { id: 'address', title: 'Address', description: 'Permanent address' },
  { id: 'documents', title: 'Documents', description: 'Photos of your citizenship and a selfie' },
  { id: 'review', title: 'Review and submit' },
];
const SLOTS: DocumentSlot[] = [
  { id: 'front', label: 'Citizenship, front', accept: ['image/jpeg', 'image/png', 'application/pdf'], maxSize: 5_000_000, capture: 'environment', required: true },
  { id: 'back', label: 'Citizenship, back', accept: ['image/jpeg', 'image/png', 'application/pdf'], maxSize: 5_000_000, capture: 'environment', required: true },
  { id: 'selfie', label: 'Selfie holding the certificate', hint: 'Face and certificate both clear', accept: ['image/jpeg', 'image/png'], maxSize: 5_000_000, capture: 'user', required: true },
];
const OCCUPATIONS = ['Salaried', 'Self-employed', 'Business owner', 'Student', 'Retired', 'Homemaker', 'Foreign employment'];

/** The KYC update: personal details with citizenship and PAN, the permanent address, documents, then review and submit. */
function KycWizard({ onDone }: { onDone: () => void }) {
  const { state, dispatch } = useBank();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(HOLDER);
  const [father, setFather] = useState('');
  const [occupation, setOccupation] = useState('Salaried');
  const [citizenship, setCitizenship] = useState({ text: '', valid: false });
  const [pan, setPan] = useState({ text: '', valid: false });
  const [address, setAddress] = useState<NepalAddress>(emptyNepalAddress);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);

  const check = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (name.trim().length < 3) e.name = 'Enter your full name.';
      if (father.trim().length < 3) e.father = "Enter your father's name, as on the certificate.";
      if (!citizenship.valid) e.citizenship = 'Enter your citizenship certificate number, for example 27-01-71-05432.';
      if (pan.text && !pan.valid) e.pan = 'A PAN has 9 digits.';
    }
    if (step === 1) {
      if (!address.province) e.province = 'Choose a province.';
      if (!address.district) e.district = 'Choose a district.';
      if (!address.localLevel) e.localLevel = 'Choose a municipality or rural municipality.';
      if (!address.ward) e.ward = 'Enter the ward number.';
    }
    if (step === 2) for (const s of SLOTS) if (s.required && !files[s.id]) e[s.id] = `Add ${s.label.toLowerCase()}.`;
    if (step === 3 && !consent) e.consent = 'Tick the box to confirm the details are true.';
    return e;
  };
  const next = () => {
    const e = check();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    if (step < STEPS.length - 1) return setStep(step + 1);
    if (state.offline) return setProblem('You are offline, so nothing was submitted. Your answers are kept; try again when you are back online.');
    dispatch({ type: 'kyc-submit' });
    onDone();
  };

  return (
    <OnboardingWizard steps={STEPS} current={step} onNext={next} onBack={() => setStep(step - 1)} onStepSelect={(i) => i < step && setStep(i)} headingLevel={3} labels={{ submit: 'Submit KYC' }} testId="rb-kyc">
      {step === 0 && (
        <div className="rb-form">
          <Field label="Full name" value={name} onChange={setName} autoComplete="name" error={errors.name} testId="rb-kyc-name" />
          <Field label="Father's name" value={father} onChange={setFather} error={errors.father} testId="rb-kyc-father" />
          <Select label="Occupation" labelPlacement="above" value={occupation} onChange={setOccupation} options={OCCUPATIONS.map((o) => ({ value: o, label: o }))} block />
          <IdNumberInput kind="citizenship" label="Citizenship certificate number" value={citizenship.text} onValueChange={(text, r) => setCitizenship({ text, valid: r.state === 'valid' })} error={errors.citizenship} testId="rb-kyc-citizenship" />
          <IdNumberInput kind="pan" label="PAN (optional)" value={pan.text} onValueChange={(text, r) => setPan({ text, valid: r.state === 'valid' })} hint="Needed for interest above Rs 10,000 a year" error={errors.pan} testId="rb-kyc-pan" />
        </div>
      )}
      {step === 1 && <NepalAddressPicker value={address} onChange={setAddress} errors={errors} labels={{ legend: 'Permanent address' }} testId="rb-kyc-address" />}
      {step === 2 && <DocumentUpload slots={SLOTS} value={files} onChange={setFiles} errors={errors} title="Documents" headingLevel={4} testId="rb-kyc-docs" />}
      {step === 3 && (
        <div className="app-stack">
          <FactList
            facts={[
              { label: 'Name', value: name },
              { label: "Father's name", value: father },
              { label: 'Occupation', value: occupation },
              { label: 'Citizenship no.', value: citizenship.text },
              { label: 'PAN', value: pan.text || 'Not given' },
              { label: 'Permanent address', value: [address.localLevel, address.ward && `ward ${address.ward}`, address.district, address.province].filter(Boolean).join(', ') },
              { label: 'Documents', value: `${Object.values(files).filter(Boolean).length} of ${SLOTS.length} added` },
            ]}
          />
          <Checkbox checked={consent} onChange={setConsent} testId="rb-kyc-consent">
            The details are true. I agree that Punji Bank may verify them with the issuing offices.
          </Checkbox>
          {errors.consent && (
            <p className="rb-error" role="alert">
              {errors.consent}
            </p>
          )}
          {problem && <Note tone="error">{problem}</Note>}
        </div>
      )}
    </OnboardingWizard>
  );
}

/** The customer's profile and KYC status, and the KYC update wizard. */
export default function ProfileScreen() {
  const { state } = useBank();
  const [editing, setEditing] = useState(false);
  const tone = state.kyc === 'verified' ? 'gain' : state.kyc === 'under-review' ? 'info' : 'warn';
  return (
    <div className="app-stack">
      <ScreenTitle>Profile and KYC</ScreenTitle>
      <div className="app-grid is-split">
        <div className="app-stack">
          {editing ? (
            <Card title="Update your KYC" description="About five minutes. Your answers stay on this page until you submit." headingLevel={3}>
              <KycWizard onDone={() => setEditing(false)} />
              <div className="rb-gap">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </Card>
          ) : (
            <Card
              title="KYC"
              headingLevel={3}
              action={<StatusPill tone={tone} size="sm" testId="rb-kyc-status">{state.kyc === 'verified' ? 'Verified' : state.kyc === 'under-review' ? 'In review' : 'Update due'}</StatusPill>}
            >
              <div className="app-stack">
                <p className="app-muted">
                  {state.kyc === 'verified'
                    ? 'Your details and documents are verified. Nothing to do.'
                    : state.kyc === 'under-review'
                      ? 'We are checking what you sent. This usually takes a few minutes in the demo, and a working day at a bank.'
                      : 'Nepal Rastra Bank asks banks to re-verify customers every few years. Until you do, some limits may be lowered.'}
                </p>
                {state.kyc === 'update-due' && (
                  <div>
                    <Button onClick={() => setEditing(true)} testId="rb-kyc-start">
                      Update KYC
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
        <Card title="Profile" headingLevel={3}>
          <FactList
            stack
            facts={[
              { label: 'Name', value: HOLDER },
              { label: 'Customer ID', value: 'CIF ··7731' },
              { label: 'Mobile', value: MOBILE_MASKED },
              { label: 'Email', value: 's•••@example.com' },
              { label: 'Branch', value: 'Pulchowk, Lalitpur' },
              { label: 'Customer since', value: '2079 Shrawan (2022)' },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
