import { useState } from 'react';
import { MarketStatus, getMarketSession, nepseSchedule, type MarketSchedule } from '@punji/ui/market-status';
import { SegmentedControl } from '@punji/ui/controls';
import { Card } from '@punji/ui/card';
import { DataRow, DataRows } from '@punji/ui/rows';

// nepseSchedule is an EXAMPLE of NEPSE's hours, not authority, and has no holidays.
// Verify the hours against the exchange's current notice and supply the holidays yourself.
const schedule: MarketSchedule = {
  ...nepseSchedule,
  holidays: [{ date: '2025-11-18', name: 'Public holiday (example)' }],
};

// Instants in UTC; Kathmandu is UTC+5:45.
const moments = {
  'Sun 10:45': '2025-11-16T05:00:00Z',
  'Sun 12:00': '2025-11-16T06:15:00Z',
  'Mon 16:00': '2025-11-17T10:15:00Z',
  'Tue holiday': '2025-11-18T06:15:00Z',
} as const;
type Moment = keyof typeof moments;

export default function Example() {
  const [moment, setMoment] = useState<Moment>('Sun 10:45');
  const session = getMarketSession(new Date(moments[moment]), schedule);
  return (
    <Card title="Is NEPSE trading?" description="Pick a moment; the session is worked out in Kathmandu time" headingLevel={3}>
      <SegmentedControl<Moment>
        label="Moment"
        prefix="session-moment"
        size="sm"
        value={moment}
        onChange={setMoment}
        options={(Object.keys(moments) as Moment[]).map((value) => ({ value, label: value }))}
      />
      <DataRows label="Session">
        <DataRow label="Status" value={<MarketStatus session={session} market="NEPSE" />} />
        <DataRow label="Local time" value={`${session.localDate} ${session.localTime}`} />
        <DataRow label="Next change" value={session.next ? `${session.next.state} at ${session.next.at.toISOString().slice(11, 16)} UTC` : 'None within ten days'} />
      </DataRows>
    </Card>
  );
}
