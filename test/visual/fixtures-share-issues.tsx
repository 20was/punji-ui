import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AllotmentChecker, ApplyIssueForm, BoidInput, Button, CorporateActionTimeline, DematAccountCard, EdisConfirmation, IssueCard, IssueList,
} from '@punji/ui';
import {
  applyAccounts, corporateEvents, dematAccounts, edisTransfers, fakeAllotment, issuesToday, savedBoids, shareIssues,
} from '../../fixtures/share-issues-data.ts';

// Share issues and corporate actions. Data comes from fixtures/share-issues-data.ts, the same file the docs site reads (one source).
// Invented companies, BOIDs and accounts; `issuesToday` fixes every status and countdown.
const noop = () => undefined;
const Block = ({ title, children }: { title: string; children: ReactNode }) => <section aria-label={title} style={{ display: 'grid', gap: 8 }}><h2 className="vr-h">{title}</h2>{children}</section>;
const Stack = ({ children }: { children: ReactNode }) => <div style={{ display: 'grid', gap: 24 }}>{children}</div>;
const grid = { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' } as const;

function IssueCardFixture() {
  return <div style={grid}>
    <IssueCard issue={shareIssues[0]!} today={issuesToday} action={<Button size="sm">Apply</Button>} testId="vr-issue-open" />
    <IssueCard issue={shareIssues[1]!} today={issuesToday} action={<Button size="sm">Apply</Button>} />
    <IssueCard issue={shareIssues[3]!} today={issuesToday} primaryCalendar="ad" />
    <IssueCard issue={shareIssues[5]!} today={issuesToday} language="ne" digits="deva" />
  </div>;
}

function IssueListFixture() {
  return <IssueList issues={shareIssues} today={issuesToday} renderAction={(_, s) => (s === 'open' || s === 'closing-today' ? <Button size="sm">Apply</Button> : null)} testId="vr-issue-list" />;
}

function ApplyFixture({ errors }: { errors: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (errors) box.current?.querySelector<HTMLButtonElement>('[data-testid="vr-apply-continue"]')?.click();
  }, [errors]);
  return <div ref={box}>
    <ApplyIssueForm issue={shareIssues[0]!} accounts={applyAccounts} defaultKitta={errors ? '15' : undefined} defaultAccountId={errors ? undefined : 'acc-1'} onSubmit={noop} onCancel={noop} testId="vr-apply" />
  </div>;
}

function BoidFixture() {
  const [a, setA] = useState('1301370000012345');
  const [b, setB] = useState('13013700');
  const [c, setC] = useState('1301370000012345');
  return <Stack>
    <Block title="Complete: DP split in the hint"><BoidInput value={a} onValueChange={(x) => setA(x.value)} testId="vr-boid" /></Block>
    <Block title="Short, with an error from the page"><BoidInput value={b} onValueChange={(x) => setB(x.value)} error="A BOID has 16 digits; this has 8." /></Block>
    <Block title="Devanagari digits"><BoidInput label="बिओआइडी" value={c} onValueChange={(x) => setC(x.value)} digits="deva" /></Block>
  </Stack>;
}

function AllotmentFixture() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLButtonElement>('[data-testid="vr-allot-check"]')?.click();
  }, []);
  return <div ref={box}>
    <AllotmentChecker
      issues={[{ value: 'iss-ipo-open', label: 'Tamakoshi Valley Hydropower, ordinary shares' }]}
      savedAccounts={savedBoids}
      onCheck={async (r) => fakeAllotment(r.boids)}
      testId="vr-allot"
    />
  </div>;
}

function DematFixture() {
  return <div style={grid}>
    <DematAccountCard {...dematAccounts.active} today={issuesToday} actions={<Button variant="secondary" size="sm">Renew online access</Button>} testId="vr-demat" />
    <DematAccountCard {...dematAccounts.dormant} today={issuesToday} maskBoid />
    <DematAccountCard {...dematAccounts.active} loading />
    <DematAccountCard {...dematAccounts.active} error onRetry={noop} />
  </div>;
}

function TimelineFixture() {
  return <div style={grid}>
    <Block title="Bonus and AGM"><CorporateActionTimeline events={corporateEvents} today={issuesToday} testId="vr-ca" /></Block>
    <Block title="Nepali, Devanagari, AD first"><CorporateActionTimeline events={corporateEvents} today="2025-11-21" language="ne" digits="deva" primaryCalendar="ad" /></Block>
  </div>;
}

function EdisFixture() {
  return <EdisConfirmation transfers={edisTransfers} onConfirm={noop} testId="vr-edis" />;
}

export const shareIssuesRegistry: Record<string, () => ReactNode> = {
  'issue-card': IssueCardFixture,
  'issue-list': IssueListFixture,
  'apply-issue-form': () => <ApplyFixture errors={false} />,
  'apply-issue-form-errors': () => <ApplyFixture errors />,
  'boid-input': BoidFixture,
  'allotment-checker': AllotmentFixture,
  'demat-account-card': DematFixture,
  'corporate-action-timeline': TimelineFixture,
  'edis-confirmation': EdisFixture,
};
