import { IssueCard } from '@punji/ui/issue-card';
import { shareIssues } from '../../sample.ts';

// BS 2084 Baisakh is past the last month the Nepal calendar committee has published, so its BS dates are marked.
const issue = { ...shareIssues[1]!, openDate: '2027-04-14', closeDate: '2027-04-30' };

export default function Example() {
  return <IssueCard issue={issue} today="2027-04-12" />;
}
