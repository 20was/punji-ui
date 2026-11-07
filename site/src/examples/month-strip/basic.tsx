import { Card } from '@punji/ui/card';
import { MonthStrip, type MonthCell } from '@punji/ui/month-strip';

// The caller prints each figure with its sign, so the tint is never the only signal. A month held in cash is flat.
const months: [string, string, number][] = [['Jan', '+2.10%', 1], ['Feb', '−0.80%', -1], ['Mar', '+1.64%', 1], ['Apr', '0.00%', 0], ['May', '+0.35%', 1], ['Jun', '−2.41%', -1]];
const cells: MonthCell[] = months.map(([label, text, sign]) => ({
  key: label,
  label,
  text,
  tone: sign > 0 ? 'gain' : sign < 0 ? 'loss' : 'flat',
  aria: `${label} 2026: ${text}${sign === 0 ? ', held in cash' : ''}`,
}));

export default function Example() {
  return (
    <Card title="Monthly returns" description="2026 to date" headingLevel={3}>
      <MonthStrip label="Months" cells={cells} head={<><b>3 of 6</b> months rose</>} foot="Best Jan · worst Jun" />
    </Card>
  );
}
