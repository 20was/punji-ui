import { useMemo, useState } from 'react';
import { Card } from '@punji/ui/card';
import { ChipRow, SegmentedControl } from '@punji/ui/controls';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { IssueList } from '@punji/ui/issue-card';
import { formatBSDate, gregorianToBS } from '@punji/ui/nepal/calendar';
import { ScreenTitle } from '../shared/kit.tsx';
import { SESSION_DATE } from '../shared/sim.ts';
import { ISSUES, allEvents, type ListedEvent } from './market.ts';
import { usePortal } from './store.ts';

type Tab = 'issues' | 'book-close' | 'agm';
type When = 'upcoming' | 'past';
const TABS: { value: Tab; label: string }[] = [
  { value: 'issues', label: 'IPO, FPO and rights' },
  { value: 'book-close', label: 'Book closures' },
  { value: 'agm', label: 'AGMs' },
];
const bs = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  return formatBSDate(gregorianToBS({ year, month, day }));
};
const ad = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const daysFrom = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${SESSION_DATE}T00:00:00Z`)) / 86_400_000);

/** Share issues, book closures and AGMs for every listed company, from the same events the company pages show. */
export default function CalendarsScreen() {
  const { open } = usePortal();
  const [tab, setTab] = useState<Tab>('issues');
  const [when, setWhen] = useState<When>('upcoming');
  const events = useMemo(() => {
    const list = allEvents().filter((e) => e.kind === tab && (when === 'upcoming' ? e.date >= SESSION_DATE : e.date < SESSION_DATE && daysFrom(e.date) >= -30));
    return when === 'past' ? list.toReversed() : list;
  }, [tab, when]);
  const columns: FinancialColumn<ListedEvent>[] = [
    {
      key: 'symbol',
      label: 'Company',
      rowHeader: true,
      render: (e) => (
        <button type="button" className="app-sym" onClick={() => open(e.symbol)}>
          <strong>{e.symbol}</strong>
          <span>{e.company}</span>
        </button>
      ),
    },
    { key: 'date', label: 'Date (BS)', render: (e) => <span>{bs(e.date)}<span className="mp-sub">{ad(e.date)}</span></span> },
    { key: 'in', label: when === 'upcoming' ? 'In' : 'Ago', num: true, render: (e) => { const d = Math.abs(daysFrom(e.date)); return d === 0 ? 'Today' : `${d} day${d === 1 ? '' : 's'}`; } },
    { key: 'detail', label: 'Detail', wide: true, render: (e) => e.detail ?? e.label ?? '' },
  ];
  const noun = tab === 'agm' ? 'AGM' : 'book closure';

  return (
    <div className="app-stack">
      <ScreenTitle>Calendars</ScreenTitle>
      <ChipRow label="Calendar" prefix="mp-cal" value={tab} onChange={setTab} options={TABS} />
      {tab === 'issues' ? (
        <IssueList issues={ISSUES} today={SESSION_DATE} label="Share issues" headingLevel={3} emptyBody="No issue is open or announced." testId="mp-issues" />
      ) : (
        <Card
          title={tab === 'agm' ? 'Annual general meetings' : 'Book closures'}
          description={tab === 'agm' ? 'Where shareholders approve the dividend' : 'Hold the shares at the end of the day before to be entitled'}
          headingLevel={3}
          flush
          action={<SegmentedControl<When> label="When" prefix="mp-when" size="sm" value={when} onChange={setWhen} options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Last 30 days' }]} />}
        >
          <FinancialTable
            caption={`${when === 'upcoming' ? 'Upcoming' : 'Recent'} ${noun}s`}
            columns={columns}
            rows={events}
            rowKey={(e) => e.id}
            emptyTitle={`No ${noun}s ${when === 'upcoming' ? 'announced' : 'in the last 30 days'}`}
            emptyBody="Companies announce them after the board meeting; check again later."
          />
        </Card>
      )}
    </div>
  );
}
