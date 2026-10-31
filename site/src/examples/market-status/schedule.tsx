import { MarketStatus, getMarketSession, type MarketSchedule } from '@punji/ui/market-status';

// Any exchange: an IANA time zone, session windows and the holidays you announce.
// A window includes its start and excludes its end. Daylight saving is the platform's (Intl).
const nyse: MarketSchedule = {
  timeZone: 'America/New_York',
  sessions: [
    { state: 'pre-open', days: [1, 2, 3, 4, 5], start: '04:00', end: '09:30' },
    { state: 'open', days: [1, 2, 3, 4, 5], start: '09:30', end: '16:00', label: 'Regular hours' },
  ],
  holidays: [{ date: '2025-11-27', name: 'Thanksgiving' }],
};

const instants = [
  ['Wed 14:30 UTC', '2025-11-19T14:30:00Z'],
  ['Thu (holiday)', '2025-11-27T15:00:00Z'],
  ['Sat', '2025-11-22T15:00:00Z'],
] as const;

export default function Example() {
  return (
    <div className="ex-stack">
      {instants.map(([name, iso]) => {
        const session = getMarketSession(new Date(iso), nyse);
        return (
          <div key={name} className="ex-row">
            <strong>{name}</strong>
            <MarketStatus session={session} market="NYSE" />
            <span>{session.next ? `next: ${session.next.state} at ${session.next.at.toISOString()}` : 'no change within ten days'}</span>
          </div>
        );
      })}
    </div>
  );
}
