// Invented sample data for the lending, deposit, KYC and remittance components. Shared by the docs site, the visual
// fixtures and the tests (one source). Rates, names and numbers are illustrative only: no real bank's rates.
import type { DocumentSlot } from '../src/document-upload/DocumentUpload.tsx';
import type { InsurancePremiumCardProps } from '../src/insurance-premium-card/InsurancePremiumCard.tsx';
import type { InterestRateRow } from '../src/interest-rate-table/InterestRateTable.tsx';
import type { WizardStep } from '../src/onboarding-wizard/OnboardingWizard.tsx';
import type { RemittanceDetails } from '../src/remittance-tracker/RemittanceTracker.tsx';

type PremiumLine = NonNullable<InsurancePremiumCardProps['breakdown']>[number];

export const depositRates: InterestRateRow[] = [
  { id: 'sv-regular', group: 'Savings', product: 'Regular savings', ratePercent: '3.25', previousRatePercent: '3.50', effectiveFrom: '2025-07-17' },
  { id: 'sv-women', group: 'Savings', product: 'Women savings', ratePercent: '4.25', previousRatePercent: '4.25', effectiveFrom: '2025-07-17', note: 'Minimum balance NPR 1,000' },
  { id: 'sv-senior', group: 'Savings', product: 'Senior citizen savings', ratePercent: '4.75', effectiveFrom: '2025-07-17', note: 'Account holders 60 and over' },
  { id: 'fd-3', group: 'Fixed deposit (individual)', product: '3 months', ratePercent: '4.5', previousRatePercent: '5', effectiveFrom: '2025-07-17' },
  { id: 'fd-12', group: 'Fixed deposit (individual)', product: '1 year', ratePercent: '5.75', previousRatePercent: '5.5', effectiveFrom: '2025-07-17' },
  { id: 'fd-24', group: 'Fixed deposit (individual)', product: '2 years and above', ratePercent: '6', previousRatePercent: '6', effectiveFrom: '2025-07-17' },
];

export const lendingRates: InterestRateRow[] = [
  { id: 'home', product: 'Home loan', ratePercent: '8.49', previousRatePercent: '8.99', effectiveFrom: '2025-08-01', note: 'Base rate + 2.5' },
  { id: 'auto', product: 'Auto loan', ratePercent: '9.75', previousRatePercent: '9.75', effectiveFrom: '2025-08-01' },
  { id: 'edu', product: 'Education loan', ratePercent: '9.25', previousRatePercent: '9.5', effectiveFrom: '2025-08-01' },
  { id: 'sme', product: 'Small business loan', ratePercent: '10.5', effectiveFrom: '2025-08-01' },
];

export const remittanceSample: RemittanceDetails = {
  sender: 'Ram Bahadur Thapa',
  origin: 'Doha, Qatar',
  receiver: 'Sita Thapa',
  sentAmount: 150_000n,
  sentCurrency: 'QAR',
  payoutAmount: 5_493_000n,
  rate: '1 QAR = 36.62 NPR',
  payoutMethod: 'cash',
  payoutLocation: 'Agent: Bhairahawa Main Road',
  steps: [
    { id: 'sent', label: 'Sent by the sender', state: 'complete', timestamp: '2025-11-10T06:12:00Z' },
    { id: 'checked', label: 'Compliance checks', state: 'complete', timestamp: '2025-11-10T06:20:00Z' },
    { id: 'ready', label: 'Ready to collect', state: 'current', timestamp: '2025-11-10T06:21:00Z', detail: 'Bring your citizenship certificate and the control number.' },
    { id: 'paid', label: 'Paid out', state: 'upcoming' },
  ],
};

export const kycDocumentSlots: DocumentSlot[] = [
  { id: 'citizenship-front', label: 'Citizenship certificate, front', hint: 'All four corners visible, no glare', capture: 'environment' },
  { id: 'citizenship-back', label: 'Citizenship certificate, back', capture: 'environment' },
  { id: 'photo', label: 'Passport-size photo', accept: ['image/jpeg', 'image/png'], maxSize: 2 * 1024 * 1024, capture: 'user', hint: 'Plain background, face clearly visible' },
  { id: 'signature', label: 'Signature', accept: ['image/jpeg', 'image/png'], maxSize: 1024 * 1024, required: false },
];

export const onboardingSteps: WizardStep[] = [
  { id: 'personal', title: 'Personal details', description: 'As written on your citizenship certificate.' },
  { id: 'address', title: 'Address', description: 'Your permanent address.' },
  { id: 'documents', title: 'Documents' },
  { id: 'review', title: 'Review and submit' },
];

export const premiumBreakdown: PremiumLine[] = [
  { id: 'base', label: 'Base premium', amount: 2_250_000n },
  { id: 'adb', label: 'Accidental death benefit rider', amount: 150_000n },
  { id: 'pwb', label: 'Premium waiver rider', amount: 60_000n },
];
