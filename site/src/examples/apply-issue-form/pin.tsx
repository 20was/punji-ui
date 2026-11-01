import { useState } from 'react';
import { ApplyIssueForm, type ApplyIssueSubmission } from '@punji/ui/apply-issue-form';
import { InlineState } from '@punji/ui/inline-state';
import { applyAccounts, shareIssues } from '../../sample.ts';

// onSubmit receives bigint kitta and amount. Send it to your server; never store or log the PIN.
export default function Example() {
  const [sent, setSent] = useState<ApplyIssueSubmission | null>(null);
  if (sent) {
    return (
      <InlineState
        icon="check"
        title="Application sent"
        body={`${sent.kitta.toString()} units; the amount is blocked in your bank account until allotment.`}
      />
    );
  }
  return <ApplyIssueForm issue={shareIssues[0]!} accounts={applyAccounts} onSubmit={setSent} onCancel={() => undefined} />;
}
