import { useState } from 'react';
import { AllotmentChecker, type AllotmentResult } from '@punji/ui/allotment-checker';
import { ApplyIssueForm, type ApplyIssueAccount } from '@punji/ui/apply-issue-form';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { IssueList } from '@punji/ui/issue-card';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Sheet } from '@punji/ui/overlay';
import { issueStatus, type ShareIssue } from '@punji/ui/share-issues';
import { StatusPill } from '@punji/ui/status-pill';
import { ScreenTitle } from '../shared/kit.tsx';
import { SESSION_DATE } from '../shared/sim.ts';
import { ISSUES, OWN_BOID, allotmentFor, npr, rs, useWealth, type Application } from './store.ts';

const ACCOUNTS: ApplyIssueAccount[] = [{ id: 'acc-1', bank: 'Himalayan Bank', accountNumber: '01920017004501', branch: 'Thamel', crn: 'HBL-77120931' }];
const SAVED = [
  { boid: OWN_BOID, name: 'You (Sita Sharma)' },
  { boid: '1301520000654321', name: 'Ram Sharma' },
  { boid: '1301090000077772', name: 'Gita Sharma' },
];

const STATUS_WORDS: Record<Application['status'], string> = { applied: 'Applied, money blocked', allotted: 'Allotted', 'not-allotted': 'Not allotted' };
const STATUS_TONE: Record<Application['status'], 'info' | 'gain' | undefined> = { applied: 'info', allotted: 'gain', 'not-allotted': undefined };

/**
 * The IPO and share-issue centre: issues open today, upcoming and closed; apply in two steps (kitta, account and CRN,
 * then the PIN) with the amount blocked in the bank; then check the allotment, which adds the shares to Holdings
 * and unblocks what was not used.
 */
export default function IssuesScreen() {
  const { state, dispatch } = useWealth();
  const [applying, setApplying] = useState<ShareIssue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const applied = (id: string) => state.applications.find((a) => a.issueId === id);
  const checkable = state.applications.map((a) => ({ value: a.issueId, label: ISSUES.find((i) => i.id === a.issueId)?.company ?? a.issueId }));

  const check = async ({ issueId, boids }: { issueId: string | null; boids: string[] }): Promise<AllotmentResult[]> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const issue = ISSUES.find((i) => i.id === issueId);
    if (!issue) throw new Error('Unknown issue');
    const closed = issueStatus(issue, SESSION_DATE) === 'closed';
    return boids.map((boid): AllotmentResult => {
      if (!closed) return { boid, outcome: 'pending', message: `Results come after the issue closes on ${issue.closeDate}.` };
      if (boid === OWN_BOID) {
        const app = applied(issue.id);
        if (!app) return { boid, outcome: 'not-applied' };
        const units = allotmentFor(issue.id, boid);
        dispatch({ type: 'result', issueId: issue.id, units });
        return units > 0n ? { boid, outcome: 'allotted', units, message: 'Added to your holdings.' } : { boid, outcome: 'not-allotted', message: `${rs(app.amount)} unblocked.` };
      }
      const units = allotmentFor(issue.id, boid);
      return units > 0n ? { boid, outcome: 'allotted', units } : { boid, outcome: 'not-allotted' };
    });
  };

  return (
    <div className="app-stack">
      <ScreenTitle aside={<span className="app-small app-muted">Savings available <MoneyDisplay value={state.bank} preset={npr} /></span>}>IPO centre</ScreenTitle>
      <IssueList
        issues={ISSUES}
        today={SESSION_DATE}
        label="Share issues"
        headingLevel={3}
        renderAction={(issue, status) => {
          const app = applied(issue.id);
          if (app) return <StatusPill tone={STATUS_TONE[app.status]} size="sm">{`${STATUS_WORDS[app.status]} · ${app.kitta} kitta`}</StatusPill>;
          if (status === 'open' || status === 'closing-today')
            return (
              <Button size="sm" onClick={() => { setError(null); setApplying(issue); }} testId={`wd-apply-${issue.id}`}>
                Apply
              </Button>
            );
          return null;
        }}
        testId="wd-issues"
      />

      <div className="app-grid is-halves">
        <Card title="Your applications" headingLevel={3} testId="wd-applications">
          {state.applications.length === 0 ? (
            <p className="app-muted">No applications yet.</p>
          ) : (
            <ul className="wd-apps">
              {state.applications.map((a) => {
                const issue = ISSUES.find((i) => i.id === a.issueId);
                return (
                  <li key={a.issueId}>
                    <span>
                      <strong>{issue?.company}</strong>
                      <span className="app-muted app-small">
                        {' '}
                        · {a.kitta} kitta · <MoneyDisplay value={a.amount} preset={npr} />
                      </span>
                    </span>
                    <StatusPill tone={STATUS_TONE[a.status]} size="sm">
                      {a.status === 'allotted' ? `Allotted ${a.units ?? 0n}` : STATUS_WORDS[a.status]}
                    </StatusPill>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card title="Check allotment" description="Your BOID and your family's; results are the registrar's (simulated)" headingLevel={3}>
          {checkable.length > 0 ? (
            <AllotmentChecker issues={checkable} savedAccounts={SAVED} onCheck={check} headingLevel={4} testId="wd-allot" />
          ) : (
            <p className="app-muted">Apply for an issue first.</p>
          )}
        </Card>
      </div>

      <Sheet open={applying !== null} title={applying ? `Apply: ${applying.company}` : 'Apply'} onClose={() => setApplying(null)} testId="wd-apply-sheet">
        {applying && (
          <ApplyIssueForm
            issue={applying}
            accounts={ACCOUNTS}
            headingLevel={3}
            error={error}
            verificationHint="Any four digits work in this demo."
            onCancel={() => setApplying(null)}
            onSubmit={async (application) => {
              await new Promise((resolve) => setTimeout(resolve, 400));
              if (application.amount > state.bank) {
                setError(`Not enough balance: ${rs(application.amount)} needed, ${rs(state.bank)} available.`);
                return;
              }
              dispatch({ type: 'apply', issue: applying, kitta: application.kitta, amount: application.amount });
              setApplying(null);
            }}
            testId="wd-apply"
          />
        )}
      </Sheet>
    </div>
  );
}
