import { useState } from 'react';
import { ApplyIssueForm } from '@punji/ui/apply-issue-form';
import { applyAccounts, shareIssues } from '../../sample.ts';

// A one-time code instead of a PIN. A rejected promise leaves the form as it was; say why through `error`.
export default function Example() {
  const [error, setError] = useState<string | null>(null);
  return (
    <ApplyIssueForm
      issue={shareIssues[2]!}
      accounts={applyAccounts.slice(0, 1)}
      verification="otp"
      verificationHint="Sent to 98XXXXXX12. It expires in 5 minutes."
      onResend={() => setError(null)}
      error={error}
      onSubmit={async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));
        setError('That code has expired. Send a new code and try again.');
      }}
    />
  );
}
