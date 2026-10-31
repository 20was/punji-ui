import { useState } from 'react';
import { MarketStatus, getMarketSession, nepseSchedule, type MarketSchedule } from '@punji/ui/market-status';
import { SegmentedControl } from '@punji/ui/controls';

// nepseSchedule is an EXAMPLE of NEPSE's hours, not authority, and has no holidays.
// Verify the hours against the exchange's current notice and supply the holidays yourself.
const schedule: MarketSchedule = {
  ...nepseSchedule,
  holidays: [{ date: '2025-11-18', name: 'Public holiday (example)' }],
};

const moments = {
  // Instants in UTC; Kathmandu is UTC+5:45.
  'Sun 10:45': '2025-11-16T05:00:00Z',
  'Sun 12:00': '2025-11-16T06:15:00Z',
  'Mon 16:00': '2025-11-17T10:15:00Z',
  'Tue holiday': '2025-11-18T06:15:00Z',
  'Fri 12:00': '2025-11-21T06:15:00Z',
} as const;
type Moment = keyof typeof moments;

export default function Example() {
  const [moment, setMoment] = useState<Moment>('Sun 10:45');
  const [halted, setHalted] = useState(false);
  const session = getMarketSession(new Date(moments[moment]), schedule, { halted });
  return (
    <div className="ex-stack">
      <SegmentedControl<Moment>
        label="Moment"
        prefix="session-moment"
        size="sm"
        value={moment}
        onChange={setMoment}
        options={(Object.keys(moments) as Moment[]).map((value) => ({ value, label: value }))}
      />
      <label className="ex-row">
        <input type="checkbox" checked={halted} onChange={(e) => setHalted(e.target.checked)} /> Exchange reports a halt
      </label>
      <MarketStatus session={session} market="NEPSE" />
      <pre className="ex-pre">
        {JSON.stringify({ state: session.state, label: session.label, localDate: session.localDate, localTime: session.localTime, next: session.next }, null, 2)}
      </pre>
    </div>
  );
}
