import { Card } from '@punji/ui/card';
import { MarketStatus, type MarketState } from '@punji/ui/market-status';
import { DataRow, DataRows } from '@punji/ui/rows';

const day: { time: string; state: MarketState; detail?: string }[] = [
  { time: '10:30', state: 'pre-open' },
  { time: '11:00', state: 'open' },
  { time: '12:20', state: 'halted' },
  { time: '15:00', state: 'closed' },
  { time: 'Dashain', state: 'holiday', detail: 'Vijaya Dashami' },
];

// Each state has its own icon shape and word, so colour is never the only signal.
// A Nepali label comes from labels; size="sm" fits a table caption or a header.
export default function Example() {
  return (
    <Card title="NEPSE session" description="One trading day, state by state" headingLevel={3}>
      <DataRows label="Session states">
        {day.map((d) => (
          <DataRow key={d.time} label={d.time} value={<MarketStatus state={d.state} detail={d.detail} market="NEPSE" />} />
        ))}
        <DataRow label="Nepali label" value={<MarketStatus state="closed" labels={{ closed: 'बन्द' }} market="NEPSE" size="sm" />} />
      </DataRows>
    </Card>
  );
}
