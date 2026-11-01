import { useState, type ReactNode } from 'react';
import {
  AmortisationTable, Button, DepositCalculator, DocumentUpload, IdNumberInput, InsurancePremiumCard, InterestRateTable, LoanCalculator, NepalAddressPicker,
  OnboardingWizard, RemittanceTracker, amortise, type NepalAddress,
} from '@punji/ui';
import { nepalAddressData } from '@punji/ui/nepal-address-data';
import { depositRates, kycDocumentSlots, lendingRates, onboardingSteps, premiumBreakdown, remittanceSample } from '../../fixtures/lending-data.ts';

// Lending, deposit, KYC and remittance fixtures. Data comes from fixtures/lending-data.ts (shared with the docs site).
const noop = () => undefined;
const Block = ({ title, children }: { title: string; children: ReactNode }) => <section aria-label={title} style={{ display: 'grid', gap: 8 }}><h2 className="vr-h">{title}</h2>{children}</section>;
const Stack = ({ children }: { children: ReactNode }) => <div style={{ display: 'grid', gap: 24 }}>{children}</div>;

const schedule = amortise({ principal: 50_000_000n, ratePercent: '11.5', months: 24, rounding: 'half-up', prepayments: [{ period: 6, amount: 5_000_000n }] });

function LoanCalculatorFixture() {
  return <LoanCalculator title="Home loan calculator" defaultAmount="2500000" defaultRatePercent="11.5" defaultMonths={240} testId="vr-loan" />;
}

function AmortisationTableFixture() {
  return <Stack>
    <Block title="Monthly, with a prepayment"><AmortisationTable schedule={schedule} testId="vr-amort" /></Block>
    <Block title="Yearly, Devanagari"><AmortisationTable schedule={schedule} defaultView="yearly" digits="deva" money={{ currency: 'NPR', locale: 'ne-NP', display: 'none', numberingSystem: 'deva' }} /></Block>
  </Stack>;
}

function DepositCalculatorFixture() {
  return <Stack>
    <Block title="Fixed deposit"><DepositCalculator defaultAmount="500000" defaultRatePercent="8.5" defaultMonths={24} testId="vr-deposit" /></Block>
    <Block title="Recurring deposit, empty"><DepositCalculator defaultKind="recurring" /></Block>
  </Stack>;
}

function InterestRateTableFixture() {
  return <Stack>
    <Block title="Deposit rates, AD"><InterestRateTable caption="Deposit rates" description="Annual rates for individuals" rates={depositRates} testId="vr-rates" /></Block>
    <Block title="Lending rates, BS in Nepali"><InterestRateTable caption="कर्जाको ब्याजदर" rates={lendingRates} calendar="bs" language="ne" digits="deva" /></Block>
  </Stack>;
}

function KycFieldsFixture() {
  const [address, setAddress] = useState<NepalAddress>({ province: 'Bagmati', district: 'Lalitpur', localLevel: 'Godawari', ward: '5' });
  const [pan, setPan] = useState('301234567');
  const [citizenship, setCitizenship] = useState('27-01-71-02345');
  return <Stack>
    <NepalAddressPicker value={address} onChange={setAddress} data={nepalAddressData} testId="vr-addr" />
    <Block title="Nepali names"><NepalAddressPicker value={address} onChange={setAddress} data={nepalAddressData} language="ne" digits="deva" hideWard /></Block>
    <Block title="Identity numbers">
      <IdNumberInput kind="pan" label="PAN" value={pan} onValueChange={setPan} testId="vr-pan" />
      <IdNumberInput kind="citizenship" label="Citizenship certificate number" value={citizenship} onValueChange={setCitizenship} digits="deva" />
      <IdNumberInput kind="pan" label="PAN (with a server error)" value="301234567" onValueChange={noop} error="This PAN is already linked to another account." />
    </Block>
  </Stack>;
}

function DocumentUploadFixture() {
  const [value, setValue] = useState<Record<string, File | null>>(() => ({ 'citizenship-back': new File(['x'.repeat(2048)], 'citizenship-back.pdf', { type: 'application/pdf' }) }));
  return <DocumentUpload title="Upload your documents" slots={kycDocumentSlots} value={value} onChange={setValue} errors={{ photo: 'The photo is blurred. Take it again in good light.' }} testId="vr-docs" />;
}

function OnboardingWizardFixture() {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState<NepalAddress>({ province: 'Koshi', district: 'Jhapa', localLevel: '', ward: '' });
  return <OnboardingWizard steps={onboardingSteps} current={step} onNext={() => setStep((s) => Math.min(s + 1, 3))} onBack={() => setStep((s) => s - 1)} onStepSelect={setStep} testId="vr-wizard">
    <NepalAddressPicker value={address} onChange={setAddress} data={nepalAddressData} />
  </OnboardingWizard>;
}

// The lookup resolves at once with the shared sample, so the result is on screen for the capture.
const lookup = () => Promise.resolve(remittanceSample);
function RemittanceFixture() {
  return <Stack>
    <Block title="Found"><RemittanceTracker onLookup={lookup} defaultControlNumber="1234567890125678" lookupOnMount testId="vr-remit" /></Block>
    <Block title="Empty"><RemittanceTracker onLookup={lookup} /></Block>
  </Stack>;
}

function InsurancePremiumFixture() {
  return <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
    <InsurancePremiumCard plan="Endowment Plus" insurer="Example Life Insurance" status="active" frequency="yearly" breakdown={premiumBreakdown} nextDueDate="2025-12-15"
      sumAssured={1_000_000_00n} termYears={20} policyNumber="EL-2019-004512" actions={<Button size="sm">Pay premium</Button>} testId="vr-premium" />
    <InsurancePremiumCard plan="Term Life" insurer="Example Life Insurance" status="grace" frequency="monthly" premium={185_000n} nextDueDate="2025-11-20" sumAssured={2_500_000_00n} termYears={25} />
    <InsurancePremiumCard plan="Motor comprehensive" insurer="Example General Insurance" status="lapsed" frequency="single" premium={null} language="ne" digits="deva" />
  </div>;
}

export const lendingRegistry: Record<string, () => ReactNode> = {
  'loan-calculator': LoanCalculatorFixture,
  'amortisation-table': AmortisationTableFixture,
  'deposit-calculator': DepositCalculatorFixture,
  'interest-rate-table': InterestRateTableFixture,
  'kyc-fields': KycFieldsFixture,
  'document-upload': DocumentUploadFixture,
  'onboarding-wizard': OnboardingWizardFixture,
  'remittance-tracker': RemittanceFixture,
  'insurance-premium-card': InsurancePremiumFixture,
};
