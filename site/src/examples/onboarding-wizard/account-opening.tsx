import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { DocumentUpload } from '@punji/ui/document-upload';
import { Field } from '@punji/ui/fields';
import { IdNumberInput } from '@punji/ui/id-number-input';
import { NepalAddressPicker, emptyNepalAddress, type NepalAddress } from '@punji/ui/nepal-address-picker';
import { OnboardingWizard } from '@punji/ui/onboarding-wizard';
import { kycDocumentSlots, onboardingSteps } from '../../sample.ts';

// A KYC flow composed from the package: the wizard holds no data and validates nothing; your page does, then the server.
export default function Example() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [citizenship, setCitizenship] = useState('');
  const [address, setAddress] = useState<NepalAddress>(emptyNepalAddress);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [done, setDone] = useState(false);
  const next = () => {
    if (step === 0 && name.trim() === '') { setNameError('Enter your full name.'); return; }
    if (step === onboardingSteps.length - 1) { setDone(true); return; }
    setStep(step + 1);
  };
  if (done) return <p role="status">Submitted for review. <Button variant="ghost" size="sm" onClick={() => { setDone(false); setStep(0); }}>Start again</Button></p>;
  return (
    <OnboardingWizard steps={onboardingSteps} current={step} onNext={next} onBack={() => setStep(step - 1)} onStepSelect={setStep}>
      {step === 0 && (
        <>
          <Field label="Full name" value={name} onChange={(v) => { setName(v); setNameError(undefined); }} error={nameError} autoComplete="name" />
          <IdNumberInput kind="citizenship" label="Citizenship certificate number" value={citizenship} onValueChange={(text) => setCitizenship(text)} />
        </>
      )}
      {step === 1 && <NepalAddressPicker value={address} onChange={setAddress} labels={{ legend: 'Permanent address' }} />}
      {step === 2 && <DocumentUpload slots={kycDocumentSlots} value={files} onChange={setFiles} />}
      {step === 3 && <p>{name || 'No name'} · {address.localLevel || 'No address'} · {Object.values(files).filter(Boolean).length} documents</p>}
    </OnboardingWizard>
  );
}
