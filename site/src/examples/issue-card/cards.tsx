import { Button } from '@punji/ui/button';
import { IssueCard } from '@punji/ui/issue-card';
import { issuesToday, shareIssues } from '../../sample.ts';

const [ipo, right, , fpo, , closed] = shareIssues;

export default function Example() {
  return (
    <div className="ex-grid">
      <IssueCard issue={ipo!} today={issuesToday} action={<Button size="sm">Apply</Button>} />
      <IssueCard issue={right!} today={issuesToday} action={<Button size="sm">Apply</Button>} />
      <IssueCard issue={fpo!} today={issuesToday} primaryCalendar="ad" />
      <IssueCard
        issue={closed!}
        today={issuesToday}
        language="ne"
        digits="deva"
        kindLabels={{ ipo: 'आईपीओ' }}
        statusLabels={{ closed: 'बन्द' }}
      />
    </div>
  );
}
