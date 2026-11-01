// Illustrative share-issue data (NPR, paisa). Invented for tests, the docs site and the visual gate (one source).
// Company names, BOIDs, CRNs and account numbers are made up; no issue here is real and none is advice.
import type { AllotmentResult, SavedBoid } from '../src/allotment-checker/AllotmentChecker.tsx';
import type { ApplyIssueAccount } from '../src/apply-issue-form/ApplyIssueForm.tsx';
import type { EdisTransfer } from '../src/edis-confirmation/EdisConfirmation.tsx';
import type { CorporateEvent, CostAction } from '../src/share-issues/corporate-actions.ts';
import type { ShareIssue } from '../src/share-issues/issues.ts';

/** The business day every example is drawn on (28 Kartik 2082 BS). */
export const issuesToday = '2025-11-14';

export const shareIssues: ShareIssue[] = [
  { id: 'iss-ipo-open', company: 'Tamakoshi Valley Hydropower', symbol: 'TVHL', kind: 'ipo', shareGroup: 'Ordinary shares', openDate: '2025-11-11', closeDate: '2025-11-17', units: 1_500_000n, pricePerUnit: 10_000n, minKitta: 10n, maxKitta: 1_000n, kittaMultiple: 10n, issueManager: 'Himal Capital' },
  { id: 'iss-right-today', company: 'Annapurna Finance', symbol: 'ANFL', kind: 'right', shareGroup: '1:0.5 right to holders', openDate: '2025-10-31', closeDate: '2025-11-14', units: 482_500n, pricePerUnit: 10_000n, minKitta: 1n, maxKitta: 4_825n, kittaMultiple: 1n, issueManager: 'Gandaki Merchant Bank' },
  { id: 'iss-mf-open', company: 'Sagarmatha Growth Fund', kind: 'mutual-fund', shareGroup: 'Closed-end units', openDate: '2025-11-09', closeDate: '2025-11-20', units: 100_000_000n, pricePerUnit: 1_000n, minKitta: 100n, maxKitta: 100_000n, kittaMultiple: 10n },
  { id: 'iss-fpo-up', company: 'Lumbini Cement Industries', symbol: 'LCIL', kind: 'fpo', shareGroup: 'Ordinary shares', openDate: '2025-11-20', closeDate: '2025-11-24', units: 2_000_000n, pricePerUnit: 45_000n, minKitta: 10n, maxKitta: 5_000n, kittaMultiple: 10n, issueManager: 'Himal Capital' },
  { id: 'iss-deb-up', company: 'Koshi Bank 9% Debenture 2090', kind: 'debenture', openDate: '2025-11-25', closeDate: '2025-12-02', units: 300_000n, pricePerUnit: 100_000n, minKitta: 25n, maxKitta: 50_000n, kittaMultiple: 1n },
  { id: 'iss-ipo-closed', company: 'Mechi Laghubitta', symbol: 'MLBS', kind: 'ipo', shareGroup: 'Local people', openDate: '2025-11-02', closeDate: '2025-11-07', units: 250_000n, pricePerUnit: 10_000n, minKitta: 10n, maxKitta: 500n, kittaMultiple: 10n },
];

export const applyAccounts: ApplyIssueAccount[] = [
  { id: 'acc-1', bank: 'Himalayan Bank', accountNumber: '01920017004501', branch: 'Thamel', crn: 'HBL-77120931' },
  { id: 'acc-2', bank: 'Machhapuchchhre Bank', accountNumber: '0200524003127', branch: 'Pokhara', crn: 'MBL-20251102' },
];

export const savedBoids: SavedBoid[] = [
  { boid: '1301370000012345', name: 'Sita Sharma' },
  { boid: '1301520000654320', name: 'Ram Sharma' },
  { boid: '1301090000077771', name: 'Gita Sharma' },
];

/** A deterministic stand-in for the registrar: odd last digit allotted 10 units, even not allotted, ...0 no application. */
export function fakeAllotment(boids: readonly string[]): AllotmentResult[] {
  return boids.map((boid) => {
    const last = Number(boid.at(-1));
    if (last === 0) return { boid, outcome: 'not-applied' };
    return last % 2 === 1 ? { boid, outcome: 'allotted', units: 10n } : { boid, outcome: 'not-allotted' };
  });
}

export const dematAccounts = {
  active: { holder: 'Sita Sharma', boid: '1301370000012345', dpName: 'Himal Capital (DP 13700)', crn: 'HBL-77120931', bankName: 'Himalayan Bank', bankAccount: '01920017004501', status: 'active' as const, dematExpiry: '2026-07-16', onlineExpiry: '2025-12-01' },
  dormant: { holder: 'Ram Sharma', boid: '1301520000654320', dpName: 'Gandaki Merchant Bank (DP 15200)', status: 'dormant' as const, dematExpiry: '2025-11-02', onlineExpiry: '2025-11-02' },
};

export const corporateEvents: CorporateEvent[] = [
  { id: 'ev-ann', kind: 'announcement', date: '2025-10-20', label: 'Board proposes 10% bonus and 5% cash', detail: 'Subject to AGM approval.' },
  { id: 'ev-bc', kind: 'book-close', date: '2025-11-21', detail: 'Hold the shares at the end of 20 Nov to be entitled.' },
  { id: 'ev-agm', kind: 'agm', date: '2025-11-22', detail: 'Hotel Annapurna, Kathmandu, 11:00.' },
  { id: 'ev-credit', kind: 'distribution', date: '2025-12-20', label: 'Bonus units credited to demat' },
];

export const edisTransfers: EdisTransfer[] = [
  { id: 'ed-1', symbol: 'TVHL', units: 100n, contractNumber: '2025111403012345', broker: 'Broker 34', settlementDate: '2025-11-16' },
  { id: 'ed-2', symbol: 'ANFL', units: 50n, contractNumber: '2025111403012388', broker: 'Broker 34', settlementDate: '2025-11-16' },
];

/** 100 units bought at Rs 500 (fees in), then a 10% bonus and a 1:2 right at Rs 100, then a sale of 40. */
export const costHistory: CostAction[] = [
  { kind: 'buy', date: '2024-08-01', quantity: 100n, amount: 5_015_000n },
  { kind: 'bonus', date: '2025-01-10', entitlement: '10' },
  { kind: 'right', date: '2025-03-02', entitlement: { offered: 1n, held: 2n }, price: 10_000n },
  { kind: 'sell', date: '2025-09-15', quantity: 40n },
];
