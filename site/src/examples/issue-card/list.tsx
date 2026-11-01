import { Button } from '@punji/ui/button';
import { IssueList } from '@punji/ui/issue-card';
import { issuesToday, shareIssues } from '../../sample.ts';

// `today` comes from your server's business day, so every status and countdown matches the server.
export default function Example() {
  return (
    <IssueList
      issues={shareIssues}
      today={issuesToday}
      renderAction={(issue, status) =>
        status === 'open' || status === 'closing-today' ? <Button size="sm">Apply for {issue.symbol ?? 'units'}</Button> : null
      }
    />
  );
}
