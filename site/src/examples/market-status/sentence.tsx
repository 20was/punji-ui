import { Card } from '@punji/ui/card';
import { MarketStatus, getMarketSession, marketSessionSentence, nepseSchedule, type MarketSchedule } from '@punji/ui/market-status';
import { DataRow, DataRows } from '@punji/ui/rows';

// nepseSchedule is an EXAMPLE of NEPSE's hours, not authority: supply the holidays from the exchange's notice.
const schedule: MarketSchedule = { ...nepseSchedule, holidays: [{ date: '2026-10-20', name: 'Dashain' }] };

// Instants in UTC; Kathmandu is UTC+5:45.
const moments = [
  { label: 'Sunday 10:45', at: '2026-10-18T05:00:00Z', lastCloseDate: '2026-10-15' },
  { label: 'Sunday 12:00', at: '2026-10-18T06:15:00Z', lastCloseDate: '2026-10-15' },
  { label: 'Friday', at: '2026-10-16T08:00:00Z', lastCloseDate: '2026-10-15' },
  { label: 'Tuesday (holiday)', at: '2026-10-20T06:00:00Z', lastCloseDate: '2026-10-19' },
];

export default function Example() {
  return (
    <Card title="The session in one line" description="marketSessionSentence from getMarketSession" headingLevel={3}>
      <DataRows label="Session sentences">
        {moments.map((m) => {
          const session = getMarketSession(new Date(m.at), schedule);
          return <DataRow key={m.label} label={m.label} value={<><MarketStatus session={session} market="NEPSE" /> {marketSessionSentence(session, { schedule, lastCloseDate: m.lastCloseDate })}</>} />;
        })}
      </DataRows>
    </Card>
  );
}
